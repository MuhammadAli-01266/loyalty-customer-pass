// Minimal Supabase stand-in for e2e: static app + /rest/v1 -> PostgREST + mock GoTrue.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SECRET = "e2e-jwt-secret-that-is-at-least-32-chars";
const DIST = process.argv[2];
const PORT = Number(process.argv[3] || 8080);
const OTP_CODE = "123456";
const USERS = {
  "sam@cafe.test": { id: "a0000000-0000-4000-8000-000000000002", password: "pass1234", name: "Sam Rivera" },
  "bob@bakery.test": { id: "b0000000-0000-4000-8000-000000000001", password: "pass1234", name: "Bob Baker" },
  "carl@mail.test": { id: "c0000000-0000-4000-8000-000000000001", password: "pass1234", name: "Carl Mendes" },
  "eve@mail.test": { id: "e0000000-0000-4000-8000-000000000001", password: "pass1234", name: "" },
};
const b64u = (b) => Buffer.from(b).toString("base64url");
function jwt(user) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ sub: user.id, role: "authenticated", aud: "authenticated", email: user.email, iat: now, exp: now + 3600 }));
  const s = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
function userObj(u) {
  return { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: { provider: "email" },
           user_metadata: { full_name: u.name }, created_at: "2026-01-01T00:00:00Z" };
}
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  return { access_token: jwt(u), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: `rt_${u.email}`, user: userObj(u) };
}
const send = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d)); });
const bearerUser = (req) => {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  try { const p = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()); return Object.entries(USERS).map(([email, u]) => ({ ...u, email })).find((u) => u.id === p.sub); } catch { return null; }
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/auth/v1/")) {
    const body = await readBody(req);
    if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "password") {
        const { email, password } = JSON.parse(body || "{}");
        const u = USERS[email];
        if (!u || u.password !== password) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
        return send(res, 200, session({ ...u, email }));
      }
      const { refresh_token } = JSON.parse(body || "{}");
      const email = String(refresh_token || "").replace(/^rt_/, "");
      return USERS[email] ? send(res, 200, session({ ...USERS[email], email })) : send(res, 400, { error: "invalid_grant" });
    }
    if (url.pathname === "/auth/v1/otp") {
      const { email } = JSON.parse(body || "{}");
      return USERS[email] ? send(res, 200, {}) : send(res, 422, { msg: "Signups not allowed in e2e" });
    }
    if (url.pathname === "/auth/v1/verify") {
      const { email, token } = JSON.parse(body || "{}");
      const u = USERS[email];
      if (!u || token !== OTP_CODE) return send(res, 403, { code: "otp_expired", msg: "Token has expired or is invalid" });
      return send(res, 200, session({ ...u, email }));
    }
    if (url.pathname === "/auth/v1/user") { const u = bearerUser(req); return u ? send(res, 200, userObj(u)) : send(res, 401, { msg: "unauthorized" }); }
    if (url.pathname === "/auth/v1/logout") return send(res, 204);
    if (url.pathname === "/auth/v1/settings") return send(res, 200, { external: { email: true }, disable_signup: true, mailer_autoconfirm: false });
    return send(res, 404, { msg: "not mocked" });
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
    const headers = { ...req.headers }; delete headers.host; delete headers["content-length"];
    if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(headers.authorization || "")) delete headers.authorization; // publishable key -> anon
    try {
      const r = await fetch(`http://127.0.0.1:3001${url.pathname.slice(8)}${url.search}`, { method: req.method, headers, body });
      const out = Buffer.from(await r.arrayBuffer());
      const h = {}; r.headers.forEach((v, k) => { if (!["content-encoding", "transfer-encoding", "content-length"].includes(k)) h[k] = v; });
      res.writeHead(r.status, h); return res.end(out);
    } catch (e) { return send(res, 502, { message: String(e) }); }
  }
  if (url.pathname.startsWith("/realtime/")) return send(res, 404, {});
  let file = path.join(DIST, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`gateway on :${PORT}`));
