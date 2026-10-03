// Build-time configuration. The ONLY accepted variables are:
//   VITE_SUPABASE_URL              https://<project-ref>.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY  sb_publishable_...  (or the legacy "anon public" JWT)
//   VITE_CUSTOMER_APP_URL          optional, merchant terminal only
// There are no hard-coded fallbacks: a misconfigured build shows a clear error screen
// instead of failing later with "Invalid API key" or 404s.
function cleanEnv(val: string | undefined): string {
  if (!val) return "";
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")) || (s.startsWith("`") && s.endsWith("`"))) {
    s = s.slice(1, -1).trim();
  }
  const md = /\[[^\]]*\]\(([^)]+)\)/.exec(s);
  if (md) {
    s = md[1]!.trim();
  }
  if ((s.startsWith("<") && s.endsWith(">")) || (s.startsWith("[") && s.endsWith("]"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const rawUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const rawKey = cleanEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const rawCustomerUrl = cleanEnv(import.meta.env.VITE_CUSTOMER_APP_URL).replace(/\/+$/, "");

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname));
  } catch {
    return false;
  }
}

/** Project ref from https://<ref>.supabase.co (null for custom domains / local). */
function refFromUrl(url: string): string | null {
  try {
    const m = /^([a-z0-9]{20})\.supabase\.co$/.exec(new URL(url).hostname);
    return m ? m[1]! : null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/** Copy-paste damage we refuse instead of "repairing" silently. */
function pasteProblem(value: string): string | null {
  if (/[\[\]()<>]/.test(value)) return "contains Markdown/link formatting such as [ ] ( ). Paste the plain value only";
  if (/["'`]/.test(value)) return "contains quote characters. Remove them";
  if (/\s/.test(value)) return "contains spaces or line breaks. Paste it on a single line";
  return null;
}

export const configErrors: string[] = [];

if (!rawUrl) {
  configErrors.push("VITE_SUPABASE_URL is not set.");
} else if (pasteProblem(rawUrl)) {
  configErrors.push(`VITE_SUPABASE_URL ${pasteProblem(rawUrl)}.`);
} else if (!isHttpUrl(rawUrl)) {
  configErrors.push("VITE_SUPABASE_URL must be https://<project-ref>.supabase.co.");
} else {
  const u = new URL(rawUrl);
  if (u.pathname !== "/" || u.search || u.hash) {
    configErrors.push(`VITE_SUPABASE_URL must be only https://${u.host} (no path, no trailing slash).`);
  }
  if (/supabase\.com$/.test(u.hostname)) {
    configErrors.push("VITE_SUPABASE_URL is the dashboard URL. Use the API URL https://<project-ref>.supabase.co.");
  }
}

if (!rawKey) {
  configErrors.push("VITE_SUPABASE_PUBLISHABLE_KEY is not set.");
} else if (pasteProblem(rawKey)) {
  configErrors.push(`VITE_SUPABASE_PUBLISHABLE_KEY ${pasteProblem(rawKey)}.`);
} else if (/^sb_secret_/.test(rawKey) || decodeJwtPayload(rawKey)?.role === "service_role") {
  configErrors.push("VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key. Use the publishable key, and rotate the secret now.");
} else if (!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(rawKey) && !decodeJwtPayload(rawKey)) {
  configErrors.push("VITE_SUPABASE_PUBLISHABLE_KEY doesn't look like a Supabase key (expected sb_publishable_…).");
} else {
  const urlRef = refFromUrl(rawUrl);
  const keyRef = decodeJwtPayload(rawKey)?.ref;
  if (urlRef && typeof keyRef === "string" && keyRef !== urlRef) {
    configErrors.push(`The key belongs to project "${keyRef}" but VITE_SUPABASE_URL points to "${urlRef}".`);
  }
}

export const env = {
  supabaseUrl: rawUrl.replace(/\/+$/, ""),
  supabaseKey: rawKey,
  projectRef: refFromUrl(rawUrl),
  keyKind: rawKey.startsWith("sb_publishable_") ? "publishable" : decodeJwtPayload(rawKey) ? "legacy anon" : "unknown",
  customerAppUrl: isHttpUrl(rawCustomerUrl) ? rawCustomerUrl : "",
  supabaseHost: (() => {
    try {
      return new URL(rawUrl).host;
    } catch {
      return "";
    }
  })(),
};
