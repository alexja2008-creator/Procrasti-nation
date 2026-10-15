# apps/site

The marketing site (landing page, `/privacy`, `/terms`) and the API the app calls. v1's pages retired on 2026-10-12 and redirect to the app (`next.config.js`). File-by-file map: `docs/architecture.md`, "apps/site".

## Stack

Next.js 14 (App Router), JavaScript/JSX, Tailwind 3 plus the A2 night palette as CSS variables in `app/globals.css` (the site is always night: style with `var(--ink)` and friends, no `dark:` prefix, no theme ternaries). Supabase checks the app's session token on each route (`lib/authMiddleware.js`); the site has no sign-in of its own. Web Push through `web-push` + VAPID. Vercel Analytics on the pages.

## Commands (inside apps/site)

```bash
npm run dev      # http://localhost:3000
npm run build    # production build; also the lint check, since ESLint was never configured
npm test         # Web Push helpers (test/push.test.mjs)
sh scripts/push-cron-dev.sh   # local stand-in for Supabase Cron: calls the push sender every minute
```

`npm run lint` opens an interactive ESLint setup; don't use it.

## Environment

`.env.local` (production values; Next only reads env files from this folder):

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://tmigxhhnhledszjdgnwk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...                 # the Web Push sender (Supabase Cron) and unsubscribe links
NEXT_PUBLIC_BASE_URL=https://procrasti-nation.work
NEXT_PUBLIC_APP_URL=https://app.procrasti-nation.work   # http://localhost:8081 in development
VAPID_PUBLIC_KEY=...            # node -e 'console.log(require("web-push").generateVAPIDKeys())'
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=https://procrasti-nation.work
```

`.env.development.local` points `next dev` at the **staging** Supabase project (so it accepts staging sessions) and holds development VAPID keys and staging's service-role key. Both files are gitignored. The app gets the same public key as `EXPO_PUBLIC_VAPID_PUBLIC_KEY`. Production has its own VAPID pair, in both Vercel projects.

## Calling Claude

- Every Anthropic call goes through `callClaude()` in `lib/ai.js`: raw `fetch()` (not the SDK), structured JSON output, a timeout.
- Models: `MODELS.plan` = `claude-sonnet-5-5` for plans, clarifying questions, syllabus parsing and "I'm stuck" (low effort); `MODELS.fast` = `claude-haiku-4-5` for step dates and short copy. Never build plans on Haiku: it passed 2 of 30 plan cases.
- Prompts live in `lib/prompts/`. A change to `plan.js` or its model must match or beat `evals/plan-quality`; a change to `unstick.js` must do the same on `evals/unstick`. Read the eval's README before running it.
- Clients send `today` (local `YYYY-MM-DD`) and `timeZone`, so the AI resolves "Friday" as the person's Friday.

## Limits and access

- Metered AI requests go through `logAndCount` in `lib/limits.js`: log first, then count, so parallel requests can't slip under a cap. `ai_requests` and `plan_generations` are insert-and-read only.
- Free tier: 2 plans per 30.5 days from account creation (core `planWindow`), not counting plans made during beta Pro (`freePlansCountFrom`). **Beta Pro:** until the close of 2026-11-15 in New York (core `BETA_PRO_UNTIL` / `inBetaPro`), nobody has a monthly limit. Everyone is capped at 20 plans a day; a plan is logged with its task only if the task is theirs, so every plan counts. "I'm stuck" is free for everyone at 20 a day. A 429 carries `limit: 'daily' | 'free'`; Anthropic's own 429 becomes a 503.
- Trial: 10 days of Pro from `user.created_at` (`lib/trial.js`). Anonymous passports get none. Payments come later through RevenueCat; the web is free-only for now.
- Four routes create a service-role client, inline and only after their own check: `cron/push` (`Authorization: Bearer <CRON_SECRET>`), `push/action` (a signed snooze token, no session), `unsubscribe` (a signed link) and `account/delete` (the session plus a typed DELETE; `auth.admin.deleteUser` needs the service role). Nowhere else.
- CORS for `/api/*` is an allowlist in `middleware.js`: the site's origin, `app.procrasti-nation.work`, and `localhost:8081` / `127.0.0.1:8081` in development.

## Conventions

- Tailwind utility classes plus the CSS variables; no CSS modules or styled-components. Breakpoints `md:` and `lg:`.
- Fonts are self-hosted with `next/font/google` in `app/layout.jsx` (CSS variables `--font-fraunces`, `--font-plex-mono`, `--font-instrument-sans`, `--font-space-grotesk`); never link fonts.googleapis.com or another font CDN (visitors' IP addresses would go to Google: `DECISIONS.md`).
- Components PascalCase, functions camelCase, `.jsx` for React files.
- The legal pages are formal, approved by Alex on 2026-10-13, and written from what the code does. `lib/site.js` holds `LEGAL_EFFECTIVE` and `LEGAL_DRAFT`.
- `parse-syllabus` and `unsubscribe` are kept for features coming back (syllabus import, the Monday email). `parse-syllabus` is switched off (404, `SYLLABUS_IMPORT_ON`) until syllabus import returns; turning it back on is a checklist in `DECISIONS.md` (a cap, its SQL, the privacy policy, an eval). Every marketing email carries a postal address and a one-click unsubscribe (CAN-SPAM, `DECISIONS.md`).
