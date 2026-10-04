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
- **v2 auth:** Supabase magic link (PKCE), Sign in with Apple (native on iOS via `signInWithIdToken` + nonce; OAuth on web), Google (OAuth). Supabase Auth's redirect allow list must include every callback form: `procrastination://auth/callback`, `exp://**` (Expo Go), `http://localhost:8081/auth/callback`, and the production web URL. Expo Go lacks the Apple native module, so Apple sign-in needs a development build.
- **v2 → site API:** the app calls `apps/site` `/api/*` with the Supabase access token (`src/lib/api.ts`). CORS lives in `apps/site/middleware.js` (allowlist: the site's origin, `app.procrasti-nation.work`, and `localhost:8081` in development). For local work, `apps/site/.env.development.local` (gitignored) points the site at the staging Supabase project so it accepts staging sessions.
- Everything below this section describes `apps/site` unless it says otherwise; paths are relative to `apps/site/`.

## Project Overview
AI-powered productivity SaaS that helps users overcome procrastination via:
- AI task breakdown with step editing, scheduling, and recurrence
- Syllabus upload — auto-extract assignments from PDF/DOCX/image
- Calendar views (day/week/month) with AI-resolved step dates
- Kanban boards for task organization
- Focus pods (virtual co-working via Whereby)
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
- **Video**: Whereby (Focus Pods)
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
npx expo start --ios            # iOS Simulator (needs Xcode, license accepted)
npx tsc --noEmit && npx expo lint
npx expo install <pkg>          # Always, instead of npm install, for SDK-compatible versions
```

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
WHEREBY_API_KEY=Bearer_token
RESEND_API_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=service_role_key
CRON_SECRET=secret_for_cron_auth
NEXT_PUBLIC_BASE_URL=https://procrasti-nation.work
```

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
  focus-pods/page.jsx               # Virtual co-working (Whereby embed)
  reset-station/page.jsx            # Wellness videos (YouTube embeds)
  faq/page.jsx                      # FAQ with collapsible Q&A sections
  api/
    generate-plan/route.js          # AI task planning (clarify + generate steps)
    parse-syllabus/route.js         # Syllabus file → JSON assignments
    resolve-step-dates/route.js     # Relative timing → absolute calendar dates
    create-room/route.js            # Whereby room creation
    cron/nudge/route.js             # Daily nudge digest (one email per user) + missed-commitment nudges
    unsubscribe/route.js            # Signed one-click unsubscribe (reminders / reports)
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
  prompts/dates.js                  # Step "when" → calendar date prompt
  dates.js                          # Local-date helpers (localDateString, localTimeZone)
  unsubscribe.js                    # Signed unsubscribe links + List-Unsubscribe headers
  supabase.js                       # Supabase client (anon key)
  storage.js                        # localStorage wrapper (legacy, still used for boards/resets)
  emails.js                         # Email templates (nudge + weekly report)
```

### apps/app (Expo, v2)
```
src/app/_layout.tsx               # Root Stack: A2 fonts, AuthProvider, Stack.Protected sign-in gate
src/app/sign-in.tsx               # Magic link + Apple + Google (each shown only if in EXPO_PUBLIC_AUTH_PROVIDERS)
src/app/auth/callback.tsx         # Where magic links / OAuth land; exchanges the PKCE ?code=
src/auth/                         # auth-provider (session), sign-in actions, apple(.web).ts
src/lib/supabase.ts               # Anon-key client (PKCE, AsyncStorage, foreground-only token refresh)
src/app/plan/[id].tsx             # Plan it: clarifying questions → plan preview → saves steps as child tasks
src/data/                         # user-settings, tasks (+ store), plans, signed-in-providers
src/lib/api.ts                    # apiPost() to apps/site with the session token
src/app/(tabs)/_layout.tsx        # Headless expo-router/ui tabs + custom NavBar
src/app/(tabs)/index.tsx          # Today (A2 design, mock data for now)
src/app/(tabs)/upcoming|territories|passport.tsx   # Placeholders
src/components/                   # NavBar, NextStepCard, TaskRow, Screen, Text, Icon, Logo, SecurityLines
src/theme/tokens.ts               # useTokens() / useStyles() over @pn/core palettes
src/data/mock.ts                  # Mock profile + agenda until Supabase sync lands
```

### packages/core
`src/tokens.ts` (A2 palettes for light/"night passport", fonts, type scale, spacing, radii, motion), `src/nation.ts` (names, plain action labels, ranks, nudge tones, voice strings, citizen number + passport code lines), `src/dates.ts` (local-date helpers, day rollover, RRULE labels), `src/types.ts` (draft v2 data model).

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

### `streaks` table
id, user_id, current_streak, highest_streak, last_completed_date, updated_at

### `focus_pods` table
id, name, category, duration, max_participants, participants, room_url, created_by, end_time, created_at

All tables have RLS policies filtering by `user_id`.

### v2 data model (`supabase/v2/`, not yet on production)
Additive migration with a cutover-only backfill and a tested rollback; see `supabase/v2/README.md` and run `npm test` there (real Postgres via PGlite; also runs against the real production structure when the local dump exists).
- `user_settings` (PK `user_id`): `citizen_number` (DB-assigned in signup order, immutable), `timezone`, `day_rollover_hour`, `preferences` JSONB (Citizenship Application answers), `onboarding_completed_at`. **Owner-only; private settings never go on `profiles`, which is publicly readable.**
- `lists` (Territories; `list_id` NULL = Customs), `notes`, `stamps`, `start_sessions`, `push_tokens`.
- `plan_generations`: one row per AI plan built; the free tier (3/month) counts these in `/api/generate-plan` (insert and read only, so the count can't be reset). **v2's route needs this table: apply `01_schema.sql` to production before the v2 site deploys.**
- `tasks` gains `list_id`, `parent_id` (steps/subtasks are child rows, one level deep), `notes`, `due_on`, `due_at`, `remind_at`, `rrule`, `estimate_minutes`, `scheduled_on`, `sort_order` (float), `external_id`, `deleted_at`, and widens the existing `source` to `self | assignment | ai | syllabus | lms | reminders` (backfilled steps are `ai`; parents keep theirs). v1 columns (`steps`, `step_dates`, `recurrence`, `due_date`) stay until a later contract migration.
- Naming: `*_on` = local DATE, `*_at` = TIMESTAMPTZ; soft deletes via `deleted_at` (sync needs tombstones).
- Triggers reject `list_id`/`task_id`/`parent_id` pointing at another user's rows (an FK alone would accept them).

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
- Free tier: 3 AI plans per calendar month
- Trial: 10 days of Pro on signup (stored in `user_metadata.trial_ends_at`)

### Styling
- All styling via Tailwind utility classes
- No CSS modules or styled-components
- Responsive breakpoints: `md:` and `lg:`

### State Management
- Local state: `useState` in components
- App-wide: ThemeProvider + AuthProvider contexts
- Persistent client: localStorage for boards, completed resets, theme, tutorial state
- Persistent server: Supabase for tasks, streaks, focus pods

### localStorage Keys
- `theme` — dark/light preference
- `task-boards` — board assignments (boardName → taskId mapping)
- `completed-resets` — Set of completed wellness video IDs
- `tutorialComplete` — boolean, onboarding finished

### API Communication
- Client uses `fetch()` to `/api/*` endpoints
- Server calls Anthropic through `callClaude()` in `lib/ai.js` (raw `fetch()`, structured JSON output). Models: `MODELS.plan` = `claude-sonnet-5-5` (plans, clarifying questions, syllabus), `MODELS.fast` = `claude-haiku-4-5` (step dates, short copy). Never build plans on Haiku.
- Plan prompts live in `lib/prompts/plan.js`; any prompt/model change must pass `evals/plan-quality` (see its README) before shipping
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
- **Env vars**: All 8 vars above must be set in Vercel dashboard
- **v2 merge:** the Vercel project's Root Directory must flip to `apps/site` at the same moment `v2` merges to `main` (the setting applies to every branch, so flipping it early breaks production). Until then, `v2` pushes produce failing previews. The Expo web build will get its own Vercel project at `app.procrasti-nation.work`.
