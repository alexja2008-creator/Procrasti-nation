# Outside the repo

Things PN depends on that don't live in git. Check this list when setting up a new machine or moving the folder.

| What | Where | Note |
|---|---|---|
| Local env files | `apps/site/.env.local`, `apps/site/.env.development.local`, `apps/app/.env.local`, `supabase/v2/.env.staging` | Gitignored. Production values also live in each Vercel project and in EAS's environments |
| Production schema dump | `supabase/v2/.local/prod-schema.sql` | Gitignored; regenerate with `supabase/v2/scripts/dump-prod-schema.sh` |
| Claude Code project memory | `~/.claude/projects/<the repo's path with dashes>/memory/` | Named after the folder's path, so it has to be copied when the repo moves |
| The original v2 plan | `~/.claude/plans/ProcrastiNation2.md` | "ProcrastiNation 2.0: Re-envisioning & Rebuild Plan" |
| Design direction A2 canvas | A claude.ai artifact (link in `docs/archive/handoff-2026-10.md`, section 7) | Screens for rows A, A2, B, C |
| Funnel model and post log | A claude.ai artifact (link in the business plan) | Private to Alex |
| Business plan, beta form and responses | To move to a private location (the repo is public) | |
| iOS development build cache | `~/Library/Caches/procrastination-ios` | About 8.5 GB; safe to delete, rebuilt by `apps/app/scripts/ios-dev-build.sh` |
| Hosting and services | Vercel (two projects), Supabase (production `tmigxhhnhledszjdgnwk`, staging `mbuakrohovzjegonrplp`), EAS (`@procrastination.work/procrastination`), App Store Connect, Resend (auth email SMTP) | |
