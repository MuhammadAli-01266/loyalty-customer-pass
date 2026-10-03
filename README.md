# Loyalty Customer Pass (PWA)

The customer side of the multi-tenant loyalty stamp SaaS. Customers sign in with an emailed
one-time code and keep one wallet with a card per business. They show a **signed, rotating QR**
that merchant staff scan, and their card updates live when a stamp is given or a reward is redeemed.

**The app is read-only for loyalty data.** It can change only two things anywhere: the customer's
own display name, and their own QR secret (to reset the pass code). Stamps, cards and rewards are
written exclusively by staff RPCs on the merchant terminal. The database enforces this; the UI
simply never tries.

Vite + React 19 + Tailwind 4 · Supabase (Auth, RPC, Realtime) · offline-capable PWA.

## How it works

```
Phone (offline OK)                                  Merchant terminal / Postgres
──────────────────                                  ────────────────────────────
get_my_qr_credentials()  ── once, cached ──▶        per-customer secret (private schema)
token = LS1.<uid>.<step>.<HMAC(secret, uid.step)>   step = 30 s, server-clock corrected
QR (error-correction H) ─────── scan ──────────▶    scan_customer / issue_stamp_for_scan
                                                    (signature, ±60 s window, one use per store)
Realtime: stamp_events / rewards / loyalty_cards  ◀── filtered customer_id=eq.<uid>, RLS-checked
  → chime + confetti + banner, then refetch get_my_wallet()   (no client-side arithmetic)
```

- **Wallet:** `get_my_wallet()` (migration 0005) returns every card with business, program,
  available rewards, and the last 30 history entries, including store location names. It is scoped
  strictly to `auth.uid()`.
- **Invite links:** `/join/<slug>` comes from the merchant's "+ New Member" QR.
  `get_public_tenant(slug)` shows branding and program info before sign-in. The business then
  appears as a "Joined" card until the first stamp creates the real one.
- **Realtime:** one channel per customer. Events are deduplicated, the handlers read from refs
  (no stale closures), and every event triggers an authoritative refetch. The app also resyncs
  when the channel (re)subscribes, the tab regains focus, or the network returns.
- **Offline:**
  - The service worker caches only the app shell (Supabase traffic is never intercepted).
  - The last synced wallet and the QR secret are cached per user, so the pass and a valid QR
    still work with no signal.
  - Sign-out wipes that user's cached data.
- **Pass code reset:** rotates the secret on the server, so every screenshot or other device's
  code stops working immediately.
- **Polish:** the screen stays awake while the QR is shown (Wake Lock). There's an install prompt
  (Add to Home Screen), and a single shared `AudioContext` (the old app leaked one per chime).

### What changed from the prototype

| Prototype | Now |
|---|---|
| Hard-coded member switcher and free-text member ID (anyone could open any card) | Signed-in user's own cards only |
| Decorative pseudo-random "QR", `Math.random()` "TOTP", unsigned JSON payload | Real QR of an HMAC-signed token verified by the server |
| Fake fallback data (Elena Rostova, "2 cycles") on any error | Last *real* synced data, labelled offline |
| Unfiltered Realtime on whole tables, stale closures, phantom stamps on DELETE, banner cleared at 0 ms | Customer-filtered channel, ref handlers, deduplication, refetch, working banner |
| SQL schema, RLS matrix and simulator shipped to every customer | Removed (about 40 KB less JS, no attack map) |
| Apple/Google Wallet buttons that only `alert()` | Real PWA install and server resync |
| Hard-coded keys, `fetch` monkey-patch, AI Studio dependencies | Build-time env only; clean dependency set |

## Setup

1. **Database.** The customer app shares the merchant's Supabase project. Apply all migrations
   `0001`–`0005` (`supabase db push`). Make sure `stamp_events`, `loyalty_cards` and `rewards`
   are in the `supabase_realtime` publication.
2. **Auth (Supabase dashboard):**
   - Enable the **Email** provider.
   - In *Email Templates → Magic Link*, include `{{ .Token }}` so customers receive a code. The
     link in the same email also works.
   - Add your customer app URL to *URL Configuration* (Site URL and redirect URLs, including
     `https://<app>/join/*`).
   - Configure custom SMTP for production volume.
3. **Environment.** Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. `npm ci`, then `npm run dev` (port 3001). Web Crypto needs `localhost` or HTTPS.
5. In the merchant terminal, set `VITE_CUSTOMER_APP_URL` to this app's URL so "+ New Member"
   shows the join QR.

## Deploy (Vercel)

`vercel.json` sets:

- `npm ci`, build to `dist`
- an SPA rewrite (so `/join/<slug>` deep links work)
- `no-cache` for `sw.js` and immutable caching for hashed assets
- a CSP limited to `*.supabase.co`, `camera=()` and `frame-ancestors 'none'`

Set the two `VITE_*` variables for Production and Preview.

Bundle: about 130 KB gzipped for the shell, and 24 KB gzipped for the pass, loaded after sign-in.

## Testing

- **SQL** (local DB): `supabase/tests/customer_pass.sql` covers the anonymous join lookup, wallet
  scope, refused writes and customer-to-customer isolation. The merchant repo has the stamp-engine
  and terminal tests.
- **Cross-app end-to-end:** `MERCHANT_DIR=../merchant-countertop-scanner e2e/run.sh`. It starts
  Postgres 0001–0005, PostgREST v14 and a mock Auth server (OTP code `123456`), then builds both
  apps. 19 checks cover:
  - join link and OTP sign-in
  - first-run name and the pending card
  - the customer's QR decoded from a screenshot, with its signature checked against the server
  - **that same image played to the merchant terminal's camera**, scanned and stamped by the real
    merchant UI
  - the customer seeing 1/7 with history
  - direct REST/RPC write attempts refused
  - offline shell, cached wallet and a valid offline QR
  - pass-code reset invalidating old codes
  - sign-out wiping data
  - customer isolation
  - zero console errors

  The harness has no Realtime server. Check the live animation on a real project: keep the pass
  open and stamp it from the terminal.

## Notes

- **Privacy:** stores see only "First L." and a member code (`#3F2A91C0`). The full name is
  visible to its owner only.
- **Tiers** (Silver below 15 lifetime stamps, Gold below 50, otherwise VIP) are display-only labels.
- **Not yet built:** account deletion and email change. Add these through Supabase Auth plus a
  `SECURITY DEFINER` cleanup function before launch in GDPR regions.
