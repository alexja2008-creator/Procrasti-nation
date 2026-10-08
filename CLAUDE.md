# ProcrastiNation – Claude Code Guide

## Repo Layout (v2 branch)
ProcrastiNation 2.0 is being rebuilt on the `v2` branch (`main` still has the old root layout and is what production deploys). On `v2`:
```
apps/site      # The Next.js app described below (moved here unchanged): marketing site + /api/* backend
apps/app       # NEW Expo SDK 57 app (expo-router, TypeScript) → App Store + web. See apps/app/README.md
packages/core  # Shared, dependency-free TS: A2 tokens, nation naming/voice, date helpers, data types (@pn/core)
```
- **Not an npm workspace.** The site is on React 18 and the Expo app on React 19, so each app has its own `node_modules`; `packages/core` is imported by `apps/app` through the `@pn/core` tsconfig alias plus Metro `watchFolders`. Root `package.json` only holds convenience scripts (`npm run site:dev`, `app:web`, `app:check`, `evals`).
- **The Expo app never holds secrets.** It gets only `EXPO_PUBLIC_*` values (see `apps/app/.env.example`; real values in gitignored `apps/app/.env.local`) and calls `apps/site`'s `/api/*` routes for anything needing a key.
- **v2 auth:** someone new answers the Citizenship Application signed out and gets an **anonymous passport** (Supabase anonymous sign-in, needs "Anonymous sign-ins" on in the project) on the way to the Oath; they **save it** later with a username plus a texted code (Twilio Verify via Supabase's phone provider; US and Canada) or an email link then a password (the username waits in `user_metadata.pending_username` until the email confirms; `ensureProfile` makes the `profiles` row once they're not anonymous). Existing accounts sign in with email + password (Supabase Auth keeps the hashes; v1 passwords work as they are), a texted code, or a magic link (each for existing accounts only; an unknown address or number hears the same "on its way"). Changing a password signs out the account's other sessions (Supabase). Forgot password (the reset link's `PASSWORD_RECOVERY` sends the callback to `auth/new-password`), a magic link for existing accounts only (PKCE; an unknown address hears the same "on its way"), Sign in with Apple (native on iOS via `signInWithIdToken` + nonce; OAuth on web), Google (OAuth). Supabase Auth's redirect allow list must include every callback form: `procrastination://auth/callback`, `exp://**` (Expo Go), `http://localhost:8081/auth/callback`, and the production web URL. Expo Go lacks the Apple native module, so Apple sign-in needs a development build.
- **v2 → site API:** the app calls `apps/site` `/api/*` with the Supabase access token (`src/lib/api.ts`). CORS lives in `apps/site/middleware.js` (allowlist: the site's origin, `app.procrasti-nation.work`, and `localhost:8081` / `127.0.0.1:8081` in development; the second is the same app under its own storage, a signed-out window for testing). For local work, `apps/site/.env.development.local` (gitignored) points the site at the staging Supabase project so it accepts staging sessions.
- Everything below this section describes `apps/site` unless it says otherwise; paths are relative to `apps/site/`.

## Project Overview
AI-powered productivity SaaS that helps users overcome procrastination via:
- AI task breakdown with step editing, scheduling, and recurrence
- Syllabus upload — auto-extract assignments from PDF/DOCX/image
- Calendar views (day/week/month) with AI-resolved step dates
- Kanban boards for task organization
- Reset station (wellness videos)
- Metrics dashboard with streaks, completion rates, and archive
- Email nudges + weekly citizen reports
- Interactive onboarding tutorial for new users

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript/JSX
- **Styling**: Tailwind CSS 3 (class-based dark mode)
- **Icons**: Lucide React
- **AI**: Anthropic Claude API (raw `fetch()` — not the SDK)
- **Auth + DB**: Supabase (Auth + PostgreSQL with RLS)
- **File Parsing**: mammoth (DOCX), unpdf (PDF), base64 (images → Claude vision)
- **Email**: Resend
- **Analytics**: Vercel Analytics
- **Hosting**: Vercel (Hobby tier)
- **Domain**: procrasti-nation.work

## Dev Commands
Site (run inside `apps/site`):
```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm start        # Run production build
npm run lint     # ESLint (never configured; opens an interactive setup, so use build to check)
```

App (run inside `apps/app`):
```bash
npx expo start --web            # Web at http://localhost:8081
npx expo start --ios            # iOS Simulator in Expo Go (needs Xcode, license accepted)
npx tsc --noEmit && npx expo lint
npx expo install <pkg>          # Always, instead of npm install, for SDK-compatible versions
sh scripts/ios-dev-build.sh     # iOS development build on the Simulator (notifications, Swift add-ons); METRO_PORT=… for another Metro
```
Web Push in development (run inside `apps/site`): `npm test` (push helpers), and `sh scripts/push-cron-dev.sh` calls the local sender every minute (Supabase Cron does it in production). The sender and the Snooze route need the **staging** service-role key in `.env.development.local`. The browser pane in the Claude app has no push service (notifications are blocked there), so end-to-end checks use a real Chrome at `localhost:8081`: a throwaway profile started with `--remote-debugging-port=9333` and driven by `apps/app/scripts/chrome-cdp.mjs`.
Expo Go can't schedule local notifications on iOS 27 (SpringBoard drops them), so reminders need the development build. `npx expo run:ios` fails inside this repo because the Desktop is synced with iCloud (its file attributes break code signing); the script builds a copy in `~/Library/Caches/procrastination-ios` instead, without the Sign in with Apple entitlement and unsigned until the Apple Developer account exists. `app.config.js` gives local builds a placeholder bundle id (`dev.procrastination.local`) until the real one is chosen; `plugins/with-scene-lifecycle.js` adopts the scene life cycle iOS 27 requires (SDK 57's generated app delegate doesn't).

Note: nvm is installed. If node isn't found, run:
```bash
export PATH="$HOME/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin:$PATH"
```

## Environment Setup
Requires `apps/site/.env.local` (Next only reads it from its own folder) with:
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://tmigxhhnhledszjdgnwk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key
RESEND_API_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=service_role_key
CRON_SECRET=secret_for_cron_auth
NEXT_PUBLIC_BASE_URL=https://procrasti-nation.work
VAPID_PUBLIC_KEY=...          # Web Push (v2); generate: node -e 'console.log(require("web-push").generateVAPIDKeys())'
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=https://procrasti-nation.work
```
The Expo app gets the same public key as `EXPO_PUBLIC_VAPID_PUBLIC_KEY`. Development keys live in the gitignored `apps/site/.env.development.local` and `apps/app/.env.local`; production needs its own pair in both Vercel projects.

## Project Structure
```
app/
  page.jsx                          # Landing page (hero + pricing + features)
  layout.jsx                        # Root layout (AuthProvider + ThemeProvider)
  providers.jsx                     # useTheme() + useAuth() context providers
  planner/page.jsx                  # AI task planner (main feature)
  dashboard/page.jsx                # Metrics, boards, task list, archive
  calendar/page.jsx                 # Day/week/month calendar views
  syllabus/page.jsx                 # Syllabus upload & AI parsing
  reset-station/page.jsx            # Wellness videos (YouTube embeds)
  faq/page.jsx                      # FAQ with collapsible Q&A sections
  api/
    generate-plan/route.js          # AI task planning (clarify + generate steps)
    parse-syllabus/route.js         # Syllabus file → JSON assignments
    account/delete/route.js         # v2 Delete your passport: session + typed DELETE, cancels a Stripe subscription that still bills (fails closed), then auth.admin.deleteUser (every table cascades)
    unstick/route.js                # v2 Start Mode "I'm stuck" → one 2-minute action (free, 20/day via ai_requests)
    resolve-step-dates/route.js     # Relative timing → absolute calendar dates
    cron/nudge/route.js             # Daily nudge digest (one email per user) + missed-commitment nudges
    unsubscribe/route.js            # Signed one-click unsubscribe (reminders / reports)
    cron/push/route.js              # v2 Web Push sender, every minute (Supabase Cron): what came due per person, in their timezone, to each of their browsers
    push/action/route.js            # v2 Snooze 10 min from a web notification (signed token, no session)
    cron/weekly-report/route.js     # Monday weekly progress digest

components/
  Navigation.jsx                    # Top nav bar with trial badge + auth
  AuthModal.jsx                     # Sign in / sign up modal
  TutorialModal.jsx                 # 7-step interactive onboarding overlay
  UpgradeModal.jsx                  # Pro upgrade prompt (limit/trial reasons)
  Logo.jsx                          # Logo component
  CalendarWeekGrid.jsx              # Week view grid
  CalendarMonthGrid.jsx             # Month view grid
  CalendarDayGrid.jsx               # Day view (hourly timeline)
  CalendarEventPopover.jsx          # Click-to-edit step date popover

lib/
  ai.js                             # callClaude(), model constants, resolveToday()
  prompts/plan.js                   # Adherence planner prompts + JSON schemas
  prompts/unstick.js                # "I'm stuck" prompt + schema (gated by evals/unstick)
  prompts/dates.js                  # Step "when" → calendar date prompt
  dates.js                          # Local-date helpers (localDateString, localTimeZone)
  trial.js                          # trialDaysRemaining(user): 10 days from auth created_at
  stripe.js                         # cancelCustomerSubscriptions (fetch, no SDK)
  unsubscribe.js                    # Signed unsubscribe links + List-Unsubscribe headers
  core.js                           # Re-exports @pn/core (packages/core TS; Next compiles it), so the server plans exactly as the app does
  push.js                           # Web Push: send (web-push + VAPID), payloads (Start 5 min / Snooze 10 min, never Done), withTimeZone, snooze tokens
test/push.test.mjs                  # npm test: snooze tokens, the zone switch, payloads
scripts/push-cron-dev.sh            # Development stand-in for Supabase Cron
  supabase.js                       # Supabase client (anon key)
  storage.js                        # localStorage wrapper (legacy, still used for boards/resets)
  emails.js                         # Email templates (nudge + weekly report)
```

### apps/app (Expo, v2)
```
src/app/_layout.tsx               # Root Stack: A2 fonts, AuthProvider; AppStack's Stack.Protected gates: sign-in, then the Citizenship Application until `onboarding_completed_at` (a settings load error never traps anyone), Plan it reachable from both
src/app/welcome.tsx               # The Citizenship Application (onboarding; PN2-CONVERSION-PLAN.md): Welcome → Purpose → Hours → What stops you → "you're not broken" → Nudge tone → Your result → How PN helps → Where did you hear (signed out so far: application/new-applicant, answers on the device) → the anonymous passport opens → the Oath (the real Plan it, ?oath=1) → Your first week → a morning nudge → APPROVED stamp → Save your passport (anonymous only); each answer saved as picked, resumes where left, Skip (signed in) counts as done
src/app/settings.tsx              # Settings (sliders on Passport): the Application's answers, Start Mode timer, Day ends at, the Reminders card, Account (Username, Password: set or change with no email, Download your data, Delete your passport (settings/delete-sheet), Sign out)
src/app/sign-in.tsx               # For existing accounts: password (Forgot your password?), a texted code (sign-in/phone-sign-in), a sign-in link, Apple + Google (each method only if in EXPO_PUBLIC_AUTH_PROVIDERS); "New here?" starts the Application
src/app/auth/callback.tsx         # Where magic links / confirmations / resets / OAuth land; exchanges the PKCE ?code= (a reset goes on to auth/new-password)
src/app/auth/new-password.tsx     # Choose a new password after a reset link (signed in, Application or not)
src/auth/                         # auth-provider (session; `recovering` after a reset link; makes the profile from `pending_username` once not anonymous), passport (open the anonymous passport; save it by texted code or email link; sign in by texted code; the choose-a-password flag), sign-in actions (password, reset, link; `friendlyAuthError` via core's `authErrorKind`), apple(.web).ts, sign-out (this device only: supabase-js's default `signOut()` is global and would sign them out of every device; reminders stop first)
src/lib/supabase.ts               # Anon-key client (PKCE, AsyncStorage, foreground-only token refresh)
src/app/plan/[id].tsx             # Plan it: clarifying questions → plan preview → saves steps as child tasks
src/app/task/[id].tsx             # Task detail (tap a row): title, When/Due/Repeat/Estimate/Territory, steps (add, drag to reorder), notes, delete + Undo; autosaves
src/app/territory/[id].tsx        # A territory's page on phones (`customs` for Customs, `notes` for Notes): Coming up, Anytime, then its notes; "+" captures into it; Edit
src/app/search.tsx                # Search (magnifier on Today / Upcoming / Territories; ⌘K or / on web): open and finished tasks and notes from the server as you type, "#chem" narrows (chip), check off with Undo, highlighted snippets, Show more; a panel over the page at laptop width on web
src/app/note/[id].tsx             # A note (modal; `new` + ?list= to start one): territory chip, title, body of text and live checklist lines (☐, or ⌘⇧L on web); autosaves; an emptied note goes quietly; delete + Undo
src/app/start/[id].tsx            # Start Mode (full-screen): timer, 5-min contract, I'm stuck, breather, Done → stamp; ?minutes= sets the timer (a reminder's Start 5 min)
src/hooks/use-start-session.ts    # Start Mode session: clock, start_sessions rows, resume after close, keep-awake
src/hooks/use-drag-reorder.ts     # Drag-handle reordering (steps, territories): one row written per move, VoiceOver Move up/down
src/hooks/use-check-off.ts        # Check off on lists that hide finished items (Upcoming, territories): offers Undo
src/hooks/use-search.ts           # As-you-type search: three groups after a pause, stale answers dropped, Show more; found tasks join the task store (to check them off)
src/hooks/use-auto-height.ts      # Multiline inputs that grow and shrink with their text (web textareas only grow on their own)
src/hooks/use-username-check.ts   # Whether a username is free, a moment after typing stops
src/hooks/use-passport-status.ts  # Unsaved passport? Owes the password that finishes saving it? (refreshes the session while a save link is out)
src/data/                         # account (Download your data: one JSON file built on the device via core's buildExport; Delete your passport: the route, then forgetDeletedAccount), user-settings, application-draft (the Application's answers before a passport), profile (usernames on v1's public `profiles`), tasks (+ store), lists (+ store: territories), notes (+ store: pages of 25 per scope, server counts), note-titles, paging, search, plans, starts, stamps, unstick, active-start, signed-in-providers
src/lib/web-styles.ts             # noFocusRing, oneRowOnWeb, switchThumbOnWeb: web-only fixes (casts; RN's types lack them)
src/notifications/                # Reminders: reminders-provider (sync after a pause in changes and on foreground, the first-time ask, opens what a tap / Start 5 min asks for, Turn off here on web, clears on sign-out), scheduler (iOS: reconciles pending notifications with core's `reminderChanges`; web: keeps the browser subscribed, the server sends), responses (iOS: Done / Snooze / Start / tap, each once, Dones wait in an outbox until saved; web: clicks the service worker posts), buttons (the `task` category), permission (web: allowed + push service reachable + not turned off here), web-push (subscribe / save via `save_web_push` / unsubscribe), time-given (the store says a task got a time)
public/sw.js                      # Web Push service worker (plain JS, served at /sw.js): shows reminders; click → the task (morning list → Today), Start 5 min → Start Mode, Snooze 10 min → the site's /api/push/action; no Done on the web (Alex). public/notification-icon.png
modules/reminder-actions/         # Swift add-on (local Expo module): with the app closed iOS hands Done and Snooze to native code only (JS never starts without a window), so it schedules Snooze itself and keeps each Done in UserDefaults until the app opens
src/lib/api.ts                    # apiPost() to apps/site with the session token
src/lib/save-file(.web).ts        # a file for the person: the share sheet on iPhone (expo-file-system + expo-sharing), a download on web
src/app/(tabs)/_layout.tsx        # Headless expo-router/ui tabs + custom NavBar
src/app/(tabs)/index.tsx          # Today: the Morning Briefing card (components/briefing: what carried over from before today, each given a place: Today / Pick a day / Let it go, a behind plan Re-spread; Not now for the day), next step (or "Up next"), agenda, Customs (style "overwhelmed": just the next step + "Show everything (N more)" for that visit); tap a row → detail, press and hold / right-click → Start / Plan it / Move to… / File in…
src/app/(tabs)/passport.tsx       # Passport: citizen no., stamps, rank from real starts; the sliders open Settings (where the Reminders card and Sign out live)
src/app/(tabs)/upcoming.tsx       # Upcoming: 7 days, then busy days to 8 weeks, then Later; DUE markers; week strip (pinned) + Month toggle on phones, month calendar beside the list at ≥900px; pick a day → scroll; "+" per day → quick add for that day
src/app/(tabs)/territories.tsx    # Territories: Customs card, Notes card, territory cards (ink, kind, open count, notes, next item; drag to reorder), New territory + starters; list and page side by side at ≥900px
src/components/                   # NavBar, SearchButton (the magnifier), search/* (result-groups, highlighted), Capture (the + sheet: Task / Note switch), NextStepCard, TaskRow, RowMenu (Start / Plan it / Move to… / File in…, owns its sheets), Sheet, Chip, MonthCalendar (optional dots), NoticeBar, Stamp, start/*, task/*, upcoming/* (day-section, week-strip), territory/* (card, customs-card, view, sheet = picker, edit-sheet), note/* (note-editor = blocks + caret placement, checklist-row, note-row, notes-card, notes-view, note-capture), Screen (scroll ref, pinned children, laptop side column), ReminderPrompt (the first-time ask), RemindersCard, application/* (ApplicationForm = a passport-form page, ChoiceCards = radio cards), settings/* (SettingsCard, SettingRow, password-sheet, username-sheet), SavePassport (username, then texted code or email link), PassportSaveCard (on Passport until saved), application/* (quiz-pages = Welcome through Where did you hear, after-oath = Your first week + the nudge, new-applicant = signed out, use-turns), PasswordField (show / hide, AutoFill hints), UsernameField (cleans as typed, says if it's free), sign-in/SentPanel ("Check your email."), LandingStamp (an ink stamp landing with a haptic: Done, Approved), Text, Icon
src/theme/tokens.ts               # useTokens() / useStyles() over @pn/core palettes
```
**Loading data:** Supabase returns at most 1,000 rows per request and a cut-off list fails silently (the newest tasks just vanish), so anything that can grow goes through `fetchAllPages` (`data/paging.ts`). The tasks store loads what's on the go (open tasks, today's finished ones, plan steps), never history; a note's ticked checklist lines load with the note (`loadNoteLines`). Notes load 25 at a time per scope (every note, or one territory's) with Show older; counts come from the `note_counts` view; a note older than the loaded pages is fetched on its own (a checklist task's note on Today, a note opened from a link).
Device storage (AsyncStorage, per device): `pn.application.draft` (the Application's answers while signed out), `pn.passport.choose-password.<userId>` (an email save link went out from here: ask for the password once it's confirmed), `pn.stamped.first-start.<userId>`, `pn.briefing.not-now.<userId>` (the day the Morning Briefing card was put off), `pn.start.active.<userId>` (Start Mode session in progress, for resume), `pn.notes.checklist-learned.<userId>` (hides the "make a line a task" tip once they've used ☐ or hidden it), `pn.reminders.not-now.<userId>` (they said Not now to reminders: stop asking), `pn.reminders.done-outbox` (a reminder's Done not saved yet: offline, signed out, or Expo Go), `pn.reminders.handled` (the last 50 reminder responses handled, so a reload never repeats one), `pn.reminders.web-off` (web: "Turn off here", per browser); iOS UserDefaults `pn.reminders.done-queue` (the Swift add-on's Dones from while the app was closed). Web keyboard shortcuts go through `useShortcuts` (`use-shortcuts.web.ts`; no-op on native): plain keys ("Escape", "Space") are ignored while typing; "Mod+Shift+L"-style combos (⌘ or Ctrl) fire in fields too. It listens in the capture phase because React Native Web's TextInput stops keydown from bubbling. ⌘K and / (search) are registered in the tabs layout.

### packages/core
`src/tokens.ts` (A2 palettes for light/"night passport", fonts, type scale, spacing, radii, motion), `src/nation.ts` (names, plain action labels, ranks, nudge tones, voice strings incl. `application` and `settings`, `toneLines` / `linesFor(tone)`: the nudging lines (Start Mode lead, five-minute check-in, "you started", the morning list) in Diplomat / Drill Sergeant / Roast, citizen number + passport code lines), `src/onboarding.ts` (the Application's pages (questions numbered 1–9 through the Oath), `resumePage`, `helpCardsFor(style)`, `resultAudience(persona)`, `firstWeekOf` (the Oath's steps by day), `territoriesFor(persona)`, `rolloverFor` (night owl: 3 AM), `morningTimeFor`, `hoursChange` (shared with Settings), `oathTask` (a typed date wins, else the picked due)), `src/dates.ts` (local-date helpers, day rollover, RRULE labels), `src/types.ts` (draft v2 data model), `src/agenda.ts` (Today: agenda, next step, up next, step context), `src/upcoming.ts` (`buildUpcoming`: days, DUE markers, Later; calendar dot counts; section for a picked day), `src/territories.ts` (`isInCustoms` (Today shares it), `effectiveListId` (steps live in their plan's territory), `buildTerritories`, `buildTerritory`, `matchTerritory` for #tags; a note's checklist tasks stay out of Customs and territory lists), `src/notes.ts` (the note body format: plain lines, a checklist line is the token `[[task:<uuid>]]` and its task owns the words and done state; parse/serialize, title = first line, line ↔ checklist edits, `buildNotes` summaries with progress, paging order `byRecency` / `withinPages`, `NOTES_PAGE` = 25), `src/search.ts` (`parseSearch`: the first #tag naming a territory narrows, other #words are words; `hasSearchWords`; `splitHighlights` for «snippets»; `SEARCH_PAGE` = 25), `src/order.ts` (internal ordering helpers), `src/quick-add.ts` (`scheduleOf` turns a parse into task fields), `src/planning.ts`, `src/briefing.ts` (the Morning Briefing: `briefingOf(tasks, today)` = what carried over (open one-offs whose day, or with none their deadline, has passed; never repeats), plans with missed steps and loose tasks; `todayPatch` / `dayPatch` / `letGoPatch` (a passed deadline comes off when it gets a later day or none) / `respreadPatches` (a plan's open steps from today to its deadline via `fallbackStepDates`) / `undoPatch`), `src/plan-offer.ts` (`suggestsPlan(title)`: whether a title sounds bigger than one sitting, read by its lead verb first so errands stay errands ("Email Dr. Ruiz about the quiz"); `offersPlan(task, hasPlan)`: the row's Plan it pill, never on steps, repeats, a note's checklist lines or estimates of 30 min or less; labeled titles in `test/plan-offer-cases.ts`, judge a change on a fresh unseen batch), `src/start-mode.ts` (wall-clock timer math, default minutes by style, stuck reasons, stamp kinds), `src/when.ts` (date/time/repeat chips, Monday-first month grid and week strip, when/due/repeat patches), `src/reminders.ts` (`planReminders`: a task's time on its day and each time a repeat comes round, timed deadlines, the morning list (what Today will show that morning; nothing on, no ring), the next 14 days, soonest 64 (iOS's cap); ids `task:` / `due:` / `snooze:<taskId>:<ms>`, `morning:<day>`; `reminderChanges` diffs the plan against what's pending (open tasks' snoozes stay, other features' ids are left alone); `snoozeOf` (+10 min), `morningListOf` (off, 8:00 AM), `remindersDue(tasks, since, now)` (what a server sender rings each run; the caller switches to the person's timezone)), `src/tasks.ts` (`checkOff`: a one-off finishes, a repeat moves on; shared by every checkbox and a reminder's Done), `src/export.ts` (`buildExport`: the Download your data file, `noteAsText`: checklist lines as [x] / [ ] text), `src/account.ts` (`MIN_PASSWORD_LENGTH` = 6, `isValidUsername` / `cleanUsername` (v1's rule), `normalizePhone` / `formatPhone` (US and Canada), `planWindow` / `FREE_PLANS_PER_WINDOW` (2 plans per 30.5 days from creation), `authErrorKind`: Supabase Auth's error codes first, then messages); `parseWhen` in `quick-add.ts` reads a schedule on its own ("fri 6pm"), and `parseQuickAdd(text, now, { day, lists })` captures into a preset day unless the text names a date, and files "#chem" in a matching territory (unknown #words stay in the title). Tests: `npm run core:test`.

## Database (Supabase)

### `tasks` table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users, used in RLS |
| title | TEXT | Task name |
| description | TEXT | AI analysis |
| status | TEXT | 'in_progress' or 'completed' |
| steps | JSONB | Array of step objects |
| completed_steps | INT | Count completed |
| total_steps | INT | Total count |
| start_time | TIMESTAMP | When task was started |
| completed_at | TIMESTAMP | Null if in progress |
| due_date | TIMESTAMP | Optional deadline |
| priority | INT | 1=Low, 2=Medium, 3=High, null=unset |
| recurrence | JSONB | `{ type, startDate }` or null |
| step_dates | JSONB | `{ stepId: "YYYY-MM-DD" }` or null |
| created_at | TIMESTAMP | Immutable — use for staleness checks |
| updated_at | TIMESTAMP | Auto-trigger resets on every write |
| last_nudge_sent | TIMESTAMP | Last nudge email timestamp |
| start_commitment, first_interaction_at | TIMESTAMPTZ | Commitment device; first engagement |
| assignment_id | UUID | FK → assignments (schools feature), null for personal tasks |
| source | TEXT NOT NULL | 'self' (default) or 'assignment'; a teacher RLS policy reads it. v2 widens it, never drops it |

### Schools tables (in production, not documented elsewhere)
`organizations`, `org_memberships`, `classes`, `enrollments`, `class_invites`, `assignment_templates`, `assignments`, plus `reset_sessions`. Teachers can SELECT students' `tasks` where `source = 'assignment'` via `is_teacher_of_assignment()`. The full structure is in a pg_dump at `supabase/v2/.local/prod-schema.sql` (gitignored; regenerate with `supabase/v2/scripts/dump-prod-schema.sh`).

### `profiles` email preferences
`email_reminders_enabled`, `email_reports_enabled` (BOOLEAN, default true) — set false by `/api/unsubscribe`; crons skip opted-out users.

### `profiles` billing and visibility
- `stripe_customer_id`, `stripe_subscription_status` are written only by the Stripe routes (service role); a trigger rejects users setting them (`supabase/migrations/profiles_billing_1_before_deploy.sql`).
- API callers can read only `id, user_id, username, display_name, created_at` (`profiles_billing_2_after_deploy.sql`). The signed-in user reads their own status with `supabase.rpc('my_subscription_status')`. A new profiles column is hidden from the API until it's granted there.

### `streaks` table
id, user_id, current_streak, highest_streak, last_completed_date, updated_at

### `focus_pods` table (retired)
Focus Pods (Whereby video rooms) were removed on 2026-10-08: no page or route uses this table. It stays until the cutover contract migration drops the v1-only tables.

All tables have RLS policies filtering by `user_id`.

### v2 data model (`supabase/v2/`, not yet on production)
Additive migration with a cutover-only backfill and a tested rollback; see `supabase/v2/README.md` and run `npm test` there (real Postgres via PGlite; also runs against the real production structure when the local dump exists).
- **Web Push:** `push_tokens` web rows hold the browser's endpoint in `token` and its keys in `keys` (CHECKed); one account per browser (partial unique index), saved through `save_web_push(endpoint, key_p256dh, key_auth)` (SECURITY DEFINER: removes the same browser from another account). `push_sends` (what the sender sent, so nothing rings twice; pruned after 2 days) and `push_snoozes` (web snoozes waiting to ring) are server only: RLS on, no policies. `03_push_cron.sql` schedules the sender (Supabase Cron + pg_net, CRON_SECRET from Vault) once at deploy.
- `user_settings` (PK `user_id`): `citizen_number` (DB-assigned in signup order, immutable), `timezone`, `day_rollover_hour`, `preferences` JSONB (Citizenship Application answers: `persona`, `hours`, `style`, `nudgeTone`; `startMinutes` only when chosen in Settings; `reminders.morningList` = `{ on, hour, minute }` from the Reminders card), `onboarding_completed_at` (set on Approved or Skip; null sends a signed-in person to the Application). Saves check a row changed (a dead session goes out anonymous and RLS would match nothing). **Owner-only; private settings never go on `profiles`, which is publicly readable.**
- `lists` (Territories; `list_id` NULL = Customs), `notes`, `stamps`, `start_sessions`, `push_tokens`.
- `ai_requests`: one row per metered AI request: `'unstick'` (20 a day) and `'clarify'` (a plan's clarifying questions, 20 a day), and `'plan'` (one plan at a time, 20 s, so a burst can't outrun the free count). The routes log first, then count. Insert and read only.
- `stamps`: `'first-start'` and `'citizenship'` (the Application answered, not skipped) are unique per user (`stamps_once_idx`); `'task-done'` repeats (one per Done in Start Mode).
- `plan_generations`: one row per AI plan built; the free tier (3/month) counts these in `/api/generate-plan` (insert and read only, so the count can't be reset). **v2's route needs this table: apply `01_schema.sql` to production before the v2 site deploys.**
- `tasks` gains `list_id`, `parent_id` (steps/subtasks are child rows, one level deep), `notes`, `due_on`, `due_at`, `remind_at`, `rrule`, `estimate_minutes`, `scheduled_on`, `sort_order` (float), `external_id`, `deleted_at`, and widens the existing `source` to `self | assignment | ai | syllabus | lms | reminders` (backfilled steps are `ai`; parents keep theirs). v1 columns (`steps`, `step_dates`, `recurrence`, `due_date`) stay until a later contract migration.
- Naming: `*_on` = local DATE, `*_at` = TIMESTAMPTZ; soft deletes via `deleted_at` (sync needs tombstones).
- `tasks.note_id` → `notes` (ON DELETE SET NULL; partial index): a note's live checklist line. The note's body holds `[[task:<uuid>]]` tokens; the task row holds the title and done state, so ticking it on Today shows ticked in the note. Refiling a note refiles its checklist tasks; deleting a note soft-deletes its live ones (Undo brings back both).
- `search_items(query, kind, in_list, max_rows, skip)`: search, one group at a time (`'open'` / `'done'` tasks, `'notes'`), as the caller under RLS plus an explicit `user_id = auth.uid()`. English stemming with every word as a prefix; punctuation dropped; checklist tokens never match; `#territory` includes its plans' steps; «snippets»; tasks carry `parent_title` and `note_title`. **No GIN index:** under RLS Postgres can't use one (`@@` isn't leakproof), so each query scans the person's own rows (≈40–100 ms at 10,000 tasks on staging); store tsvectors in generated columns if accounts outgrow that.
- `note_counts` view (`security_invoker`, so RLS applies): live notes per `list_id` (NULL = no territory), for the counts on the Territories tab while notes load 25 at a time.
- Triggers reject `list_id`/`task_id`/`parent_id`/`note_id` pointing at another user's rows (an FK alone would accept them).

## Key Patterns

### Dark Mode
- **apps/site:** Use `useTheme()` hook from `app/providers.jsx`
- Apply dark styles via ternary: `` `${darkMode ? 'bg-slate-800' : 'bg-white'}` ``
- **Never** use Tailwind's `dark:` prefix — the project uses class-based JS toggling
- **apps/app (v2) does not use ternaries.** Style with React Native `StyleSheet` and A2 tokens: `const s = useStyles(makeStyles)` with a module-level `makeStyles = (t: Tokens) => ...`, or `useTokens()` for one-off colors. Light/night follow the system scheme. Never hard-code a hex in a component; add a token to `packages/core/src/tokens.ts` instead. Use the `Text` component's `variant` for type roles, and the `Icon` component (SVG strokes), never emoji.
- v2 copy: nation names for places and rewards (from `@pn/core` `names`/`voice`), plain labels on buttons (`actions`). The AI-plan button is always "Plan it".

### Auth
- `useAuth()` from `app/providers.jsx` — exposes `{ user, loading, trialStatus, trialDaysLeft, signOut }`
- `trialStatus`: `'trial'` | `'free'` | `'pro'`
- Free tier: 3 AI plans per calendar month (v1). **v2's route:** 2 per 30.5-day window from the account's creation (core `planWindow`, `FREE_PLANS_PER_WINDOW`); an anonymous passport gets no trial
- Trial: 10 days of Pro from sign-up, counted from `user.created_at` by `trialDaysRemaining()` in `lib/trial.js` (both the plan route and `AuthProvider`). Never decide access from `user_metadata`: users can write it themselves

### Styling
- All styling via Tailwind utility classes
- No CSS modules or styled-components
- Responsive breakpoints: `md:` and `lg:`

### State Management
- Local state: `useState` in components
- App-wide: ThemeProvider + AuthProvider contexts
- Persistent client: localStorage for boards, completed resets, theme, tutorial state
- Persistent server: Supabase for tasks, streaks

### localStorage Keys
- `theme` — dark/light preference
- `task-boards` — board assignments (boardName → taskId mapping)
- `completed-resets` — Set of completed wellness video IDs
- `tutorialComplete` — boolean, onboarding finished

### API Communication
- Client uses `fetch()` to `/api/*` endpoints
- Server calls Anthropic through `callClaude()` in `lib/ai.js` (raw `fetch()`, structured JSON output). Models: `MODELS.plan` = `claude-sonnet-5-5` (plans, clarifying questions, syllabus; "I'm stuck" at low effort), `MODELS.fast` = `claude-haiku-4-5` (step dates, short copy). Never build plans on Haiku.
- Plan prompts live in `lib/prompts/plan.js`; any prompt/model change must pass `evals/plan-quality` (see its README) before shipping. The "I'm stuck" prompt (`lib/prompts/unstick.js`) is gated the same way by `evals/unstick`
- Clients send `today` (local YYYY-MM-DD, from `lib/dates.js`) and `timeZone` so the AI resolves relative dates correctly; never use `toISOString()` for local calendar dates
- Cron routes secured with `Authorization: Bearer <CRON_SECRET>`
- Service role client created inline in cron routes to bypass RLS

### Component Pattern
All pages use `'use client'` directive and follow:
```jsx
'use client'
import { useTheme } from '../providers'
import { useAuth } from '../providers'
export default function PageName() {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  // ...
}
```

### Naming Conventions
- Components: PascalCase
- Functions/variables: camelCase
- File names: lowercase with hyphens for directories, `.jsx` for React files

## Decisions

`DECISIONS.md` (repo root) collects Alex's product decisions and the deliberate code an outside reviewer could mistake for a bug or over-engineering (local-only sign-out, `fetchAllPages`, settings saves that confirm a row changed, …), plus known limits and what's out of scope. It's what a second reviewer reads first. When Alex makes a product call, or a fix adds code that only looks redundant, add it there. Before removing defensive code, check it isn't listed.

## Agent Instructions

Specialized agent instructions live in the `agents/` directory. Read the relevant file before performing that task.

| Agent | File | When to use |
|-------|------|-------------|
| Code Review | `agents/code-review.md` | Before every commit and push. Read the file, run the checklist against the diff, report findings, and fix issues before committing. |
| Architect | `agents/architect.md` | When planning new features, refactors, or making data model/API/state management decisions. Read the file before proposing designs. |
| Database Review | `agents/database-review.md` | When writing SQL migrations, designing tables, adding Supabase queries, or reviewing cron route DB logic. Read the file before proposing schema changes. |
| Doc Updater | `agents/doc-updater.md` | After shipping features, adding files, changing schema, or modifying env vars. Read the file, then update CLAUDE.md and MEMORY.md to match reality. |
| E2E Runner | `agents/e2e-runner.md` | After shipping major features or before big deploys. Requires Playwright setup (see file). Run critical user journey tests. |
| Build Error Resolver | `agents/build-error-resolver.md` | When `npm run build` or `npm run lint` fails. Read the file, diagnose the error, apply minimal fixes only, rebuild to verify. |
| Planner | `agents/planner.md` | When a feature request touches 3+ files or has unclear scope. Read the file, produce a phased plan with specific file paths, then get approval before coding. |
| Refactor Cleaner | `agents/refactor-cleaner.md` | When cleaning up dead code, splitting oversized files, or removing unused dependencies. Read the file, follow the safety checklist, build after each batch. |
| Security Review | `agents/security-review.md` | After writing API routes, auth changes, file upload code, or before Stripe integration. Read the file, audit for vulnerabilities, fix before committing. |

When adding new agent files, update this table.

## Deployment
- **Platform**: Vercel (Hobby tier)
- **Auto-deploy**: From `main` branch (git user.email must be alexja2008@gmail.com)
- **Domain**: procrasti-nation.work (Porkbun → Vercel DNS)
- **Cron**: `vercel.json` — nudge daily 2pm UTC, weekly report Monday 1pm UTC
- **Env vars**: All 7 vars above must be set in Vercel dashboard (`WHEREBY_API_KEY` is no longer used: delete it there)
- **Web Push at the v2 deploy:** production VAPID keys in both Vercel projects (`VAPID_*` on the site, `EXPO_PUBLIC_VAPID_PUBLIC_KEY` on the app), then `select vault.create_secret('<CRON_SECRET>', 'push_cron_secret');` and `supabase/v2/03_push_cron.sql` on production. The app's Vercel project must rewrite every path to `index.html` (a notification can open `/task/<id>` in a new tab) and serve `/sw.js` from the export's root.
- **v2 merge:** the Vercel project's Root Directory must flip to `apps/site` at the same moment `v2` merges to `main` (the setting applies to every branch, so flipping it early breaks production). Until then, `v2` pushes produce failing previews. The Expo web build will get its own Vercel project at `app.procrasti-nation.work`.
