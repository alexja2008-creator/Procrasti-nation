# ProcrastiNation 2.0: Session Handoff (as of 2026-10-07)

Paste this into a new Claude Code session together with the approved plan ("ProcrastiNation 2.0: Re-envisioning & Rebuild Plan", saved at `~/.claude/plans/ProcrastiNation2.md`). Project memory lives in `~/.claude/projects/-Users-alexanderson-Desktop-Procrasti-nation/memory/` (the folder changed when the repo moved) and holds seven entries: `feedback_git_workflow`, `product-direction-v2`, `plan-quality-evals`, `design-direction-a2`, `no-accidental-done` (no one-tap Done where a dismiss could hit it; web notifications are Start + Snooze), `self-compassion-voice` (shame feeds procrastination: no guilt anywhere, Roast included) and `web-screen-reader-a11y-tabled` (parked; its open gaps listed).

**Start the next session here:**
1. **Sign in on staging.** v2 now has passwords (`PN2-PASSWORDS-PLAN.md`): once Alex has set one (Settings → Account → Password, no email needed), he signs in with it on any device. Until then: Alex requests ONE magic link ("Email me a sign-in link instead") (from the iOS Simulator's Expo Go, or in the browser pane) and pastes it into the chat, and Claude opens it on that device (`xcrun simctl openurl booted "<link>"`). Only the newest link works, and it must open where it was requested. If sign-in says "too many tries", that's Supabase's email rate limit: staging sends through Supabase's built-in email, which allows only a couple of auth emails per hour for the whole project, so two links use it up. Wait for the hour to roll over, or set up custom SMTP (Resend) on staging and raise the limit (section 2).
2. **Then finish the onboarding checks on the iPhone** (section 5, "Onboarding"): web is done.
3. **Web screen-reader state** landed in `b9a8ba8` (`aria-checked` / `aria-selected`); the rest is parked (memory `web-screen-reader-a11y-tabled`).

---

## 1. Where things stand

- **Repo:** `~/Desktop/Procrasti-nation` (moved 2026-10-01 to drop the space and curly apostrophe from the path).
- **Production (`main`, `94763ed`)** runs the v1 site with all Phase 0 fixes plus the Next 14.2.35 security patch, live on procrasti-nation.work.
- **`v2`** is pushed to origin and up to date. Vercel shows failed preview builds for it until the Root Directory flip at merge (expected).
- **Staging Supabase:** project `mbuakrohovzjegonrplp`. It has production's structure only (no production data) plus v2's `01_schema.sql` (including `ai_requests`, `tasks.note_id`, the `note_counts` view, the `search_items` function, and Web Push's `push_tokens.keys`, `save_web_push`, `push_sends` and `push_snoozes`). Alex is **citizen #000001** there, with 33 live tasks: his 17 (including the test plan "Write 5-page history paper on WWI", 10 steps) plus the Oath plan from the web check ("Study for chem midterm", 15 steps, due Wed 14 Oct). He went through the Application on the iPhone (Life admin, Night owl, It's boring, Roast; Home territory; Oath "clean my room"), has the username **alex** (the first `profiles` row on staging) and a password. He's signed in on the iPhone (Expo Go); setting his password there signed out his other sessions (Supabase does that on a password change), including the web in Claude's browser pane. Staging has **Anonymous sign-ins on** (2026-10-07), email confirmation on, and no phone provider yet (Twilio Verify is Alex's next step).

**What works on v2 today** (verified on web in the browser pane, signed in against staging):
- **Sign-in:** email + password (v1 passwords carry over; Supabase Auth stores them), Create account (username like v1's, email, password; email confirmation), Forgot your password? (reset link → Choose a new password), and "Email me a sign-in link instead" for existing accounts (PKCE). Settings → Account sets or changes the password (no email) and the username. Apple and Google are built but hidden behind `EXPO_PUBLIC_AUTH_PROVIDERS=email` until the providers are configured.
- **Quick add:** natural-language capture ("walk Biscuit every day 6pm", "essay due fri", "call mom tomorrow at 5") with live chips; undated captures go to Customs.
- **Today:** real data. Timed items first; missed items roll forward without overdue styling; finished-today items show STAMPED; Customs expands inline; repeating tasks move to their next date ("Stretch · back tomorrow").
- **Plan it:** the eval-gated Adherence Planner (prompts and models unchanged), with optional clarifying questions, a preview showing per-step estimates and dates, and steps saved as child tasks. The next step appears as the A2 "Your next small step" ticket on Today. Entry points: a pill on big-sounding tasks, and a button in quick add.
- **Start Mode:** full-screen focus view from the next-step card or a row's menu. Wall-clock timer, the "just N minutes" contract (keep going / stop here), Pause, Done → ink stamp + haptic → "Start the next step". **I'm stuck:** one-tap reason → `/api/unstick` (Sonnet 5.5, low effort, eval-gated) → a two-minute first action, or a box-breathing breather. Sessions resume after the app is closed or the page reloads. Web: Space pauses, Esc leaves.
- **Today extras:** "Up next" card when no plan step is due; press and hold a row (right-click on web) for Start / Plan it / Move to… (reschedule with the When sheet) / File in… (a territory), with a standing hint under the agenda heading (Alex prefers press-and-hold to a visible Start button per row); step counts include steps finished on earlier days.
- **Upcoming:** everything after today, by day: the next 7 days always (empty ones say "Nothing yet."), then only busy days up to 8 weeks, then Later. Repeats show once on their next date; plan steps show on their days with "step i of n"; a task's due day gets a terracotta DUE marker (tap to open) when its work happens on other days. Phones: a week strip with dots, pinned while the list scrolls, and a Month toggle. Laptop width: the month calendar sits beside the list. Picking a day scrolls to it. Each day has a "+" (quick add for that day: "for Thu 8 Oct"; a typed date still wins). Rows work like Today's (tap, press and hold, check); checking one off hides it and offers Undo.
- **Territories:** Customs at the top (the same undated, unfiled captures Today shows), then the person's territories as cards: stamp-ink stripe, kind icon (School / Work / Home / Other), open count and next dated item ("3 open · Tomorrow: Read chapter 4"); drag the handle to reorder. New territory (name, kind, ink) or one-tap starters (School, Work, Home) when there are none. A territory's page lists Coming up, then Anytime (a plan shows "1 of 8 steps"), with "+" to capture into it and Edit (rename, kind, ink, Delete: its tasks go back to Customs or stay on their days, with Undo). Laptop width puts the list and the page side by side. Filing: task detail's Territory field, File in… in the row menu ("Filed in Chem 201." + Undo), or "#chem" in quick add; a plan's steps follow their plan. Today and Upcoming rows name the territory ("Chem 201 · due Fri").
- **Notes:** a Notes card under Customs (all notes, most recently edited first) and each territory's notes on its page. A note is a title plus lines; ☐ in the top bar (⌘⇧L on web) turns the line you're on into a **live checklist line**: a real task, read like quick add ("read ch 5 fri" → Fri), that shows on Today and Upcoming with the note's name and ticks both ways. Return adds the next line, Return on an empty one ends the checklist, Backspace on an empty one removes it. A checklist line's chevron opens its task. Notes autosave; filing a note in a territory files its checklist tasks too; deleting one takes its open lines with it (Undo brings both back); an emptied note goes away quietly. The + sheet has a **Task / Note** switch for jotting a few lines (⌘↩ saves on web). Checklist tasks stay out of Customs and territory counts (the note shows "1 of 4"). A tip under a note's title explains ☐ until it's first used. Notes load **25 at a time** (Notes page and each territory's), with **Show older** adding 25 per tap; the counts on the Territories tab stay exact.
- **Search:** a magnifier on Today, Upcoming and Territories (⌘K or / on web; Escape closes) finds open and finished tasks (plan steps and the Notes field included) and notes as you type, partial words too ("chem" → "Chemistry"). Results are grouped (Tasks, Finished, Notes), best match first, 25 per group with Show more. "#chem lab" narrows to Chem 201 with a removable chip. Rows check off with Undo and open as usual; a checklist line opens its note; notes and Notes-field matches show a snippet with the match highlighted. A centered panel at laptop width on web.
- **Reminders (iPhone):** a task with a time rings at that time (each time a repeat comes round), a deadline with a time rings when it's due ("Essay is due at 5:00 PM"), and an optional **morning list** rings once a day with what's on and the first thing to start ("Three things today" / "Start with “Gather 4-5 sources”."). Words are plain: the title, then "Every day · Home" or "History paper · step 2 of 10". Press and hold (or pull down) for **Done · Snooze 10 min · Start 5 min**: Done checks the task off exactly like a checkbox (a repeat moves on) without opening the app, even when it's closed; Snooze rings again in 10 minutes; Start 5 min opens Start Mode with a five-minute timer; a tap opens the task (the morning list opens Today). Reminders are planned in core (the next 14 days, the soonest 64, iOS's limit) and reconciled with what the phone has pending whenever tasks change, the app comes back, or settings change, so finishing, re-timing, retitling or deleting a task just updates them. Permission is asked the first time a task gets a time ("Want a nudge at 6:00 PM?", Allow / Not now), never on launch. A **Reminders card** on Passport shows whether they're on (Turn on, or Open Settings when iOS has them off) and the morning list (off by default; on/off and its time, saved with the person). On the web, reminders come by Web Push (next bullet).
- **Web Push (built and checked end to end 2026-10-07, see section 5):** the same reminders in Chrome, Edge, Firefox and Safari on a computer, with the tab closed (the browser must be running; Safari on a Mac needn't be). Every minute Supabase Cron calls the site's `/api/cron/push`, which works out what came due for each person with a browser subscribed (core's `remindersDue` on their tasks as they are now, in their own timezone) and sends it; each send is logged first so nothing rings twice, a missed minute is caught up for 10 minutes, and the push service holds a reminder until an hour after its time, then drops it. Notifications carry **Start 5 min** and **Snooze 10 min** in Chrome and Edge (Firefox and Safari show no buttons) and deliberately **no Done** (Alex: dismissing must never finish a task); a click opens the task (the morning list opens Today), focusing an open tab or opening one. Snooze posts a signed one-task token to `/api/push/action`, which queues a snooze the sender rings 10 minutes later. The ask is the same sheet as on iPhone; the card shows On in this browser (with **Turn off here**), Off, Blocked (how to allow it in site settings) or This browser can't show reminders. Every device where reminders are on rings, each with its own switch; signing out forgets the browser. Decisions and design: `PN2-WEB-PUSH-PLAN.md`.
- **Citizenship Application (onboarding, built 2026-10-07; see `PN2-ONBOARDING-PLAN.md`):**
  - Everyone signed in who hasn't done it lands on it first: new sign-ups, and v1 users the first time they open v2.
  - The pages: Welcome (your reserved citizen number), then Purpose of visit, Your hours, What usually stops you, "First, you're not broken" (Alex's self-forgiveness page, from Pychyl & Sirois and Wohl et al. 2010), Nudge tone, and the Oath. The Oath is one real thing they've been putting off, read like quick add; the real Plan it opens on it.
  - It ends with an APPROVED ink stamp.
  - Each answer is saved as it's picked, and the form resumes where it was left. Back works; Skip counts as done.
  - Purpose creates territories (only when there are none). A night owl's day ends at 3 AM. The morning list's time follows Hours.
  - What stops you sets Start Mode's timer and the plan style. "It feels too big" makes Today show just the next step, with "Show everything (N more)".
  - The tone (Diplomat / Drill Sergeant / Roast) gives Start Mode's lines and the morning list (iPhone and Web Push) their words. Roast jokes about the task, never the person.
- **Settings** (sliders on Passport): every Application answer, Start Mode's timer (Automatic or 2/5/10/25), Day ends at, the Reminders card and Sign out (both moved off Passport). **Sign out now signs out only this device;** supabase-js's default is every device.
- **Task detail** (tap a row or the next-step card): checkbox and title, Start and Plan it, When / Due / Repeat / Estimate (one-tap chips, a month calendar, or "type it" like "fri 6pm"), notes, delete with Undo. Steps: check off, open, add your own, drag the handle to reorder (one row written per move), and "Re-plan the rest" (keeps finished steps, replaces open ones). Everything autosaves.
- **Passport:** A2 ID page with citizen number, bilingual fields, passport code lines, real stamps ("Officially started", "Small steps N") and a rank bar counting real starts. Sign out.
- **Navigation:** bottom tab bar on phones, sidebar at ≥900px. Day and night ("night passport") themes follow the system.
- **iOS:** checked on the iOS Simulator through Expo Go, signed in (Today, Start Mode, Passport, row menu).

**Not built yet:** Live Activity / lock-screen timer and the timer-end notification, Town Hall, account deletion and export (next; it belongs in Settings), and offline sync.

**Commits on `v2`** (oldest first; branched from `main` at `bc120c2`):

| Commit | What |
|---|---|
| `5361366` | Move the Next.js site into `apps/site` (pure renames) |
| `253f943` | Expo app + `@pn/core` + A2 Today screen (mock data) |
| `9c9d094` | Merge `main` (Next 14.2.35 security patch) |
| `6127466` | v2 DB migration: schema, cutover backfill, rollback, PGlite tests |
| `bea8421` | Sign-in screen and Supabase session handling |
| `1736bb0` | Scripts to copy production's structure into staging; prod-stats query |
| `f6d84ae` | Migration fixed for production's real structure (`tasks.source`, step `completedAt`) |
| `abb1cfb` | Docs: staging state |
| `e7fbdc0` | Real Today, quick add, citizen passport on Supabase |
| `f2dc189` | Copy fix for the repeating-task notice |
| `53fa373` | No wasted citizen numbers; capture keeps focus; dev server watch mode |
| `20a7550` | Plan it on the v2 task model; `plan_generations`; CORS middleware |
| `434bcf2` | This handoff |
| `d1124c0` | Start Mode, I'm stuck (`/api/unstick`, `evals/unstick`), stamps, ranks, row menu, `ai_requests` |
| `de588a2` | Start Mode: resume after close, full step counts, race-safe stuck cap, `useStartSession` |
| `4dbe12e` | Sign-in callback handles a newer link after a failed one (found on iOS) |
| `b0d27a7` | Press-and-hold hint always shown |
| `3859eed` | Task detail: fields, date sheet, repeat, delete + Undo |
| `35bf539` | Task detail: steps (add, open, drag to reorder) |
| `e655e58` | Re-plan the rest, type-a-date, estimates |
| `c87e8a5` | Upcoming: `buildUpcoming`, day sections, DUE markers, Undo on check-off |
| `bb8aad3` | Upcoming: week strip (pinned) + Month toggle, two columns at laptop width, scroll to a day |
| `5a4b398` | Upcoming: "+" per day (quick add preset), Move to… in the row menu |
| `b388a51` | Today orders timed items by time of day (missed ones too); one rule (`timeOnItsDay`) for a row's time |
| `e95600f` | Territories: tab, territory and Customs pages, lists store, create / edit / delete with Undo, laptop columns |
| `8a7937a` | Territories: Territory field, File in…, territory on Today / Upcoming rows, steps follow their plan |
| `b8e72be` | Territories: `#tag` in quick add, drag to reorder (shared `useDragReorder`), sheets above the keyboard on iOS |
| `87ae8cf` | Notes: `tasks.note_id`, notes store, Notes card and page, the note editor, each territory's notes |
| `d7c40b5` | Notes: live checklist lines that are real tasks (☐, Return / Backspace rules, ticks both ways, refile and delete with the note) |
| `33a2386` | Notes: Task / Note switch in +, ⌘⇧L, caret placement, unsaved checklist words survive Close |
| `2314bbc` | Notes: the "make a line a task" tip |
| `8ca3ea6` | Search: `search_items` (tested, on staging), core `parseSearch`, the data layer, `useSearch`, a results page |
| `98b42ab` | Search: magnifier on every tab, ⌘K and /, rows that act, snippets, territory chip, Show more, states, laptop panel |
| `b5386ed` | Search: bounded to the person's own rows (no GIN under RLS), limits on input and page size |
| `761c801` | Loading that doesn't grow: tasks fetch only what's on the go, every list fetched page by page past 1,000 rows, notes 25 at a time with Show older, `note_counts` view |
| `ceddb0e` | Reminders that ring: `expo-notifications`, core `planReminders` / `reminderChanges` / `checkOff`, the scheduler, the first-time ask; iOS 27 scene life cycle plugin, placeholder bundle id, `scripts/ios-dev-build.sh` |
| `464c0b4` | Reminder buttons: Done / Snooze 10 min / Start 5 min / tap, handled once each; the Swift add-on for Done and Snooze with the app closed; Start Mode `?minutes=` |
| `6ff0be2` | Morning list, the Reminders card on Passport, `savePreferences`, switch tokens |
| `1511922` | Docs: reminders in CLAUDE.md and this handoff; notifications plan marked built |
| `ef34816` | A refused Done is dropped instead of blocking the queue; a cut-off save retries on return, and gives up after 15s |
| `a0bea77` | Docs: handoff for the next session |
| `4935c4a` | Web Push plan with Alex's decisions |
| `da8692b` | Web Push server: schema (`push_tokens.keys`, `save_web_push`, `push_sends`, `push_snoozes`), core `remindersDue`, `lib/push.js`, `/api/cron/push`, `/api/push/action`, site unit tests |
| `9a1d37c` | Web Push browser side: `public/sw.js`, real `.web.ts` permission / scheduler / responses, the card's web states and Turn off here; `03_push_cron.sql`; `scripts/push-cron-dev.sh` |
| `f20fbb0` | Web Push checked end to end in Chrome; `apps/app/scripts/chrome-cdp.mjs` |
| `3cde729` | Onboarding and Settings plan with Alex's decisions |
| `ef6fa61` | The Citizenship Application (gate, pages, answers, self-forgiveness page, Approved; `LandingStamp`) |
| `8ae3c5e` | The Oath and Settings; sign out is this device only; saves that change no row fail |
| `a064850` | Nudge tone in Start Mode and the morning list; overwhelmed Today |
| `4b9f7f4` | Docs: onboarding and Settings |
| `529ba4c` | APPLICATION / APPROVED stamp: 270pt on Approved, earned once for answering (`citizenship`), on Passport; stamp words fit their line |
| `87c6ce9` | Passport stamps overlap at the rims only and scale to fit narrow cards; notices on the focused Today |
| `bca5ef6` | A round stamp's date sits as far inside the ring as PROCRASTINATION |
| `a09590c` | Passwords plan with Alex's decisions |
| `9e5f83e` | Password sign-in; Settings → Password; core `account.ts` (`authErrorKind`) |
| `a78ba7c` | Create account with a username, Forgot password (`auth/new-password`), sign-in link for existing accounts only, Settings → Username |
| `8890c13` | The count stamp sits clear of the round stamp before it |
| `f0422e4` | Free tier 2 plans per 30.5 days; one plan at a time; capped clarifying questions; no trial for anonymous passports |
| `a25def5` | The conversion funnel: anonymous passport, Your result, How PN helps, Where did you hear, Your first week, the nudge, Save your passport, Text me a code |

**State of the Simulator (end of 2026-10-07):** iPhone 18 Pro (iOS 27) has two copies of the app, both **signed out** (sessions revoked; sign in again).
- **Expo Go** is fine for everything except notifications. It last loaded from the Metro on port 8083: `exp://127.0.0.1:8083`.
- The **development build** (`dev.procrastination.local`, the plain "ProcrastiNation" icon) has notifications allowed; it was built with `METRO_PORT=8083`, so it only loads while a Metro server runs on 8083 (from `apps/app`: `npx expo start --port 8083 < /dev/null`), or rebuild it with the script below for the default 8081. Notification Center still holds an old "Harness test" notification; clear it. CocoaPods 1.17 is installed (Homebrew).

**iOS development build** (reminders need it: Expo Go can't schedule local notifications on iOS 27): with Metro running, `sh apps/app/scripts/ios-dev-build.sh` (add `METRO_PORT=8083` to point it at another Metro). It builds a copy in `~/Library/Caches/procrastination-ios` (about 8.5 GB with build products; later builds are incremental), because this repo sits on the iCloud-synced Desktop and iCloud's file attributes break code signing, and installs `dev.procrastination.local` on the booted Simulator. It's a separate app from Expo Go, so it needs its own sign-in (request the link from it, then open the link on the Simulator).

**Run it locally:**
1. Start both preview servers from `.claude/launch.json`: `site` (port 3000; `apps/site/.env.development.local` points it at staging) and `app-web` (port 8081; `apps/app/.env.local` points at staging).
2. Open `http://localhost:8081`. To sign in inside Claude's browser pane, Alex requests a link there and pastes it from his email into the pane's address bar (a PKCE link only works in the browser that requested it).
   On the iOS Simulator: request the link from the simulator, then open Alex's link with `xcrun simctl openurl booted "<link>"` and tap Open. Only the **newest** link works (each request cancels the previous one), and the link must come from the device that asked for it.
3. For iOS: from `apps/app`, run `npx expo start --port 8082 < /dev/null`, then `xcrun simctl openurl booted exp://127.0.0.1:8082`.

**Checks:**
- `npm run core:test`: 76 tests.
- `npm run db:test`: the migration tests (27 run, one schools check skipped on the stand-in), on the stand-in schema and, when the local dump exists, the real production structure, each with the `profiles` billing lock from `supabase/migrations/` applied.
- `npm run site:test`: Web Push helpers (snooze tokens, the timezone switch, payloads).
- `npm run app:check`: typecheck + lint.
- `npm --prefix apps/site run build`.

---

## 2. Open items for Alex (in priority order)

1. **Free-tier bypass fix on production (security, 2026-10-07).** Anyone could give themselves an endless Pro trial (`user_metadata.trial_ends_at`) or set their own `profiles.stripe_subscription_status` to `active`; `profiles` also published every user's Stripe fields. Fixed on `v2` and on `main` (PR #10: trial from `created_at`, `lib/trial.js`; a trigger making the Stripe columns server-only; the API reads only the public profile columns). **PR #10 merged on 2026-10-07 before script 1 ran,** so production's code has been calling `my_subscription_status()`, which script 1 creates; until it runs, a paying Pro subscriber past the trial is treated as free (3 plans a month). Now, in this order: run `supabase/migrations/profiles_billing_1_before_deploy.sql` in the SQL Editor (read its last query: rows with `set_by_a_user` true were set by a user, not Stripe), then `profiles_billing_2_after_deploy.sql` straight away (the code is already live; every `profiles` read on `main` uses public columns or the service role). Staging has neither yet (checked 2026-10-08): run both there too; v2's site reads Pro only through script 1's function. Alex is running them on 2026-10-08. Re-dump production's structure afterwards and run `npm run db:test` locally (the real-structure baseline only runs where the dump is).
2. **Apple Developer Program enrollment** ($99/yr). Needed for Sign in with Apple, development builds on a real iPhone and TestFlight; approval can take a day or two. Then decide the **App Store bundle ID**, which is hard to change later: set it as `ios.bundleIdentifier` in `apps/app/app.json` (local Simulator builds use the placeholder `dev.procrastination.local` from `app.config.js` until then).
3. **Google Cloud OAuth client** for "Continue with Google". Google's slow verification only applies to Calendar scopes later.
4. **PowerSync account** (free tier) for the offline-sync spike.
5. **Confirm one real plan on the live site** (procrasti-nation.work). Still unconfirmed since Phase 0; plans have only been verified locally against staging.
6. **Before launch:** Vercel Pro (Hobby is non-commercial only) and a **privacy policy page** (required by the App Store; the site has none).
7. **At v2 merge (in this order):** production must already have `supabase/migrations/profiles_billing_1_before_deploy.sql` and `_2_after_deploy.sql` (the free-tier fix, shipped on `main` first; v2's site reads the subscription status through `my_subscription_status()`). Apply `supabase/v2/01_schema.sql` to production **before** the v2 site deploys (its plan route needs `plan_generations`, and `/api/unstick` needs `ai_requests`), then flip Vercel's Root Directory to `apps/site` at the moment `v2` merges. `02_backfill.sql` runs only at cutover, when the v1 pages retire. **Web Push:** generate a production VAPID pair (`node -e 'console.log(require("web-push").generateVAPIDKeys())'` in `apps/site`); set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=https://procrasti-nation.work` on the site's Vercel project and `EXPO_PUBLIC_VAPID_PUBLIC_KEY` on the app's; once the v2 site is live, in production's SQL editor run `select vault.create_secret('<CRON_SECRET>', 'push_cron_secret');` then `supabase/v2/03_push_cron.sql`. The app's Vercel project needs every path rewritten to `index.html` (a notification can open `/task/<id>` in a new tab).
8. **Auth emails.** In each Supabase project, check Authentication → Sign In / Providers → Email has **Confirm email** on (Alex's decision; it decides whether sign-up signs in at once). Then **custom SMTP (Resend).** Supabase's built-in email allows only a couple of auth emails per hour for the whole project, and its cap can't be raised. On staging that blocks testing (two magic links and the next one says "too many tries"); on production it would lock out real users, since v2 signs in by magic link. In each project: Authentication → Emails → SMTP Settings (host `smtp.resend.com`, port 465, user `resend`, password a Resend API key, sender on procrasti-nation.work), then raise Authentication → Rate Limits → emails per hour. Check whether production already has it before v2 launches.
8. **⚑ Before production: texted codes are hidden, decide and wire them (Alex, 2026-10-07).** "Text me a code" (save a passport, sign in) is built but hidden: it shows only when `EXPO_PUBLIC_AUTH_PROVIDERS` includes `phone` (staging's is `email`). Twilio now requires a paid account to create a Verify service, so it was parked. To turn it on: upgrade Twilio (card + starting balance; ~6¢ per successful code), create a Verify service with geo permissions US and Canada only, put its real Service SID in each Supabase project's Phone provider (staging has a placeholder `VA000…` and a test number `15555550100=123456`: remove the test number), add `phone` to `EXPO_PUBLIC_AUTH_PROVIDERS` in both the app's Vercel project and the iOS build, then check a real code end to end (iOS autofill too). Or decide to launch with email + password and Apple only.

9. **Whereby:** once the `main` PR that hides Focus Pods is merged and deployed, cancel the Whereby account and delete `WHEREBY_API_KEY` from Vercel.

Done: Xcode installed (27.0, license accepted, iOS 27 runtime); staging project created; staging redirect URLs added.

---

## 3. Decisions Alex made (don't re-ask)

| Topic | Decision |
|---|---|
| Ambition | Replace Apple **Notes + Reminders** on students' iPhones |
| Audience | **Students first.** Adults later: they won't adopt another thing to check on top of Teams, Outlook and Google Calendar |
| AI planner | **The Adherence Planner stays the core of the product.** It isn't the only way to add a task: simple things like "walk the dog daily 6pm" go in through non-AI quick add |
| Plan quality | Must stay solid. Sonnet builds plans; Haiku only for cheap jobs, and only with eval proof |
| Platform | **An App Store app is mandatory:** Expo (React Native) + Swift add-ons |
| Web | **100% feature parity with iOS.** Layout can adapt to the laptop, but every core feature exists on both |
| Notes | Capture-first notes, not a full Apple Notes clone |
| Schools / teachers | A relic of an idea to turn PN into an LMS; **not the path.** Ignore it (2026-10-06): no new work for teachers, classes or assignments. The priority is making the app production-ready for individual users |
| Theme | Logo stays. **Lean harder** into the nation theme (Passport, Stamps, Territories, Customs, Declarations, State of the Union, Residency, Holidays, Town Hall, Allies) |
| Focus Pods | **Dropped (2026-10-08).** Whereby video co-working wasn't core to the product, and moderating live video wasn't worth the liability. Removed from v2's site; a PR to `main` hides it there so Whereby can be cancelled. The `focus_pods` table goes with the other v1 tables at cutover |
| Town Hall | **A count only (2026-10-08):** an anonymous "citizens working right now" number (e.g. in Start Mode). No video, no chat, nothing one person can say to another |
| Rollout | Rebuild the UI on the `v2` branch; critical fixes go on `main` |
| Design | **A2 · Vintage Passport, refined** (section 7) |
| Copy | The button that generates an AI plan on a task reads **"Plan it"**. Alex rejected "Make it smaller" and "Want a plan?". The marketing line "Big tasks, made smaller by AI" and the "Made smaller by AI" tag on AI-built steps may stay |
| Git | Claude may commit and push feature branches (`v2`) directly; never push to `main` without asking |
| Staging | Gets production's **structure only**, never real users' data |

---

## 4. Technical decisions made along the way (and why)

- **Cutover strategy.** `01_schema.sql` is additive and safe on production any time; v1 ignores it. `02_backfill.sql` (steps JSONB → child rows) runs **only at cutover**, because v1 would show each step as its own task. `99_rollback.sql` restores v1 exactly. v1 columns stay until a later contract migration. All of this is tested on PGlite against both a stand-in and the real production structure, and rehearsed on staging inside rolled-back transactions.
- **`user_settings`, not `profiles`.** `profiles` is publicly readable (public profile pages) and requires a username, so private settings (Citizenship Application answers, timezone, rollover hour) live in an owner-only table keyed by `user_id`.
- **Citizen numbers.** Assigned by the database in signup order and immutable (enforced by a trigger). The app reads before inserting, and concurrent first loads share one request, because every insert attempt draws a sequence number.
- **`tasks.source` predates v2.** The schools feature uses `'self' | 'assignment'`, and a teacher RLS policy reads it. v2 widens it (`self, assignment, ai, syllabus, lms, reminders`) and never drops it; plan steps are `'ai'`, and parents keep their own source.
- **Free tier counts `plan_generations`.** Counting tasks broke once quick add arrived. The table is insert-and-read only, so a count can't be reset. Clarifying-question checks stay free.
- **Ownership triggers.** `list_id`, `task_id` and `parent_id` can't point at another user's rows; a foreign key alone would accept them. Nesting is one level deep.
- **Start Mode records.** Opening Start Mode is a Start: a `start_sessions` row is upserted whole on every change (writes for one session run in order, so a slow begin can't wipe the end). Outcomes: `done`, `stopped`, `kept-going` (left after the timer), `stuck` (restarted on a tiny action, which is a new session and a new start). The first Start ever earns `first-start` ("Officially started", unique per user); each Done earns `task-done`. Ranks count all starts.
- **"I'm stuck" is free** (Start Mode is the moat, not Pro) with a 20/day cap counted in `ai_requests` (insert and read only; the route logs before counting so parallel bursts can't slip under). Sonnet 5.5 at low effort beat Haiku 12/16 vs 8/16 on `evals/unstick` at ~2s, so Haiku isn't used.
- **Town Hall footer left out** of Start Mode until Town Hall exists: no made-up "12 citizens working" count.
- **Online-first data layer for now.** supabase-js with an optimistic store that rolls back on failure. It's written to be swapped for PowerSync if the spike succeeds.
- **Quick-add parser in `@pn/core`** (no dependencies, not chrono-node). The grammar is deliberately narrow so titles like "Call Tom", "Study for May exam" and "Problem set 2a" survive; times without am/pm use a heuristic; repeats produce RRULEs. Recurrence math lives in core too.
- **Core tests run with `node --test`** directly on TypeScript (Node 24), so core imports use explicit `.ts` extensions (allowed via `allowImportingTsExtensions`).
- **Sign-in:** PKCE magic links (the link must open in the requesting browser); the callback route handles every platform, with `detectSessionInUrl` off; providers are shown only if listed in `EXPO_PUBLIC_AUTH_PROVIDERS`; Apple uses the native button plus `signInWithIdToken` with a hashed nonce.
- **CORS** moved from `next.config.js` to `apps/site/middleware.js`, with an origin allowlist (the site's origin, `app.procrasti-nation.work`, and `localhost:8081` in development). Native iOS isn't subject to CORS.
- **Web output is `single`** (a single-page app) since the app sits behind sign-in; there's no static-rendering hydration flash.

---

## 5. Roadmap status

- **Phase 0 (fixes on `main`):** done and live. One open check: a real plan on the live site.
- **Phase 1 (design):** done; A2 locked.
- **Phase 2 (foundation):**
  - Done: monorepo restructure; `@pn/core`; Expo app scaffold; auth; data-model migration plus staging; AI service layer (done in Phase 0).
  - Remaining: **PowerSync spike** (needs Alex's account, and a development build since Expo Go can't load native modules); the `integrations` table (Phase 5).
- **Phase 3 (core app MVP), in progress:**
  - Done: Citizenship Application onboarding (with the Oath) and Settings; quick add; Today; Customs (inline); Passport v1 (ID page, real stamps and rank); Plan it; task detail (fields, steps, reorder, re-plan, delete + Undo); Upcoming (days, DUE markers, calendar, add to a day, Move to…); Territories (Customs, territories, filing, #tags, reorder); capture-first notes (live checklist lines, Task / Note in +); search; local notifications on iPhone (task times, timed deadlines, repeats, morning list; Done / Snooze / Start; the Reminders card); Web Push (checked end to end).
  - Done too (2026-10-07/08): the conversion funnel's phase 1 (`PN2-CONVERSION-PLAN.md`), passwords (`PN2-PASSWORDS-PLAN.md`), Download your data and Delete your passport (`PN2-ACCOUNT-PLAN.md`).
  - Done too (2026-10-08): the smarter "does this need a plan?" check (`packages/core/src/plan-offer.ts`): the title's lead verb first, so errands that mention schoolwork stay errands, plus the task's own signals (repeats, a short estimate, a note's checklist line). On titles it had never seen, it offered Plan it on 32 of 35 big tasks and on 0 of 46 small ones; the old keyword check went 29/35 and wrongly offered it on 17 of 46. It stays on the device (it runs on every keystroke in the + sheet, so an AI call there would cost per capture and arrive late).
  - Remaining:
    - payments (conversion phase 2): waits on the Apple Developer account (Alex's ID verification), RevenueCat and a privacy policy page
  - Then the TestFlight gate with 10 students.
- **Phase 4:** Start Mode done (timer, contract, I'm stuck, breather, Done → stamp, resume). Morning Briefing phase 1 done (2026-10-08, `PN2-MORNING-PLAN.md`: a card on Today sorts what carried over; phase 2 adds the morning notification's count and a recap). Remaining: Live Activity (Swift add-on, needs Apple Developer + a development build), Declarations, server push, State of the Union, Holidays, Town Hall (an anonymous count only).
- **Checked on iOS (2026-10-06, Expo Go, signed in):** Today, Start Mode (timer, resume after the app was killed, I'm stuck → `/api/unstick`, two-minute restart, Done → stamp, next step), Passport stamps and rank, the press-and-hold row menu, Upcoming (pinned week strip and scroll to a day, Move to… → When sheet, "+" → quick add for that day, day and night), Territories (cards, territory page, drag to reorder with real touch, File in… → picker → New territory…, day and night), Notes (☐ with the keyboard up, Return / Backspace, ticking, Close mid-line, the + sheet's Note side, day and night), and Search (magnifier, results with snippets, #chem chip, check off + Undo, a checklist line opening its note, day and night).
- **Reminders (local notifications) shipped** as planned in `PN2-NOTIFICATIONS-PLAN.md`, plus a Swift add-on for Done and Snooze with the app closed (see the plan's "Built" note). **Checked:** core tests (planning, repeats, the 64 cap, the morning list, reconciling, snooze, check-off); on the iOS development build (signed out, with a test reminder): it rings at its time, the buttons show (swipe the notification left, then View), Snooze with the app in the background rings again 10 minutes later, and Done with the app fully closed is kept by the add-on and picked up by the app when it opens; in Expo Go (signed in): the first-time ask and iOS's prompt, and the plan the scheduler builds from real tasks; the Reminders card on iOS (day and night) and web (phone and laptop, day and night), with the morning list saved on web showing on iOS. **Signed-in pass on the development build (2026-10-06):** signing in lined up Walk Biscuit's next 14 evenings; a new timed task rang at its minute; deleting one cancelled its reminder and re-timing one moved it; Done from the notification finished the task in the database (stamped with the moment it was pressed) once the app next ran; Start 5 min opened Start Mode on a five-minute timer; tapping a reminder opened its task; turning the morning list on scheduled 14 mornings and turning it off removed them.
- **Web Push, checked so far:** core tests (`remindersDue`: the window's edges, the morning list, a 9:00 AM repeat staying at 9:00 across the end of daylight saving in New York); database tests (one account per browser, keys required, the send log and snoozes closed to users, one claim per reminder); site unit tests (forged, tampered and expired snooze tokens refused; an unknown timezone refused rather than read as UTC; payloads carry Start 5 min and Snooze 10 min, never Done; long titles cut); the site builds with core imported; the schema is on staging; `03_push_cron.sql` rehearsed on staging and rolled back; the web export ships `sw.js`; in the browser pane the card's Blocked, Off and can't-ring states (the pane blocks notifications, so it can't subscribe) and the service worker registering.
- **Web Push end to end (2026-10-07, Google Chrome 154 on a throwaway profile driven by `apps/app/scripts/chrome-cdp.mjs`, signed in as Alex on staging, `push-cron-dev.sh` sending):** a real subscription on Google's push service, saved through `save_web_push`; a task rang at its minute (03:48) with the icon, its title and Start 5 min / Snooze 10 min, and the next run didn't send it again though it was still in the catch-up window; Start 5 min took the open tab to Start Mode on a five-minute timer; a plain click opened the task; Snooze queued a snooze that rang 10 minutes later with the same words and buttons, then was cleared; a task finished elsewhere before its time didn't ring and one moved from 3:55 to 3:56 rang at 3:56 only; the morning list rang ("Nine things today" / "Start with “Take notes on the alliances”.", no buttons) and its click opened Today; on the card, Turn off here removed the browser on the server and unsubscribed it (card: Off), Turn on subscribed and saved it again through the app's own path (card: On in this browser), and Sign out removed it; a subscription the browser had dropped came back "gone" from Google and the sender deleted its row. Clicks and buttons were fired through the service worker's own handler (Chrome can't click a macOS notification from the protocol). **Not exercised:** the browser's own permission prompt and the first-time ask on web (the test granted permission directly), Firefox and Safari, and the iPhone since the sign-out change (it now clears reminders before signing out; type-checked only). Staging was restored afterwards.
- **Onboarding, checked on web (2026-10-07, browser pane, signed in as Alex on staging, phone width, night theme):**
  - The Application end to end: School / Daytime / "It feels too big" / Drill Sergeant, each answer in `user_settings` as it was picked (morning time 8:00 from Daytime), the not-broken page after What stops you.
  - The Oath: "Study for chem midterm", In a week → the real planner (clarifying questions skipped) → 15 steps → Use this plan → Approved with "Your first small step is waiting on Today." Go to Today created the School territory, awarded `citizenship` once and set `onboarding_completed_at`; one `plan_generations` row.
  - The focused Today: just the next step and "Show everything (7 more)"; the Oath's steps are on the full agenda. **Fixed (`87c6ce9`):** Today's notices ("You started", Undo) lived inside the agenda, so the focused Today never showed them.
  - Start Mode in Drill Sergeant ("Two minutes. One task. The timer's running: begin." / "Two minutes. Mission started." / "You started. Logged.") and Roast ("…The task is more scared of you than you are of it." / "Two minutes. Who even are you?" / "You started. Frame it."); a 5-minute timer from Settings took effect.
  - Settings: tone, timer, Automatic (drops `startMinutes`) and Day ends at all landed in staging.
  - The APPLICATION / APPROVED stamp: 270pt on Approved, fits a 333px pane. **Fixed on Passport (`87c6ce9`):** the Count stamp's opaque fill hid the end of OFFICIALLY and the three stamps ran past the card below ~375px; slots now overlap at the rims only, the Count stamp is unfilled ink, and the page scales down to fit (0.82 at 333px, 0.95 at 375px, full size at 402 and on laptops). **Fixed (`bca5ef6`, Alex):** the date on a round stamp sat far inside the ring and crowded APPROVED / STARTED; it now sits as far inside the ring as PROCRASTINATION does.
  - **Decided (Alex): leave as is.** With an older plan due sooner (the WWI paper, Fri), Today's next step is that plan's, not the Oath's (nearest deadline first), so the focused Today hides the Oath's first step behind "Show everything". A new citizen has only the Oath's plan.
  - Test Starts were deleted afterwards; the test Settings were put back; then the Application was reset to fresh (the chem plan kept).
- **Onboarding, checked on the iPhone (Expo Go, 2026-10-07, Alex going through it himself):** Life admin → Home territory; Night owl → day ends at 3 AM, morning time 10:00; the Oath ("clean my room", today) planned and accepted; Go to Today awarded `citizenship` once; Passport shows all three stamps laid out right. **Fixed (`8890c13`):** without APPROVED, the count stamp took the second round stamp's slot and covered OFFICIALLY; it now always lands just clear of the last round stamp. **Unexplained:** at 1:12 PM a Skip landed on Alex's reset Application from the web app in the browser pane, which nobody remembers tapping (only the Skip button writes that state; possibly a stray click in the shared side panel). The phone run afterwards, with the web app closed, was clean.
- **Passwords (built 2026-10-07, `PN2-PASSWORDS-PLAN.md`):** phases 1 and 2 are in; the live checks (a real password, a throwaway sign-up, a reset) need Alex, then phase 3 polish.
- **Onboarding that converts (approved 2026-10-07, `PN2-CONVERSION-PLAN.md`):** Alex's decisions after weighing Prayer Lock's funnel against PN: a required 7-day trial (payment method up front; cancelling keeps the free tier), the free tier at 2 plans per 30.5 days from account creation, existing accounts offered the trial but free to skip, relief not shame, an anonymous passport through the funnel with Save your passport after the trial, and "Text me a code" (Twilio Verify, US and Canada first) to save it and to sign in. Phase 1 (the funnel) needs no Apple account; phase 2 (payments) does. **Phase 1 built 2026-10-07** (`f0422e4` server limits, `a25def5` the funnel; what's checked and what needs Alex's live run are in the plan). Anonymous sign-ins are on in staging; Twilio Verify for the phone provider is Alex's next step.
- **Account deletion and data export (built 2026-10-08, `PN2-ACCOUNT-PLAN.md`):** Settings → Account → Download your data (one JSON file: share sheet on iPhone, download on web) and Delete your passport (type DELETE; `/api/account/delete` cancels a Stripe subscription first, then deletes the auth user; every table cascades, proven by a migration test on both structures). **Alex's live check:** delete a throwaway passport (e.g. citizen #000005 in the browser pane at `127.0.0.1:8081`) and confirm it lands on Welcome with the note and its rows are gone. Later: App Store subscriptions can't be cancelled for them (the sheet needs the "cancel in Settings → Apple ID → Subscriptions" line with payments), and Sign in with Apple needs its token revoked on deletion.
- **Next:** payments once the Apple Developer account works; meanwhile the Morning Briefing's phase 2 (or Declarations).
- **Web Push limits:** the sender loads every subscribed person's timed tasks each minute (and everything for those with something due); fine for now, but at thousands of subscribed people, store each person's next ring time instead. Chrome, Edge and Firefox only ring while the browser is running. A snooze whose send fails is dropped (reminders themselves are retried within the 10-minute catch-up).
- **Known rough edges:** picking a day near the end of Upcoming can't lift it to the top (the list ends a few days later). v1 boards (`localStorage['task-boards']` on procrasti-nation.work) can't be read from the v2 app's origin: bring them over from the v1 site at cutover, or let them go.
- **Reminders' known limits:** each iPhone schedules from what it last saw, so a task finished on the web can still ring on the phone until the app is next opened (server push fixes this); a Done pressed from a notification is kept on the phone at once but reaches the database when the app next runs, because iOS suspends the app right after the tap (closed or in the background alike; a Done the server refuses is dropped rather than blocking the rest); the morning list setting is saved as part of `preferences` (last write wins across devices, fine while it's the only setting there).
- **Known gap:** no live sync between devices yet; each device refreshes on foreground and day change (PowerSync spike pending). For notes this means the last device to save a note's body wins.
- **Search speed:** each search scans only the person's own rows (Postgres can't use a full-text index under RLS). On staging: ~40–100 ms for a typical search in a 10,000-task account, ~300 ms for a word matching 9,000 of them. If accounts grow far past that, store tsvectors in generated columns (or move to a `SECURITY DEFINER` function with an index on user + tsvector).
- **Notes rough edges:** keys typed within a few milliseconds of Return in a checklist line can land in the old line before focus moves (seen only with the simulator's burst typing, not at human speed). On web the nav bar needs 328px, so a 320px-wide window scrolls sideways by 8px.

---

## 6. Phase 0: shipped to production (`main`)

Commits on `main`: `df426dd`, `e79f893`, `6acd10b`, `7623c37`, `bc120c2`, plus `94763ed` (Next 14.2.35 security patch, made in a separate session). They were rebased on top of 11 newer remote commits by Alex, whose decisions were kept: 10-day trial, **free limit of 3 plans a month**, and the spotlight digest email design.

- **AI outage fixed.** `claude-sonnet-4-20250514` had been retired and returned "not found", so every AI feature was down. `lib/ai.js` provides `callClaude()` and `resolveToday()`:
  - `callClaude()`: raw fetch, structured JSON output via `output_config.format`, refusal and truncation handling, and `fallbacks: "default"` on Sonnet 5.5 with the `server-side-fallback-2026-07-01` beta header.
  - Models: `MODELS.plan = claude-sonnet-5-5` for plans, clarifying questions and syllabus parsing, with `PLAN_EFFORT = 'medium'`; `MODELS.fast = claude-haiku-4-5` for step dates and the weekly pep talk.
- **Prompts** live in `lib/prompts/plan.js` (the "v3" plan prompt) and `lib/prompts/dates.js` (with a 14-day weekday lookup table). The step-dates route clamps every date to fall between today and the due date.
- **Plan-quality eval** is in `apps/site/evals/plan-quality/` (`npm run evals` from the root): 30 cases with today fixed at 2026-09-30, and a Sonnet grader. About $1 per full run; it gates any prompt or model change.

  | Config | Pass | Overall | First step | Timing |
  |---|---|---|---|---|
  | Haiku, original prompt | 2/30 | 2.87 | 2.33 | 3.03 |
  | Sonnet 5.5 medium, original | 20/30 | 3.73 | 2.93 | 3.57 |
  | **Sonnet 5.5 medium, v3 (live)** | **27/30** | **3.93** | **4.23** | **3.60** |

- **Other fixes:**
  - Pro subscribers were no longer blocked by the free limit (profile lookup uses `.eq('user_id')`).
  - Local dates everywhere (`lib/dates.js`).
  - Drag-reordered steps are saved.
  - Signed one-click unsubscribe and `List-Unsubscribe` headers; crons skip opted-out users; migration section 8 was run by Alex.
  - The fake social proof and unbuilt Pro features were removed.
  - Icon, share image and `metadataBase` were added.
  - `NEXT_PUBLIC_BASE_URL` was fixed to `procrasti-nation.work`.

---

## 7. Design direction A2 (locked)

- **Canvas:** https://claude.ai/artifact/9zBPQwmDCUNtrQuumqrrg1 (rows A, **A2**, B and C; read it with the Artifact tool to recover the screen sources). Screens: Landing (desktop), Today (day and night), Start Mode, Passport.
- **Figma inspiration:** https://www.figma.com/make/9IWr6VIpOgDLXo7WiMq8tg/Improve-ProcrastiNation-Design. Figma shows a sign-up wall to logged-out visitors. Workaround: in the browser, run JS to set `location.href` to the `iframe[title="Preview"]` src (its token expires in 60s), then open the preview with `preview_start`.
- **Tokens** live in `packages/core/src/tokens.ts`. The night values for violet and the passport page are inferred; the canvas didn't draw them. Key values:

| Role | Light | Night ("night passport") |
|---|---|---|
| Background | `#F5F1E8` + faint 135° security lines | `#161B2E` + gold-tinted lines |
| Ink / muted | `#232A45` / `#5C6070` | `#ECE6D8` / `#A7AABB` |
| Primary (forest) | `#3A6B52`, text `#2F5A44` | `#7CC3A0`, text `#9AD4B6` |
| Next-step card | sage `#E4EADD` | `#1D2B28` |
| Stamp inks | terracotta `#A8513B`, slate violet `#5E5D8F`, forest | terracotta `#E08A70` |
| Accent | `#9A7B3C` (sun icon) | gold `#D4B26A` |

- **Type:** Fraunces 500 (italic for emphasis) for headings, Instrument Sans for body, IBM Plex Mono for labels (at least 10.5px). The logo wordmark is Space Grotesk 700 with a −5° skew; the flag gradient is unchanged.
- **Motifs:**
  - the ticket-style next-step card with a dashed stub and a round Start button
  - SVG stamps with curved rim text
  - the passport code line `000042<2026<ONE<STEP<AT<A<TIME`
  - bilingual ID labels
  - a tilted STAMPED mark on done tasks
  - the tab bar: Today · Upcoming · (+) · Territories · Passport
- **Voice:** warm and gentle; the nation theme lives in names, places and rewards; buttons stay plain. All copy lives in `@pn/core` (`names`, `actions`, `voice`).

---

## 8. Setup decisions

1. **Separate dependencies per project** (not an npm workspace): the site needs React 18 and Expo SDK 57 needs React 19. `packages/core` is imported through the `@pn/core` tsconfig alias plus Metro `watchFolders`. Revisit if the site moves to Next 15 and React 19.
2. **Styling:** React Native `StyleSheet` with typed A2 tokens (`useTokens()` / `useStyles()`), not NativeWind. Never hard-code a hex in a component.
3. **Vercel:** Root Directory → `apps/site` must flip **at the moment `v2` merges** (the setting applies to every branch). For live previews before then, Alex can create a second Vercel project with production branch `v2`. The Expo web app gets its own project at `app.procrasti-nation.work`.
4. **Env files** (all gitignored):
   - `apps/site/.env.local`: production secrets for the site.
   - `apps/site/.env.development.local`: points `next dev` at **staging** Supabase, plus development VAPID keys and staging's service-role key (for the Web Push sender and Snooze route).
   - `apps/app/.env.local`: public values only, pointing at staging (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AUTH_PROVIDERS`, `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_VAPID_PUBLIC_KEY`). **The Expo app never holds secrets**; it calls the site's `/api/*`.
   - `supabase/v2/.env.staging`: the staging database URL (owner-only file).
   - `supabase/v2/.local/prod-schema.sql`: production's structure dump.

---

## 9. The schools feature (decided: ignore)

The production dump showed tables the plan never mentioned: `organizations`, `org_memberships`, `classes`, `enrollments`, `class_invites`, `assignment_templates` and `assignments`, plus `reset_sessions`, and an RLS policy letting teachers see students' assignment tasks. Alex decided on 2026-10-06 that this LMS direction is a relic and not the path forward: build for individual users and spend no effort on it. The v2 migration still leaves those tables and the policy untouched (dropping them would be a separate, deliberate decision).

---

## 10. Practical notes and gotchas

- **Node** comes from nvm: `export PATH="$HOME/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin:$PATH"` (Node 24).
- **Stray dev servers:** previous sessions can leave Expo running on 8081/8082 (watch mode, so they serve current code). The browser pane can use them: if `preview_start {name: "app-web"}` refuses 8081 because another chat holds it, open it with `preview_start {url: "http://localhost:8081"}` instead.
- **Expo dev server:** don't run it with `CI=1`; that disables file watching, and it serves a stale build (this showed the old "Maya" screen once). After an env change, restart the server, since `EXPO_PUBLIC_*` values are compiled in. In Expo Go, re-opening the same URL resumes the cached bundle; run `xcrun simctl terminate booted host.exp.Exponent` first.
- **Expo Go lacks the Apple Authentication native module** on SDK 57, despite what the docs say. Apple sign-in (and PowerSync) need a development build.
- **Staging DB work:** run SQL with `/opt/homebrew/opt/libpq/bin/psql "$STAGING_DB_URL"` after `set -a; . supabase/v2/.env.staging`. Rehearse writes inside `BEGIN … ROLLBACK`, but remember that **sequence numbers aren't rolled back**: never test `user_settings` inserts that way, or citizen numbers get burned.
- **Re-dump production's structure** with `supabase/v2/scripts/dump-prod-schema.sh` whenever it changes, so the migration tests keep checking against reality.
- **Don't use the production service-role key** for exploration; ask first.
- **Typed routes** regenerate while the Expo dev server runs; a fresh `tsc` may flag new routes until then.
- **Browser pane viewport emulation:** with a custom size (e.g. 1100 wide in a narrow pane), clicks by coordinate and by ref miss; test laptop-width interactions at the pane's own size or check them through the DOM. The pane also can't draw (or click) while Claude's window is hidden; the iOS Simulator tools still work. Drags (`left_click_drag`, synthetic pointer events) don't reach react-native-gesture-handler on web, so test drag-to-reorder on the iOS Simulator with `touch_path`. The simulator's `text` action types faster than a person, so a trailing newline can submit before the input's state catches up (truncated titles are a test artifact).
- **Web text fields (React Native Web):** a multiline TextInput renders a textarea that defaults to 2 rows (`oneRowOnWeb`), shows a focus outline unless `outlineStyle: 'none'` (`noFocusRing`), and never shrinks on its own (`useAutoHeight`). TextInput also stops keydown from bubbling, which is why `useShortcuts` listens in the capture phase. On iOS, `focus()` puts the caret at the end, on web at the start: place it with `setSelection` / `setSelectionRange` (see `placeCaret` in the note editor). Screens use `keyboardShouldPersistTaps="handled"`, so tapping a button with the keyboard up does **not** blur the field: don't rely on `onBlur` to save.
- **Supabase returns at most 1,000 rows per request** (the API's Max rows). A list cut off there fails silently: with 1,050 old ticked checklist lines in an account, Today lost its newest tasks. Fetch anything that can grow with `fetchAllPages` (`apps/app/src/data/paging.ts`), and keep the always-loaded data to what's on the go.
- **Full-text search and RLS:** a GIN index on `to_tsvector(...)` is never used for a query under RLS, because `@@` isn't leakproof (check `pg_proc.proleakproof`). Bound such queries with an explicit `user_id = auth.uid()` (uuid `=` is leakproof, so the user index serves it).
- **Staging test data:** give test rows ids with a recognizable prefix (e.g. `5ea4c000-…`, hex only) so cleanup can soft-delete exactly them (`where id::text like '5ea4c000-%'`) without touching Alex's own data. Restore Alex's account to his own tasks afterwards (17 live tasks, no notes or territories, as of this handoff).
- **Testing tools:** the browser pane's `type` with a multi-line string doubles text in React Native Web textareas; type each line and press Return between them. iOS Simulator screenshots taken right after a tap can show the screen before it reacts; wait a second. Expo Go's floating gear button sits over the top-right corner (where the magnifier is): drag it away with `touch_path` (press, hold 300 ms, move). When the browser pane is hidden it can't take screenshots or clicks: `form_input`, `find` and DOM checks still work.
- **macOS shell:** `sed` lacks `\|` alternation (use `-E`), and parallel shell calls can race on the working directory, so use absolute paths.
- **Site ESLint** was never configured (`npm run lint` opens a setup prompt); use `npm run build` to check the site. The build prints "Dynamic server usage" logs from the friends routes; that's harmless noise.
- **Git:** commits use the noreply author email and still auto-deploy. Pushing `main` deploys to production. Avoid interactive history rewrites.
- **Crons:** nudge digest daily at 14:00 UTC; weekly report Mondays at 13:00 UTC; both need the `CRON_SECRET` bearer token. The Web Push sender runs every minute from Supabase Cron (`03_push_cron.sql`), since Vercel's cron runs once a day.
- **A password change signs out the account's other sessions** (Supabase). Setting a password on one device sends every other device back to sign-in.
- **Claude doesn't open anonymous passports on staging** (that creates an account on a remote service), so the signed-in half of the funnel is Alex's to run: test the signed-out pages at `127.0.0.1:8081` (its own storage, signed out), and stop before answering "Where did you hear about us?".
- **Never test Sign out on Alex's account with supabase-js's default.** `signOut()` without `{ scope: 'local' }` revokes every session (the app now passes `'local'`). A revoked session keeps working against the database until its access token expires (up to an hour), but the site's routes refuse it at once (`/api/generate-plan` fails), and then the device falls back to sign-in.
- **Web Push testing:** the Claude browser pane blocks notifications (`Notification.permission` is `denied`) and has no push service, so it can't subscribe. For end-to-end checks, start Google Chrome with its own throwaway profile and `--remote-debugging-port=9333` and drive it with `apps/app/scripts/chrome-cdp.mjs` (grant notifications, read shown notifications, fire the service worker's click handler, click the app's buttons, screenshots); Claude in Chrome works too when it's connected. A profile from an earlier session may still be signed in. Run `sh apps/site/scripts/push-cron-dev.sh` (in the background) as the sender. Other card states can be seen in the pane by stubbing `Object.defineProperty(Notification, 'permission', { get: () => 'default' })` and firing `visibilitychange`. Next's dev server and Expo reload env files on change, but restart them if a new variable doesn't show up.
- **Simulator input quirks (from the reminders pass):** a tap on a native switch (the morning list) doesn't register; drag across it with `touch_path`. A tap on a notification in Notification Center doesn't open it: swipe it right and tap **Open** (that's the plain tap's action). Stacked notifications expand on the first tap. Typing more than ~10 characters at once drops some; type in short chunks. To see what the app scheduled or cancelled without debug code: `xcrun simctl spawn booted log show --last 1m --style compact --predicate 'process == "ProcrastiNation" AND eventMessage CONTAINS "notification request"'` (lines "Adding notification request" / "Removing N pending notification requests").
- **Notifications on the Simulator:** Expo Go can't schedule them on iOS 27 (SpringBoard logs "Dropping records because local client does not exist"); use the development build (`apps/app/scripts/ios-dev-build.sh`). A press and hold on a notification acts as a swipe in the Simulator: swipe it left and tap **View** to see its buttons. `xcrun simctl ui booted appearance dark|light` switches day and night. The add-on's waiting Dones can be read with `plutil -p "$(xcrun simctl get_app_container booted dev.procrastination.local data)/Library/Preferences/dev.procrastination.local.plist"`. The unsigned development build shows a red "[expo-notifications] Error reading persisted server registration info" toast on launch (no keychain access without signing; harmless until the Apple account exists).
- **iCloud Desktop:** the repo sits in iCloud Drive, which tags new files with attributes that break Xcode code signing, and would upload gigabytes of build output: never leave a generated `apps/app/ios` folder in the repo (the build script works in `~/Library/Caches/procrastination-ios`).
- **Before committing,** follow the `agents/*.md` guides: code review before each commit, security review after API or auth changes, database review for SQL, and doc-updater after shipping.
