# Status

As of 2026-10-16. Rewrite this file every Monday (replace, don't append); history lives in git, `CHANGELOG.md` and `docs/archive/`.

## Live

- **Web:** v2 merged to `main` on 2026-10-14 (PR #12). procrasti-nation.work is the landing page, privacy policy and terms; app.procrasti-nation.work is the app. Free-only; v1's pages redirect to the app. The same day: the Application asks for a name (PR #16); every day ends at midnight unless chosen otherwise (PR #14, merged just before); the legal audit's fixes, including the age check before any account (PR #13); a plan is one row on Today (PR #17). On 2026-10-15, saving the passport became required before Today, with a "Check your email" card until the link is opened (PR #19, #20; `docs/plans/active/required-save.md`), after family testers skipped saving. On 2026-10-15 and 16, fixes from more family testing (`docs/plans/shipped/dates-and-repeats.md`):
  - The + sheet understands repeats as people say them ("every M/W/Sat", "gym tue/thu") and has a Due · Today · Tomorrow · Pick a date row (PR #24).
  - A day is Today, Tomorrow or a calendar everywhere. Other time is an hour grid on the web and iOS's own wheel on iPhone (PR #26).
  - Moving a plan's step later asks to move the rest, and a plan starts on its task's When day (PR #27).
  - A task can be renamed from its page or a row's menu, and Repeat → Pick days… sets a repeat's days (PR #28).
  - The planner's "no alarms" rule failed its eval and is parked. The eval check stays (PR #25).
- **iPhone:** TestFlight builds 1–4 ran on staging and were checked on Alex's iPhone (reminders, password reset, Declarations stamp, theme). The production build is on TestFlight too (2026-10-14, checked on Alex's iPhone). Required saving and the dates-and-repeats fixes reach the iPhone with the next build, before the students get it.
- **Beta:** 10 students lined up; TestFlight's external group for them isn't set up yet (`docs/runbooks/launch-2026-10.md`, The iPhone track). The feedback form is ready (kept privately; see `docs/external.md`), sent after about a week. Go/no-go gate: at least 4 of 10 started something they'd avoided, and NPS of 30 or more.

## This week

- Restructure (`chore/restructure-for-launch`): docs moved into `docs/`, short CLAUDE.md files, v2 subagents, CI, hooks. The repo moved out of iCloud to `~/PNDEV/Procrasti-nation` (the iCloud copy is in the Trash; Claude Code's memory came across). Merged branches deleted; unmerged ones kept as `archive/*` tags.

## Open items for Alex

- [ ] Beta Pro ends at the close of November 15, 2026 (`BETA_PRO_UNTIL` in `packages/core/src/account.ts`): before then, move the date or let the free tier's 2 plans a month return.
- [x] Production's Change Email Address template has our subject and body (Alex, 2026-10-15).
- [ ] On the next TestFlight build, check what only the iPhone shows:
  - the time wheel inside When, Due and a Declaration
  - the + sheet's month with the keyboard up
  - the rename button and Pick days…
  - a renamed task's reminder ringing with its new title
  - that `@expo/ui` 57.0.25 runs; the Simulator only ran it on the older build's 57.0.21 (`docs/plans/shipped/dates-and-repeats.md`, Phase 2)
- [ ] On staging, the dates-and-repeats checks that make real data (`docs/plans/shipped/dates-and-repeats.md`, phases 2 and 3):
  - the Oath page on a new passport (nothing pre-selected, Pick a date)
  - Plan it on a task with a later When day (the steps start that day)
  - signing a later Declaration on a plan's step (the notice asks to move the rest)
- [ ] On production, a query for repeating tasks that already have plan steps. Each shows "Mark plan done" on every later turn; nothing new can make one. The plan's "Found in passing" has the details.
- [ ] The planner's "no alarms" rule is parked. After the beta's first week, run `supabase/v2/planner-reminders.sql` in the production SQL Editor (read-only; set `since` to the beta's start) to see how often real plans suggest alarms or other apps. Then try a second wording (about $3 to run it twice against a baseline) or leave it; the plan's Phase 5 has the options.
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
5. Small follow-ups from family testing, listed in `docs/plans/shipped/dates-and-repeats.md` (Risks, "Found in passing", and the phases' "Known" notes):
   - Move to… on a repeating task can pick a day that isn't one of its days.
   - Older quick-add misreads ("Monday meeting notes").
   - Space doesn't tick a toggle on the web.
   - Chips are shorter than the 44pt tap target.
   - A rename that fails to save keeps showing the typed text on the task page.

Known limits and what's out of scope: `DECISIONS.md`.
