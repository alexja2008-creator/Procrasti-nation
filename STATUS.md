# Status

As of 2026-10-19. Rewrite this file every Monday (replace, don't append); history lives in git, `CHANGELOG.md` and `docs/archive/`.

## Live

- **Web:** v2 merged to `main` on 2026-10-14 (PR #12). procrasti-nation.work is the landing page, privacy policy and terms; app.procrasti-nation.work is the app. Free-only; v1's pages redirect to the app. The same day: the Application asks for a name (PR #16); every day ends at midnight unless chosen otherwise (PR #14, merged just before); the legal audit's fixes, including the age check before any account (PR #13); a plan is one row on Today (PR #17). On 2026-10-15, saving the passport became required before Today, with a "Check your email" card until the link is opened (PR #19, #20; `docs/plans/active/required-save.md`), after family testers skipped saving. On 2026-10-15 and 16, fixes from more family testing (`docs/plans/shipped/dates-and-repeats.md`):
  - The + sheet understands repeats as people say them ("every M/W/Sat", "gym tue/thu") and has a Due · Today · Tomorrow · Pick a date row (PR #24).
  - A day is Today, Tomorrow or a calendar everywhere. Other time is an hour grid on the web and iOS's own wheel on iPhone (PR #26).
  - Moving a plan's step later asks to move the rest, and a plan starts on its task's When day (PR #27).
  - A task can be renamed from its page or a row's menu, and Repeat → Pick days… sets a repeat's days (PR #28).
  - The planner's "no alarms" rule failed its eval and is parked. The eval check stays (PR #25).
  - How to use ProcrastiNation: a short guide behind a "?" beside the magnifier and in Settings → Help, saying PN's own words (Customs, Territories, plans, Declarations…) in everyday ones, after a family tester found them confusing (PR #32, `docs/plans/shipped/how-to-use.md`).
- **iPhone:** TestFlight builds 1–4 ran on staging and were checked on Alex's iPhone (reminders, password reset, Declarations stamp, theme). The production build is on TestFlight too (2026-10-14, checked on Alex's iPhone). Production build 8 (EAS, 2026-10-16, from PR #32's merge) has required saving, the dates-and-repeats fixes, Upcoming's repeat turns (PR #31) and the How to use guide.
- **Beta:** 10 students lined up. TestFlight's external group has a public link (Claude found its join page live on 2026-10-19), and a student poster carries it as a QR code. The feedback form is ready, sent after about a week. The form, the poster and the business plan (its section 10, Launch checklist, holds the business and marketing to-dos) are kept privately (`docs/external.md`). Go/no-go gate: at least 4 of 10 started something they'd avoided, and NPS of 30 or more.

## This week

- Alex's feedback on Plan it: the answers to its questions wrap and the boxes grow to fit, the page scrolls to the buttons, and Return moves to the next question (PR #36).
- Alex's feedback on Today: Show steps keeps a plan's finished steps, struck through, with when each was done, and counts what's left for today (PR #35). Checked on the iOS Simulator too (2026-10-20).
- Start Mode's timer runs for a step's estimate, from Alex's feedback (2026-10-20, `docs/plans/shipped/step-timers.md`, PR #37).
- The dates rethink, from Alex's feedback (2026-10-20, `docs/plans/shipped/start-and-due.md`): "When" is now Start and leads, Due is optional, the + sheet asks Start · Today · Tomorrow · Pick a date · Later, and a due date fills in a start day (PR #38). Monthly repeats understand the 1st, the last day and the third Tuesday, typed or from Repeat → Every month…, and the 31st no longer slides to the 28th (PR #39 and the plan's last PR). A repeat moved off its days rings on the day it shows.
- The business plan and beta form brought up to date, with a launch checklist for the business and marketing to-dos (kept privately, `docs/external.md`). `supabase/v2/heard-from.sql` counts the Application's "Where did you hear about us?" answers for the funnel model.

## Open items for Alex

- [x] Start Mode on a plan, checked on the web and the iOS Simulator (Claude, 2026-10-20): a first step counts down from its estimate (3:00), later steps too (60 and 90 min), and a 90-minute step's "1:29:59" fits inside the ring with "An hour and a half." under it.
- [ ] On the next TestFlight build (build 8 predates PR #37), Start Mode on a plan on a real iPhone, including a later step with no estimate (it should get 25 minutes; no step in Alex's staging plans lacks an estimate, so this hasn't been seen anywhere).
- [ ] Beta Pro ends at the close of November 15, 2026 (`BETA_PRO_UNTIL` in `packages/core/src/account.ts`): before then, move the date or let the free tier's 2 plans a month return.
- [x] Production's Change Email Address template has our subject and body (Alex, 2026-10-15).
- [ ] On build 8 (TestFlight), check what only the iPhone shows:
  - the time wheel inside When, Due and a Declaration
  - the + sheet's month with the keyboard up
  - the rename button and Pick days…
  - a renamed task's reminder ringing with its new title
  - the How to use guide from the "?" (a modal: Close and swipe down)
  - that `@expo/ui` 57.0.25 runs; the Simulator only ran it on the older build's 57.0.21 (`docs/plans/shipped/dates-and-repeats.md`, Phase 2)
- [x] Plan it's answer boxes on the iOS Simulator (PR #36; Claude, 2026-10-20): Return moves down through the questions and Done on the last one closes the keyboard, a box below the keyboard scrolls into view when it's focused, and a box keeps growing with the keyboard up.
- [ ] On the next TestFlight build, the dates rethink on iPhone (`docs/plans/shipped/start-and-due.md`): the + sheet's Start row with Later and Add a due date (how tall it gets on a small iPhone with the keyboard up and the Due row open), the Due notice's Undo on a task's page, and Repeat → Every month….
- [ ] On staging, the dates-and-repeats checks that make real data (`docs/plans/shipped/dates-and-repeats.md`, phases 2 and 3):
  - the Oath page on a new passport (nothing pre-selected, Pick a date)
  - Plan it on a task with a later When day (the steps start that day)
  - signing a later Declaration on a plan's step (the notice asks to move the rest)
- [ ] On production, a query for repeating tasks that already have plan steps. Each shows "Mark plan done" on every later turn; nothing new can make one. The plan's "Found in passing" has the details.
- [ ] The planner's "no alarms" rule is parked. After the beta's first week, run `supabase/v2/planner-reminders.sql` in the production SQL Editor (read-only; set `since` to the beta's start) to see how often real plans suggest alarms or other apps. Then try a second wording (about $3 to run it twice against a baseline) or leave it; the plan's Phase 5 has the options.
- [ ] Check that an unsaved passport from before 2026-10-15 opens on Save your passport: the two family testers' passports, the next time they open the app.
- [ ] A monthly spend limit on the Anthropic workspace (beta Pro lets every passport make up to 20 plans a day).
- [ ] Confirm the cutover's step 10 is done: `RESEND_API_KEY` deleted from the site's Vercel env (`docs/runbooks/launch-2026-10.md`, Phase 3). The smoke test passed on 2026-10-14.
- [ ] Before students get the build: `work.procrastination.app://auth/callback` on production's Supabase redirect list and the Apple provider on production (if not done at cutover), then confirm build 8 is in TestFlight's external group, past Beta App Review (the group and its public link exist).
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
   - Move to… on a repeating task can pick a day that isn't one of its days (it now rings there; whether Move to… should snap to one of its days is still open).
   - Older quick-add misreads ("Monday meeting notes").
   - Space doesn't tick a toggle on the web.
   - Chips are shorter than the 44pt tap target.
   - A rename that fails to save keeps showing the typed text on the task page.
6. A polish from the Simulator check (2026-10-20): on iPhone, Plan it's focused answer box stops with its bottom edge just under the keyboard (the line being typed stays visible; PR #36).

Known limits and what's out of scope: `DECISIONS.md`.
