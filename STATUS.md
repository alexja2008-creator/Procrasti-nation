# Status

As of 2026-10-15. Rewrite this file every Monday (replace, don't append); history lives in git, `CHANGELOG.md` and `docs/archive/`.

## Live

- **Web:** v2 merged to `main` on 2026-10-14 (PR #12). procrasti-nation.work is the landing page, privacy policy and terms; app.procrasti-nation.work is the app. Free-only; v1's pages redirect to the app. The same day: the Application asks for a name (PR #16); every day ends at midnight unless chosen otherwise (PR #14, merged just before); the legal audit's fixes, including the age check before any account (PR #13); a plan is one row on Today (PR #17). On 2026-10-15, saving the passport became required before Today, with a "Check your email" card until the link is opened (PR #19, #20; `docs/plans/active/required-save.md`), after family testers skipped saving. The same day, the + sheet learned repeats as people say them ("every M/W/Sat", "gym tue/thu") and got a Due · Today · Tomorrow · Pick a date row (PR #24), phase 1 of `docs/plans/active/dates-and-repeats.md` (five phases from more family testing).
- **iPhone:** TestFlight builds 1–4 ran on staging and were checked on Alex's iPhone (reminders, password reset, Declarations stamp, theme). The production build is on TestFlight too (2026-10-14, checked on Alex's iPhone). Required saving reaches the iPhone with the next build, before the students get it.
- **Beta:** 10 students lined up; TestFlight's external group for them isn't set up yet (`docs/runbooks/launch-2026-10.md`, The iPhone track). The feedback form is ready (kept privately; see `docs/external.md`), sent after about a week. Go/no-go gate: at least 4 of 10 started something they'd avoided, and NPS of 30 or more.

## This week

- Restructure (`chore/restructure-for-launch`): docs moved into `docs/`, short CLAUDE.md files, v2 subagents, CI, hooks. The repo moved out of iCloud to `~/PNDEV/Procrasti-nation` (the iCloud copy is in the Trash; Claude Code's memory came across). Merged branches deleted; unmerged ones kept as `archive/*` tags.

## Open items for Alex

- [ ] Beta Pro ends at the close of November 15, 2026 (`BETA_PRO_UNTIL` in `packages/core/src/account.ts`): before then, move the date or let the free tier's 2 plans a month return.
- [x] Production's Change Email Address template has our subject and body (Alex, 2026-10-15).
- [ ] Check that an unsaved passport from before 2026-10-15 opens on Save your passport: the two family testers' passports, the next time they open the app.
- [ ] A monthly spend limit on the Anthropic workspace (beta Pro lets every passport make up to 20 plans a day).
- [ ] Confirm the cutover's step 10 is done: `RESEND_API_KEY` deleted from the site's Vercel env (`docs/runbooks/launch-2026-10.md`, Phase 3). The smoke test passed on 2026-10-14.
- [ ] Before students get the build: `work.procrastination.app://auth/callback` on production's Supabase redirect list and the Apple provider on production (if not done at cutover), then TestFlight's external group with a public link for the 10 students (the first external build goes through Beta App Review).
- [ ] Payments: App Store Connect's Paid Apps agreement, tax and banking; the Small Business Program (15%); a RevenueCat account.
- [ ] Before App Store review: a Sign in with Apple key, so deleting a passport can revoke the Apple token.
- [ ] Before charging anyone: Vercel Pro (Hobby is non-commercial).
- [ ] Later: a staging copy of the site API (so staging builds can run Plan it), a Google OAuth client, the Twilio decision for texted codes, a PowerSync account for the offline-sync trial.

## Next

1. Payments and the required 7-day trial (`docs/plans/active/conversion.md`, phase 2).
2. The App Store release after TestFlight.
3. Measurement before the content push: funnel and retention queries, events for the signed-out Application, web error reporting.
4. State of the Union (the Monday email), then syllabus import (its route is switched off until then; turning it back on is in `DECISIONS.md`).

Known limits and what's out of scope: `DECISIONS.md`.
