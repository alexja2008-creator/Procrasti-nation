# Plan: keep only the tests that matter

## Overview
The automated tests went from 15 to 166 in core in two weeks (206 counting the database and push tests), because two written rules ask for a test for every new behavior. This plan cuts them to the ones that guard against quiet harm, plus the most visible nice-to-haves, and changes the rules so the count doesn't creep back. Alex asked for it on 2026-10-16.

What they cost today, measured on 2026-10-16: core 0.3 s (the only suite the commit hook runs), database 1.6 s, push 0.25 s, the app's type check and lint about 3 s. Speed isn't the problem. The cost is upkeep: a test that pins a label or a screen's order has to be rewritten every time that copy or layout changes, so each change gets bigger.

## Decisions (Alex, 2026-10-16: approved as revised, recommendations included)
- **What stays.** A test stays for one of six reasons.

  **Critical**, because breaking what it checks would quietly do one of these to a real person:
  1. **Privacy or security:** someone sees or changes another person's data, or a server-only field or a signed token can be forged.
  2. **Data loss or silent corruption:** a save, an undo, a bulk move, the export, account deletion or paging loses or rewrites something.
  3. **Law or access:** the age check, required saving, free-plan limits, beta Pro.
  4. **Reminders:** something rings at the wrong time (time zones, daylight saving), twice, or not at all, or a notification carries Done.
  5. **A written rule that points at the test** (`DESIGN.md` against `tokens.ts`).

  **Nice to have, kept because it's the most visible** (Alex, 2026-10-16):

  6. **What every person sees most.** That means Today, the + sheet, the lock screen, the Plan it pill, Start Mode's clock, the Application and saving the passport, and Upcoming. A wrong answer there would look broken to everyone, or break the no-guilt voice.

  Everything else goes: copy and layout on screens people visit less, picker helpers, edge cases of a kept rule, and anything another kept test already covers.
