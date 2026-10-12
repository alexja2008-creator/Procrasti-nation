# Plan: v2 goes live on the web

## Overview
v2 replaces v1 at procrasti-nation.work. The site (`apps/site`) becomes the landing page, a privacy policy, terms and the API; the app (`apps/app`'s web export) lives at `app.procrasti-nation.work`. Every v1 page retires and redirects to the app. Everyone starts over: v1's only real user is Alex, so no data is migrated. The iPhone app follows separately (Apple Developer account → TestFlight with 10 students → App Store).

## Decisions (Alex, 2026-10-12)
- **A fresh start:** every account is deleted at cutover, Alex's included (`supabase/v2/04_fresh_start.sql`); citizen numbers restart at 000001. `02_backfill.sql` isn't run.
- **The web launches free-only.** Everyone gets the free tier (2 plans per 30.5 days from creation). Payments arrive with the App Store version through RevenueCat, which can also take web payments through Stripe.
- **v1's daily nudge email retires** at cutover.
- **State of the Union replaces the Weekly Citizen Report, every Monday morning** (the v2 plan said Sunday evening). It isn't built yet: its own plan, after launch (recommended: with a fresh start nobody misses a Monday email in between).

## What stays on the site after cutover
- Pages: the landing page (rewritten for v2), `/privacy`, `/terms`.
- Routes the v2 app uses: `generate-plan`, `resolve-step-dates`, `unstick`, `account/delete`; Web Push's `cron/push` and `push/action`; `unsubscribe` (State of the Union will send email).
- Kept, unused for now: `parse-syllabus` (syllabus import is a planned v2 feature), `lib/stripe.js` (account deletion cancels a subscription still billing).
- Removed: v1's pages (planner, dashboard, calendar, syllabus, reset station, friends, profile, FAQ), their components, the friends and public-profile routes, Stripe checkout, portal and webhook (nothing links to them, and payments come back through RevenueCat), the `nudge` and `weekly-report` crons and their email templates, `lib/storage.js`.

## Files to Create/Modify
| File | Action | What changes |
|---|---|---|
| `apps/site/app/{planner,dashboard,calendar,syllabus,reset-station,friends,profile,faq}/` | Delete | v1 pages |
| `apps/site/components/*` | Delete | v1 components (Navigation, AuthModal, TutorialModal, UpgradeModal, calendar grids, StaleTaskPrompt, FriendNudgeInbox); Logo kept if the landing page uses it |
| `apps/site/app/api/{friends,profile,stripe,cron/nudge,cron/weekly-report}/` | Delete | v1 routes |
| `apps/site/lib/emails.js`, `lib/storage.js` | Delete / trim | v1's nudge and weekly templates; State of the Union brings its own |
| `apps/site/next.config.js` | Modify | Permanent redirects from every v1 path to `https://app.procrasti-nation.work` |
| `apps/site/vercel.json` | Modify | No crons (Web Push runs from Supabase Cron) |
| `apps/site/app/page.jsx` | Rewrite | v2 landing page in A2: what it does, Open the app, App Store badge later |
| `apps/site/app/layout.jsx`, `providers.jsx` | Modify | No auth on the marketing site (sign-in is the app's); metadata for v2 |
| `apps/site/app/privacy/page.jsx`, `terms/page.jsx` | Create | Drafts for Alex to review (what's collected, processors: Supabase, Anthropic, Vercel, Resend, Stripe/RevenueCat later, Google/Apple sign-in, push services; deletion and export in Settings) |
| `apps/app/vercel.json` | Create | Every path → `index.html` (a notification opens `/task/<id>` in a new tab), `sw.js` from the root |
| `apps/app/src/app/settings.tsx` | Modify | Privacy policy and Terms links under Account (the App Store needs them in the app too) |
| `CLAUDE.md`, `PN2-HANDOFF.md`, `DECISIONS.md`, `README.md` | Modify | The site section describes v1 today; rewrite it for what's left |

No database changes beyond `01_schema.sql` and `04_fresh_start.sql` (both written and tested).

## Phase 1: Retire v1 on the `v2` branch (Claude)
1. **Delete v1's pages, components, routes and crons; add the redirects.** The site still builds and the four v2 routes still answer (`npm run site:test`, `npm --prefix apps/site run build`).
2. **A placeholder landing page** that points to the app, so Phase 1 could ship alone.
3. **`apps/app/vercel.json`** and a check of the web export locally (`npx expo export --platform web`, served with the rewrites): a deep link like `/task/<id>` loads, `sw.js` registers.

**Built 2026-10-12.** The site is now the placeholder landing page (A2 palette and fonts, light and night, "Open the app"), the eight routes v2 uses or will (`generate-plan`, `resolve-step-dates`, `unstick`, `account/delete`, `cron/push`, `push/action`, `unsubscribe`, `parse-syllabus`), the share image and the icon. Removed: v1's 8 pages, 10 components, the friends, profile and Stripe routes, the nudge and weekly-report crons (`vercel.json` is gone), `lib/{dates,emails,storage,supabase}.js`, `providers.jsx`, and the `lucide-react` and `resend` packages. `/planner`, `/dashboard/…`, `/profile/…`, `/faq`, `/focus-pods` and the rest answer 307 to the app (`NEXT_PUBLIC_APP_URL`, default `https://app.procrasti-nation.work`). `apps/app/vercel.json`: `npx expo export --platform web` → `dist`, real files first, every other path → `index.html`, security headers, `sw.js` uncached. **Checked:** the site builds and its tests pass; signed-out calls get 401 and the app's CORS preflight still passes; the placeholder in light and night (the wordmark's green follows the palette: v1's light green read at 1.8:1 on cream); the web export served by the same rule: `/task/<id>` returned the app, which booted and routed to the Application (signed out); in a throwaway headless Chrome `sw.js` registered at the root scope. The Claude browser pane refuses service-worker scripts from new local ports (the export and a plain Python server alike), so that check needs real Chrome. **For the app's Vercel project:** turn on "Include files outside the Root Directory in the Build Step" (the build reads `packages/core`). The site's project already has it on (it needs it too after the flip to `apps/site`: `lib/core.js` reads `packages/core`).

## Phase 2: The landing page, privacy and terms (Claude drafts, Alex approves)
1. **Landing page:** A2 look, real screenshots of Today, Plan it, Start Mode and the Passport; "Open the app"; the free tier stated plainly.
2. **Privacy policy and terms:** drafts built from what the code actually collects. Not legal advice: Alex reviews (a lawyer or a generator service if he wants certainty).
3. **Links in the app:** Settings → Account.

**Built 2026-10-12.** The landing page (`components/landing/`): a hero ("Start the thing you've been putting off.", Today in a phone frame with an APPLICATION APPROVED stamp), How it works (Plan it, Start Mode, the Passport), the Morning Briefing and Declarations, four short cards (reminders, notes, territories, never "overdue"), the three nudge tones in the app's own words (`nudgeTones` from `@pn/core`), and a closing "Your Citizenship Application is open." with what's free. Twelve screenshots in `public/screens/` (light and night of six screens, shown by the visitor's theme): taken on the iPhone Simulator with curated demo tasks held in memory only (never saved; Start Mode's save was refused for the made-up task, staging matched the snapshot afterwards), a clean 9:41 status bar, Expo Go's tools button hidden. `/privacy` and `/terms`: drafts written from what the code does, marked "Draft, not yet reviewed" (`LEGAL_DRAFT` in `lib/site.js`) with the open questions in [brackets]. Settings → Account in the app now has Privacy policy and Terms of use (the in-app browser on iPhone, a new tab on web). **Checked:** the site builds (all three pages static), at 1280 and 375 px in light and night in a throwaway headless Chrome (no sideways scroll; two stamps that covered text at phone width were moved); the iPhone opens the policy from Settings.

**Filled in (Alex, 2026-10-12):** run by Alex Anderson, New York City; contact procrasti.nation.marketing@gmail.com (also in the footer); 13 and older; the laws of the State of New York; the database in the US (production's Supabase is AWS us-west-2, Oregon; staging's is in the east and holds no users); no database backups today, at most 7 days if they're turned on; effective October 25, 2026 (the tentative launch, `LEGAL_EFFECTIVE` in `lib/site.js`: move it with the launch). Anthropic's commercial terms don't let it train on API data (checked 2026-10-12). **Still to do:** a review of both pages (a lawyer, or a careful read against a generator's output), then `LEGAL_DRAFT = false`. When they ship: State of the Union's email (with its unsubscribe) and, if texted codes are turned on, the phone number go into the policy. If backups ever keep more than 7 days, the policy changes first.

## Phase 3: Cutover day (Alex runs, Claude checks along)
Before the day (Alex):
- Resend as Supabase's SMTP on production; raise the email rate limit.
- Supabase production auth: anonymous sign-ins on; Confirm email as decided; Site URL `https://app.procrasti-nation.work`; redirect allow list `https://app.procrasti-nation.work/auth/callback` (plus `procrastination://auth/callback` for the iPhone later).
- Vercel: a second project for `apps/app` (domain `app.procrasti-nation.work`, DNS at Porkbun), its `EXPO_PUBLIC_*` env (production Supabase URL and anon key, `EXPO_PUBLIC_API_BASE_URL=https://procrasti-nation.work`, `EXPO_PUBLIC_AUTH_PROVIDERS`, `EXPO_PUBLIC_VAPID_PUBLIC_KEY`); production VAPID keys on the site project; Vercel Pro when he's ready to charge.
- Sign-in methods at launch: email and password plus the sign-in link; Google if its OAuth client is set up; texted codes off; Apple with the iPhone app.
- A fresh dump of production's structure (`supabase/v2/scripts/dump-prod-schema.sh`) so `npm run db:test` checks the real thing; then a rehearsal of `01_schema.sql` and `04_fresh_start.sql` on staging inside a rolled-back transaction.

On the day, in order:
1. `supabase/v2/01_schema.sql` on production.
2. Stripe: nothing billing (none as of 2026-10-12); delete the webhook endpoint in Stripe's dashboard (v2 has no webhook route, so Stripe's retries would only fail). The Stripe env vars are already gone from Vercel (Alex, 2026-10-12).
3. `supabase/v2/04_fresh_start.sql` on production. Permanent.
4. Merge `v2` into `main` and flip the site project's Root Directory to `apps/site` at the same moment.
5. Deploy the app project.
6. Web Push: `select vault.create_secret('<CRON_SECRET>', 'push_cron_secret');` then `supabase/v2/03_push_cron.sql`.
7. Smoke test: a new passport through the whole Application and the Oath, a plan, Start Mode, a reminder on the web, Save your passport by email, sign out and back in, an old v1 URL redirecting.

If it goes wrong: revert the merge and the Root Directory (v1's code works on the v2 schema, which is additive). Accounts deleted by step 3 don't come back, which is the point.

## Risks
- **The Root Directory flip** applies to every branch: flipped early, production breaks; late, the v2 merge deploys the old layout. Do both together.
- **Sign-in emails** without custom SMTP stop after a couple an hour for the whole project.
- **The app's deep links** need the rewrite, or a notification opening `/task/<id>` gets a 404.
- **Old links** (bookmarks, past emails) land on the redirects; `/api/unsubscribe` keeps working.
- **The privacy policy** must match what the app does; it's a draft until Alex approves it.

## Done When
- [ ] The site has only the landing page, `/privacy`, `/terms` and the routes v2 uses; every v1 path redirects; the site builds and its tests pass.
- [ ] The app's web export serves deep links and `sw.js` with `apps/app/vercel.json`.
- [ ] Alex has approved the landing page, the privacy policy and the terms.
- [ ] The cutover steps ran in order, and the smoke test passed on production.
