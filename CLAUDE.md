# ProcrastiNation – Claude Code Guide

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
```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm start        # Run production build
npm run lint     # ESLint
```

Note: nvm is installed. If node isn't found, run:
```bash
export PATH="$HOME/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin:$PATH"
```

## Environment Setup
Requires `.env.local` with:
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
    cron/nudge/route.js             # Daily email nudge for stale tasks
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
  supabase.js                       # Supabase client (anon key)
  storage.js                        # localStorage wrapper (legacy, still used for boards/resets)
  emails.js                         # Email templates (nudge + weekly report)
```

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

### `streaks` table
id, user_id, current_streak, highest_streak, last_completed_date, updated_at

### `focus_pods` table
id, name, category, duration, max_participants, participants, room_url, created_by, end_time, created_at

All tables have RLS policies filtering by `user_id`.

## Key Patterns

### Dark Mode
- Use `useTheme()` hook from `app/providers.jsx`
- Apply dark styles via ternary: `` `${darkMode ? 'bg-slate-800' : 'bg-white'}` ``
- **Never** use Tailwind's `dark:` prefix — the project uses class-based JS toggling

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
- Server uses raw `fetch()` to Anthropic API (model: `claude-sonnet-4-20250514`)
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