- **Close calls (my recommendation in bold):**
  - `quick-add`. **Keep 12 of 21**: the false-positive guards, the main tables, and three phrasings everyone types ("next fri", a daily time that has passed, the + sheet's Due row).
  - `upcoming`, shipped today in PR #31. **Keep 2 of 11**: done and deleted items stay hidden, and a repeat's turns show in the week ahead.
- **The one-off database scripts.** `02_backfill.sql` never ran and v1's data is gone; `04_fresh_start.sql` ran once and must never run again; `99_rollback.sql` would now destroy real people's v2 data. Their tests go. Should the scripts also move to an archive folder, so nobody runs them by mistake? (**Yes**, in a separate PR.)
- **The rules that grow the suite.** `packages/core/CLAUDE.md` says "every exported rule that decides behavior gets a test", and `code-reviewer` flags "new behavior in packages/core without a test". **Both change:** a test is required for reasons 1–5. A reason 6 test is added only after that bug has reached a real person, so it can't come back. The reviewer stops asking for tests of copy, labels, layout or ordering otherwise.

## What stays and what goes

### `packages/core/test` (166 → 86, plus 2 of `guide`'s 6: 88)

"Visible" marks the tests kept for reason 6.

| File | Keep | Kept, and why | Cut |
|---|---|---|---|
| `account` | 9 of 16 | "anything else is generic, never a crash"; "texted codes go to US and Canadian numbers" (a code sent to the wrong number); "free plans come in 30.5-day windows"; "a date of birth is a real day"; "the age check counts whole years"; "a failure on Supabase's side is a 5xx" (decides who gets in during a mail outage); both beta Pro tests. **Visible:** "an email in the username box moves whole…" (everyone saves a passport; a family-testing fix) | password length, username rule, both auth-error mappings, name trimming, spotting an email, suggesting a username |
| `agenda` | 5 of 11 | "Today: timed first, missed items roll forward, finished-today last" (nothing vanishes from Today). **Visible:** "up next: deadlines first…"; "plan steps: the most urgent open step is the next small step"; "Today groups each plan into one item…"; "Start on a plan starts its next open step; a plan finishes only when asked" | step context, earlier finishes counting, timed sort, a task's time on its day, a plan waiting to be marked done, a due plan listing its steps |
| `appearance` | 0 of 4 | | file deleted |
| `briefing` | 4 of 8 | "Today keeps the time; Pick a day and Let it go clear a deadline that passed" (Let it go must not erase a future deadline); "Re-spread the rest…" (moves a whole plan); "Undo writes back exactly the fields a patch changed". **Visible:** "the recap says what yesterday held…and nothing at zero" (no-guilt voice) | carried-over rules, grouping, picks, "long" threshold |
| `dates` | 6 of 6 | the four repeat-math tests (weekly days, intervals, missed turns, month-end clamping). **Visible:** "day labels"; "mid-sentence day phrases" (Today, Tomorrow and weekday names on every row) | |
| `declarations` | 0 of 5 | | file deleted (the database's Declaration-needs-a-time check goes too, see below) |
| `design-md` | 5 of 5 | the written rule in `CLAUDE.md` | |
| `guide` | 2 of 6 | Added by PR #32 after the audit; same reasons. "the guide never sounds like a scolding" and "the AI button is always Plan it" (both written rules in `CLAUDE.md`) | the confusing-words list, the iPhone and web wording, section titles, the typed examples (the guide isn't a most-seen screen; `quick-add` keeps its own checks) |
| `export` | 1 of 3 | "the export: everything kept, nothing deleted" (the Download your data promise) | note-as-text (covered by the kept test), file name |
| `notes` | 5 of 7 | parse/write-back round trip; checklist line conversions; "a note has content…" (decides whether a note is empty); title split/join round trip; "notes page newest first, ties broken by id" (paging can't skip a note) | cursor line, list order and progress |
| `onboarding` | 7 of 13 | "coming back picks up at the first page not done"; "a passport that holds the Oath's plan…comes back to saving it"; "the pages turn in order…" (all three: nobody gets past the age check or skips saving); "changing hours moves the morning list only while it is off" (the day ends at midnight; a chosen time isn't overwritten). **Visible:** "every answer option has words…"; "the Oath: a typed date wins…"; "the Oath plans one go at a repeat…" (everyone's first plan) | numbering, help cards, first week, territories, morning times, first Declaration |
| `plan-offer` | 3 of 4 | **Visible:** "Plan it is offered for big or vague tasks" and "errands never get Plan it" (both read `plan-offer-cases.ts`, which stays); "a row offers Plan it only on a big task of their own with no plan yet" | the way a title is typed |
| `planning` | 6 of 12 | fallback step dates (never past the deadline); "moving a step later moves the steps after it"; "never pass the deadline"; "keeps its time across the end of daylight saving"; "nothing follows a move earlier…or declared"; "Plan it starts on the task's When day" | minutes parsing (backfill-only), Customs, sort order, out-of-order, squeezing, keeps-its-time (the DST test covers it) |
| `quick-add` | 12 of 21 | the two-or-more-days table; "one day stays a one-off…"; "lists of days that are not repeats"; "a note's checklist line only repeats when it says every/each"; due dates; the dates-and-times table; both "titles left alone" tables; "a parse's schedule as task fields". **Visible:** "a daily time that already passed starts tomorrow"; "next fri means the following week"; "the capture sheet's day row makes it due that day…" | repeats with a time, repeat variants, every other, repeats with no days, "daily" before a time, nothing left for a title, `parseWhen`, preset day, #tags |
| `reminders` | 13 of 13 | rings at its time and never for finished or deleted items; timed deadline rings once; repeats ring each turn; the cap; both reconciling tests; snooze; checking off a repeat moves it on; the sender's window; time zones across daylight saving. **Visible**, the words on the lock screen: "plan steps say which step of which plan"; "the morning list counts the day…"; "the morning list speaks in their nudge tone" | |
| `search` | 0 of 3 | | file deleted (who can search what stays tested in the database) |
| `start-mode` | 2 of 5 | **Visible:** "the clock is wall time minus pauses"; "clock labels" | default minutes, leaving early or late, stamp dates |
| `territories` | 1 of 5 | "Customs: undated, unfiled…the same items Today shows" (an unfiled task always has a home) | summaries, steps' territory, territory page, #tag matching |
| `upcoming` | 2 of 11 | **Visible:** "nothing from today or earlier; finished and deleted items hidden"; "a repeat shows each turn in the week ahead…" | range, preview words, preview across DST, moved turns, deadlines, plans, order in a day, day labels, calendar dots |
| `when` | 5 of 14 | "when and due patches"; "a repeat moves the task to its first day…"; "picking a weekly repeat's days" (the rule that gets saved); "saving a repeat that hasn't changed moves nothing"; "changing a repeat's days lands on the first new day from today" | chips, time grid, hour picking, month grid, slots, three every-other-week variants, week strip |

### `supabase/v2/test/migration.test.mjs` (17 checks → 10, run on each baseline)

Kept: the profiles billing lock (both), schema idempotent and citizen numbers, RLS and ownership, plan generations never erased, AI requests never erased, Start Mode (it also checks nobody can start or see another person's sessions), web push ownership, search finds only your own rows, account deletion. The profiles-lock check is renamed "the v2 migration keeps the profiles lock". Nothing here is visible to people using PN, so reason 6 adds nothing.

Cut: both backfill tests, schools/teacher visibility (Alex: don't build on schools), the Declaration-needs-a-time constraint, rollback, the planner-reminders query (a one-off read for a decision), the fresh start. Seed rows that only the cut checks use are removed; the v1 `steps` seed stays if the kept checks read those rows.

### `apps/site/test/push.test.mjs`: 4 of 4 kept
Snooze tokens can't be forged, time zones, the morning window, and never Done on a notification.

## Files to create or modify
| File | Action | What changes |
|---|---|---|
| `packages/core/test/*.test.ts` | Modify / delete | as in the table; `appearance`, `declarations` and `search` deleted |
| `supabase/v2/test/migration.test.mjs` | Modify | 7 checks out, the header comment updated |
| `packages/core/CLAUDE.md` | Modify | the test rule becomes the six reasons, with reason 6 only after a bug reached a real person |
| `.claude/agents/code-reviewer.md` | Modify | "New behavior without a test" only for reasons 1–5; no tests asked for copy, labels, layout or ordering unless that bug already reached someone |
| `DECISIONS.md` | Modify | the six reasons as Alex's call; "02_backfill.sql stays…tested" becomes "untested" |
| `supabase/CLAUDE.md`, `supabase/v2/README.md` | Modify | backfill, rollback, fresh start and planner-reminders no longer tested |

## Phases
1. Approve this list (the Decisions above).
2. One PR: delete and trim the tests, update the rules and docs. Check: `npm run core:test`, `db:test`, `site:test` and `app:check` pass; CI is green; the `code-reviewer` runs before the commit.

   **Built 2026-10-16.** Core runs 88 tests (86 from the list above and 2 from `guide.test.ts`, which arrived with PR #32 during the audit). The database runs 10 checks a baseline, 22 in all with production's structure, and push runs 4. The RLS check no longer leans on the backfill: it adds A's two steps itself. `docs/architecture.md`'s guide entry says what its test still checks.
3. A separate PR if Alex says yes: move the backfill, rollback and fresh-start scripts to an archive folder.

## Risks
- A bug in a cut area reaches production without a test catching it. The cut areas are less-visited screens and edge cases; family testers and the beta students would see them, and the bug then earns a test under reason 6.
- Git keeps every deleted test, so any of them can come back with one checkout.

## Done when
- [x] Core runs 88 tests, the database 10 checks a baseline, push 4; all pass locally.
- [ ] CI is green on the PR.
- [x] `packages/core/CLAUDE.md` and `code-reviewer` ask for tests only under the six reasons, reason 6 only after a bug reached someone.
- [x] No doc says a cut test exists.
