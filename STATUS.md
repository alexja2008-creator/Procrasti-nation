# Status

As of 2026-10-14. Rewrite this file every Monday (replace, don't append); history lives in git, `CHANGELOG.md` and `docs/archive/`.

## Live

- **Web:** v2 merged to `main` on 2026-10-14 (PR #12). procrasti-nation.work is the landing page, privacy policy and terms; app.procrasti-nation.work is the app. Free-only; v1's pages redirect to the app. The same day: the Application asks for a name (PR #16); every day ends at midnight unless chosen otherwise (PR #14, merged just before).
- **iPhone:** TestFlight builds 1–4 run on staging and were checked on Alex's iPhone (reminders, password reset, Declarations stamp, theme). Students get a production build.
- **Beta:** 10 students on TestFlight; the feedback form is ready (`beta-feedback-form.md`), sent after about a week. Go/no-go gate: at least 4 of 10 started something they'd avoided, and NPS of 30 or more.

## This week

- Restructure (this branch): docs moved into `docs/`, short CLAUDE.md files, v2 subagents, CI, hooks. The repo moved out of iCloud to `~/PNDEV/Procrasti-nation`.

## Open items for Alex

- [ ] Confirm the cutover's production smoke test passed (`docs/runbooks/launch-2026-10.md`, Phase 3, step 9) and that step 10 (delete `RESEND_API_KEY` from the site's Vercel env) is done.
- [ ] Before students get a build: `work.procrastination.app://auth/callback` on production's Supabase redirect list, the Apple provider on production, production values in EAS's production environment, then a production build to an external TestFlight group.
- [ ] After the move: copy Claude Code's project memory to the new path, check push and the test suites from `~/PNDEV`, then delete the iCloud copy (`~/PNDEV/LOCAL-ONLY-CHECKLIST.md`).
- [ ] Make CI a required check on `main` (GitHub → Settings → Branches) once the workflow has run once.
- [ ] Move `business-marketing-plan.md` and `beta-feedback-form.md` to a private folder or repo: this repo is public.
- [ ] Payments: App Store Connect's Paid Apps agreement, tax and banking; the Small Business Program (15%); a RevenueCat account.
- [ ] Before App Store review: a Sign in with Apple key, so deleting a passport can revoke the Apple token.
- [ ] Before charging anyone: Vercel Pro (Hobby is non-commercial).
- [ ] Later: a staging copy of the site API (so staging builds can run Plan it), a Google OAuth client, the Twilio decision for texted codes, a PowerSync account for the offline-sync trial.

## Next

1. Payments and the required 7-day trial (`docs/plans/active/conversion.md`, phase 2).
2. The App Store release after TestFlight.
3. Measurement before the content push: funnel and retention queries, events for the signed-out Application, web error reporting.
4. State of the Union (the Monday email), then syllabus import.

Known limits and what's out of scope: `DECISIONS.md`.
