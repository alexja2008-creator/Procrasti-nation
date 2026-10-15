# ProcrastiNation

An app that breaks the task you're avoiding into steps small enough to start, then gets you to start. Built for people whose brains resist traditional productivity systems.

**Live at [procrasti-nation.work](https://procrasti-nation.work)** (v2 since 2026-10-14; the launch steps are in `docs/runbooks/launch-2026-10.md`)

## What's in it (v2)

- **Plan it:** the AI planner turns a big task into small, dated steps.
- **Today, Upcoming, Territories:** tasks, plans and notes in one place; quick add reads "fri 6pm" and "#chem".
- **Start Mode:** a short timer, "I'm stuck" for a two-minute way in, and a stamp for starting.
- **Reminders:** iPhone notifications and Web Push, a morning list and the Morning Briefing for what carried over.
- **Declarations:** sign a start time for a task.
- **The Passport:** stamps, rank and Declarations kept.
- **The Citizenship Application:** onboarding that sets the app up around how you work, ending with the Oath (your first plan).

## Repository

```
apps/site      Next.js 14: the landing page and the API the app calls (AI, Web Push, account deletion)
apps/app       Expo SDK 57 (expo-router): the app for iPhone and the web (app.procrasti-nation.work)
packages/core  Shared TypeScript: design tokens, voice, dates, planning and reminder logic (@pn/core)
supabase/v2    The v2 database migration, its tests and the cutover scripts
docs           Architecture reference, development gotchas, runbooks, feature plans
```

Start with `STATUS.md` (what's live and what's next) and `DECISIONS.md` (why things are the way they are).

Not an npm workspace: the site is on React 18 and the app on React 19, so each has its own `node_modules`.

## Getting started

Prerequisites: Node.js 20+, npm, an Anthropic API key and a Supabase project.

```bash
cd apps/site && npm install && npm run dev        # site + API at http://localhost:3000
cd apps/app && npm install && npx expo start --web  # app at http://localhost:8081
npm run core:test                                  # from the root: @pn/core tests
```

Environment variables: `apps/site/.env.local` (see `apps/site/CLAUDE.md` → Environment) and `apps/app/.env.local` (public `EXPO_PUBLIC_*` values only; see `apps/app/.env.example`). Secrets never go in the app.

## Deploying

Two Vercel projects: the site (Root Directory `apps/site`, at procrasti-nation.work) and the app (Root Directory `apps/app`, at app.procrasti-nation.work, configured by `apps/app/vercel.json`). The cutover steps are in `docs/runbooks/launch-2026-10.md`.

## License

MIT
