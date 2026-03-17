# ProcrastiNation

An AI-powered productivity app that breaks tasks down until starting is easier than avoiding them. Built for people whose brains resist traditional productivity systems.

**Live at [procrasti-nation.work](https://procrasti-nation.work)**

## Features

### AI Adherence Planner
- Describe any task in plain language and get an AI-generated micro-step plan
- AI asks clarifying questions for vague tasks before generating steps
- Edit, reorder, add, or delete steps after generation
- Set priority levels (Low / Medium / High) and due dates
- Recurring tasks — daily, weekly, or monthly auto-respawn on completion
- Add steps to Google Calendar or download as .ics file

### Syllabus Import
- Upload a course syllabus (PDF, DOCX, or image) and AI extracts all assignments and deadlines
- Review and selectively import assignments
- Auto-creates a board named after the course
- Imported tasks appear as skeletons ready for AI plan generation

### Calendar
- Day, week, and month views showing scheduled task steps
- AI resolves relative step timing ("2 days before deadline") into absolute dates
- Click any event to edit its scheduled date
- Color-coded by task with legend

### Dashboard & Boards
- Stats: current streak, highest streak, completion rate, quickest task
- Kanban-style boards — drag tasks between categories (Personal, Work, School, etc.)
- In-progress task list sorted by priority and due date urgency
- Archive of all completed tasks with step details
- Task detail modal with progress bar and action buttons

### Focus Pods
- Virtual co-working sessions via Whereby video
- Create pods by category (Study, Work, Writing, Exam Prep, Coffee Break)
- Set duration and max participants
- Join active pods with other users

### Recovery Mode
- Curated wellness videos (breathwork, meditation, stress management, focus)
- Filter by category
- Track completed sessions

### FAQ
- Comprehensive help documentation organized by feature

### Account & Onboarding
- Email/password auth via Supabase
- 14-day Pro trial on signup (no credit card required)
- Interactive 7-step tutorial for new users
- Free tier: 5 AI plans/month | Pro: unlimited

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript/JSX
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Auth + Database**: Supabase (PostgreSQL with Row Level Security)
- **File Parsing**: mammoth (DOCX), unpdf (PDF), Claude vision (images)
- **Video**: Whereby
- **Email**: Resend
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Supabase project ([create one here](https://supabase.com/))

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/procrastination-app.git
   cd procrastination-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your keys:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   WHEREBY_API_KEY=your_whereby_key
   RESEND_API_KEY=re_...
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CRON_SECRET=your_cron_secret
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add all environment variables from `.env.local` to Vercel's Environment Variables settings
4. Click Deploy

Auto-deploys from `main` branch on every push.

### Cron Jobs

Configured in `vercel.json`:
- **Email nudges**: Daily at 2pm UTC — reminds users about stale in-progress tasks
- **Weekly report**: Mondays at 1pm UTC — progress digest with AI pep talk

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `WHEREBY_API_KEY` | Whereby API key for Focus Pods | Yes |
| `RESEND_API_KEY` | Resend API key for emails | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (cron jobs) | Yes |
| `CRON_SECRET` | Secret to authenticate cron endpoints | Yes |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the app | Yes |

## Project Structure

```
app/
├── api/
│   ├── generate-plan/route.js       # AI task planning
│   ├── parse-syllabus/route.js      # Syllabus file parsing
│   ├── resolve-step-dates/route.js  # Step date scheduling
│   ├── create-room/route.js         # Whereby room creation
│   └── cron/
│       ├── nudge/route.js           # Daily email nudges
│       └── weekly-report/route.js   # Monday progress digest
├── planner/page.jsx                 # AI task planner
├── dashboard/page.jsx               # Metrics & boards
├── calendar/page.jsx                # Day/week/month views
├── syllabus/page.jsx                # Syllabus upload
├── focus-pods/page.jsx              # Virtual co-working
├── reset-station/page.jsx           # Wellness videos
├── faq/page.jsx                     # Help documentation
├── page.jsx                         # Landing page
├── layout.jsx                       # Root layout
└── providers.jsx                    # Auth + theme contexts
components/
├── Navigation.jsx                   # Top nav bar
├── AuthModal.jsx                    # Sign in/up modal
├── TutorialModal.jsx                # Onboarding tutorial
├── UpgradeModal.jsx                 # Pro upgrade prompt
├── Logo.jsx                         # Logo
├── CalendarWeekGrid.jsx             # Week view
├── CalendarMonthGrid.jsx            # Month view
├── CalendarDayGrid.jsx              # Day view
└── CalendarEventPopover.jsx         # Step date editor
lib/
├── supabase.js                      # Supabase client
├── storage.js                       # localStorage wrapper
└── emails.js                        # Email templates
```

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| Free (post-trial) | $0/mo | 5 AI plans/month, public Focus Pods, basic metrics |
| Pro Monthly | $7.99/mo | Unlimited plans, all features |
| Pro Annual | $72/yr ($6/mo) | Same as Pro, 25% savings |

Every new user gets a 14-day Pro trial, no credit card required.

## License

MIT
