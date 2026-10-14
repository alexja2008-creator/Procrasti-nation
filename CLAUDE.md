# ProcrastiNation: Claude Code guide

ProcrastiNation (PN) helps people start what they're avoiding: an AI planner ("Plan it") breaks a task into steps small enough to begin, and the app nudges them to start. v2 went live on the web on 2026-10-14 (merged to `main`; the legal pages took effect 2026-10-13); the iPhone app is on TestFlight. Students first.

**Read first:** `STATUS.md` (what's live, this week, open items for Alex). Before changing product behavior or removing code that looks redundant: `DECISIONS.md`.

## Map

```
apps/site       Next.js 14 (React 18, JS): the landing page, legal pages and the /api/* backend   → apps/site/CLAUDE.md
apps/app        Expo SDK 57 (React 19, TS, expo-router): the app for iPhone and the web           → apps/app/CLAUDE.md
packages/core   @pn/core: dependency-free TS for tokens, voice, dates, planning, reminders       → packages/core/CLAUDE.md
supabase        the database: v2 migration, tests, scripts, auth email templates               → supabase/CLAUDE.md
docs            architecture reference, gotchas, runbooks, plans, archive
.claude         shared settings and hooks, subagents (agents/), design skills (skills/)
```

Each folder's own `CLAUDE.md` loads when you work in it. Not an npm workspace: the site and the app each keep their own `node_modules` (React 18 vs 19); `apps/app` imports `packages/core` through the `@pn/core` alias.

## Commands (from the root)

```bash
npm run install:all     # npm ci in apps/site and apps/app
npm run site:dev        # site + API at http://localhost:3000
npm run app:web         # app at http://localhost:8081
npm run app:check       # app type check + lint
npm run core:test       # @pn/core tests
npm run db:test         # migration tests on real Postgres (PGlite)
npm run site:test       # Web Push helpers
npm run evals           # plan-quality eval (costs about $1; only for prompt or model changes)
```

Node comes from nvm. If `node` isn't found: `export PATH="$HOME/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin:$PATH"`.

## Rules that always hold

- **`main` is production.** Both Vercel projects deploy from it. Never push to `main` or force-push; changes reach it through a pull request with CI green. Commit and push feature branches freely. A hook in `.claude/settings.json` enforces this.
- **No secrets in `apps/app`.** It only gets `EXPO_PUBLIC_*` values; anything needing a key goes through `apps/site`'s `/api/*`.
- **AI changes are gated.** Any change to a prompt or a model passes its eval in `apps/site/evals/` first. Plans are built on Sonnet, never Haiku.
- **Never decide access from `user_metadata`**: people can write it themselves. Trials count from `user.created_at`.
- **Local calendar dates never use `toISOString()`** (that's UTC); use core's `localDateString`.
- **Private data never goes on `profiles`**, which is publicly readable. It goes in owner-only tables like `user_settings`.
- **No guilt in copy:** never "overdue", "failed" or red for missed things. Nation names for places and rewards, plain verbs on buttons; the AI button is always "Plan it". All copy lives in `@pn/core`.
- **The privacy policy follows the code.** Any change to what's collected or who processes it changes `apps/site/app/privacy` in the same PR.
- **Databases:** staging gets production's structure only, never users' data. Don't use the production service-role key to explore; ask Alex first. Alex applies SQL to production.
- **`DESIGN.md` and `packages/core/src/tokens.ts` change together**; a test fails when they drift.
- **The repo is public.** No business plans, beta responses, analytics exports or personal data in it.

## How work runs here

- **Plans:** a feature touching three or more files, or with unclear scope, gets a plan in `docs/plans/active/` from `docs/plans/TEMPLATE.md`, approved by Alex before coding. When it ships, add a "Built" note and move it to `docs/plans/shipped/`.
- **Subagents** (`.claude/agents/`): `code-reviewer` before each commit, `security-reviewer` after API, auth or upload changes, `database-reviewer` for SQL and Supabase queries, `build-fixer` when a build or type check fails, `docs-keeper` after shipping.
- **Decisions:** when Alex makes a product call, or a fix adds code that only looks redundant, add it to `DECISIONS.md`.
- **After shipping:** update `STATUS.md` and `CHANGELOG.md` (in users' words), and `docs/architecture.md` if files, tables, routes or storage keys changed.

## Where things are documented

| What | Where |
|---|---|
| File-by-file map, data model, storage keys | `docs/architecture.md` |
| Simulator, browser and Supabase gotchas; running locally | `docs/dev-gotchas.md` |
| Deploys, the launch cutover, the iPhone track | `docs/runbooks/` |
| Feature plans, active and shipped | `docs/plans/` |
| Design system for tools and agents | `DESIGN.md` |
| The database migration | `supabase/v2/README.md` |
| AI quality gates | `apps/site/evals/*/README.md` |
| Things that live outside the repo | `docs/external.md` |
| The full build history (2026-10 handoff) | `docs/archive/handoff-2026-10.md` |

## Design work

`DESIGN.md` writes the A2 "Vintage Passport" system out for design tools and agents; `packages/core/src/tokens.ts` stays the source of truth. Design skills live in `.claude/skills/`, pinned in `skills-lock.json` (`npx skills update -p` updates them): `design-taste-frontend` (A2 is an existing brand, so run it with `--keep palette,type`; its working files go to the gitignored `.taste-skill/`), `redesign-existing-projects`, and Vercel's `web-design-guidelines` (skip its Title Case copy rules).

## Deployment

- Two Vercel projects on the Hobby tier: the site (Root Directory `apps/site`, procrasti-nation.work) and the app (`procrastination-app`, Root Directory `apps/app`, app.procrasti-nation.work). Both need "Include files outside the Root Directory" (they read `packages/core`). Git commits must use Alex's GitHub identity to deploy.
- Domain bought through Vercel; DNS is Vercel's, so records live under Vercel → Domains.
- The Web Push sender runs every minute from Supabase Cron (`supabase/v2/03_push_cron.sql`); there are no Vercel crons.
- iPhone builds come from EAS Build (`apps/app/eas.json`: `staging` and `production` profiles). App Store Connect: "ProcrastiNation: AI Planner", bundle id `work.procrastination.app`.
