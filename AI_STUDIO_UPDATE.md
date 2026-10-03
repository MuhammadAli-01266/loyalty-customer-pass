# Updating the live deployment (from Google AI Studio)

**Why the live site still shows the prototype:** the Vercel project deploys the code held in
Google AI Studio, and AI Studio still holds the original prototype. The ported app in this zip has
never been deployed. Its demo users, member switcher and direct-to-scanner behaviour don't exist
in this code, so the fix is to deploy **this** codebase.

## Recommended path: GitHub → Vercel (bypasses AI Studio)

1. Create a new GitHub repo. Extract this zip into it and commit everything, including
   `package-lock.json`. Push.
2. In Vercel, open the existing project → *Settings → Git* → connect the new repo (or create a new
   project). Set the Framework Preset to **Vite**.
3. Set the environment variables (see `.env.example` and `DEPLOY.md` step C3), then **Redeploy
   with "Use existing Build Cache" unticked**.
4. Confirm the deploy took effect: open the site and *View Source*. The `<title>` must be the one
   listed below, not the prototype's.

## If you must stay in AI Studio

Apply **every** change below; a partial copy leaves prototype code in the bundle. Then:

- Don't ask the AI Studio model to "fix" or "improve" these files afterwards. It regenerates code
  and can reintroduce demo data, hard-coded keys or the `fetch` patch.
- AI Studio does not run `npm install` from `package-lock.json` the way Vercel does. Make sure its
  `package.json` matches this zip exactly (dependencies were added and removed).
- After deploying, run `node --env-file=.env.local scripts/check-backend.mjs` (merchant repo) with
  `DEPLOY_URL=<the live URL>`. It fails if the live bundle doesn't target your project/key.

### Customer Pass: file changes vs. the AI Studio prototype

**Live check after deploy:** page source `<title>` must be **`Loyalty Pass`** (the prototype's is
"Supabase Multi-Tenant Loyalty Stamp SaaS SQL Engine"). The first screen must be the email
sign-in, with no names and no selector.

**DELETE (all of these; they contain the demo users, fake QR, schema viewer and fetch patch):**
`bun.lock`, `metadata.json`, `src/fetchPolyfill.ts`, `src/assets/images/cafe_hero_banner_1790862653855.jpg`,
`src/components/LoyaltyStampPass.tsx` (old one; the new one is `src/pass/LoyaltyStampPass.tsx`),
`src/components/{CustomerLoyaltyCard,Header,RlsMatrix,SchemaErd,SqlViewer,SupabaseGuide,TriggerSimulator}.tsx`,
`src/data/schemaDefinitions.ts`, `src/data/schemaSql.ts`,
**`supabase/schema.sql`**. Never run it: it contains the privilege-escalation policies from the audit.
The secure schema is `supabase/migrations/0001–0005`.

**REPLACE (overwrite entirely):** `.env.example`, `.gitignore`, `README.md`, `index.html` (removes the inline
`window.fetch` override), `package.json`, `src/App.tsx`, `src/lib/supabase.ts`, `src/main.tsx`,
`tsconfig.json`, `vite.config.ts`

**ADD:** `package-lock.json`, `vercel.json` (SPA rewrite for `/join/<slug>`), `DEPLOY.md`, `public/sw.js`,
`public/manifest.webmanifest`, `public/icons/icon.svg`, `src/vite-env.d.ts`,
`src/components/{AuthGate,ErrorBoundary,NameScreen,Shell,SignInScreen}.tsx`,
`src/hooks/{useInstallPrompt,useOnlineStatus,usePassToken,useWakeLock,useWallet}.ts`,
`src/lib/{api,env,errors,model,qr,sound,storage}.ts`, `src/pass/LoyaltyStampPass.tsx`,
`supabase/migrations/*.sql` (0001–0005), `supabase/tests/{customer_pass,verify_deployment}.sql`, `e2e/*` (optional)
