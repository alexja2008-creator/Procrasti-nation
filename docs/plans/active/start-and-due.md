# Plan: Start and Due, and monthly repeats

**Status: approved by Alex on 2026-10-20, defaults included, with the name Start.** Alex picked the direction the same day, after the options page (When and Due: <https://claude.ai/artifact/FcgQGbVQcVHdydtLQxENxn>, private to Alex).

## Overview

Alex's feedback (2026-10-20): "Scheduling 'When' slash due dates continues to be a prickly thorn in our side." A roommate suggested "first of the month" and "last day of the month" for some recurring tasks.

Today a task has two dates of equal weight, When and Due, and where a day is picked decides which one it sets: typing "essay fri" sets When, tapping Fri in the + sheet's row sets Due, Upcoming's "+" sets When, the Oath sets Due. A task with only a deadline stays off Today until the day it's due. Monthly repeats are thin: "pay rent every month on the 1st" repeats on the day it was typed, with "on the 1st" left in the title.

This plan makes **Start** (the day you’ll start it: your promise) lead, and **Due** (when it has to be done: the fact) optional. Every task added from the + sheet gets a Start choice, Later included. A deadline never sits without a start date: PN fills one in, which the person can change. Then monthly repeats learn the 1st, the last day and "the third Tuesday".

Alex confirmed the pain points the options page listed (2026-10-20).

## Decisions (Alex, 2026-10-20)

1. **Start leads, Due is optional.** When is renamed **Start** everywhere it’s a label (Alex chose it over Do: Do and Due look and sound alike). Due keeps its name. A Declaration is the formal version of the same Start: a time and a signature (it already writes this date).
2. **Every task added from the + sheet gets a Start choice**: Today · Tomorrow · Pick a date · **Later**. Nothing is picked at first, and Enter with nothing picked adds the task straight away with no day, as now (to Customs, or its territory). Later says the same thing out loud. Alex chose this over a strict version where Enter waits for a pick.
3. **A deadline never sits without a start date.** When a task gets a Due and has no Start, PN fills one in, shown before it's saved and changeable.
4. **Monthly repeats (option E) are in**: the 1st, the last day and the nth weekday, in the Repeat sheet and typed. Not as cards beside Today and Tomorrow.

### Claude's defaults (stand unless Alex changes them)

- **D1. The filled-in Start.** The day before the Due. Today when the Due is today or tomorrow. Today when the title sounds big enough for a plan (`suggestsPlan`, the check behind the Plan it pill), since big work goes better started early (the planning fallacy). Never before today.
- **D2. The + sheet's rows.**
  - A **Start** row: Today · Tomorrow · Pick a date · Later.
  - Under it, a quiet **Add a due date** that opens a **Due** row (Today · Tomorrow · Pick a date). Typing "due fri" or "by fri" fills the Due itself, and the link steps aside.
  - Typed words win, as now: a typed day hides the Start row, a typed deadline hides the Due link, a repeat hides both ("Starts Sat").
  - A filled-in Start shows picked in the Start row, with a line under it: "The day before it's due." Tapping another day, or Later, replaces it.
- **D3. Upcoming's "+"** shows the Start row with that day picked, instead of hiding the row, so the same rule holds everywhere.
- **D4. Plan it from the + sheet ignores a filled-in Start** the person didn't touch: a plan dates its own steps, from today up to the Due. A Start they picked still starts the plan on that day (Alex's 2026-10-15 rule).
- **D5. Setting a Due on the task page** of a one-off with no Start (not a step, no plan, no repeat) fills in the Start as in D1, and the notice says so with Undo: "Start Thu, the day before it's due."
- **D6. Labels.** The task page reads **Start** and **Due**. Its empty Start reads **Later**, and the Start sheet's No date chip reads Later.
- **D7. Exempt from the Start choice:** a note's checklist lines (they live in their note), plan steps (their plan dates them), the Oath (it always makes a plan).
- **D8. Monthly repeats in the Repeat sheet.** "Every month" becomes **Every month…**, which opens choices worked out from the task's day: "On the 20th", "On the third Tuesday", "On the last Tuesday" (when the day is one), "On the 1st", "On the last day". Duplicates are dropped (on the 1st, "On the 20th" and "On the 1st" are one row).
- **D9. A monthly day past the month's end lands on its last day**: "every month on the 31st" rings on 30 Nov and 28 Feb. (iCalendar's own rule skips such months; PN works out every turn itself, so nothing outside PN reads the rule.) "The fifth Tuesday" isn't offered.
- **D10. Monthly repeats store their day in the rule** (`BYMONTHDAY=20`, `BYMONTHDAY=-1` for the last day, `BYDAY=3TU`, `BYDAY=-1FR`), so checking one off can't slide it from the 31st to the 28th. Old rules without a day (`FREQ=MONTHLY`) keep working as now, and the Repeat sheet shows them as their current day.
- **D11. Typed monthly repeats** need a cue (every, each, monthly, "of every month"), like every repeat today:
  - "every 1st", "every 15th", "every 1st and 15th", "every month on the 15th", "monthly on the 1st", "on the 1st of every month"
  - "last day of every month", "every month on the last day"
  - "every last friday", "every first monday", "every 3rd tue", "the last friday of every month"
- **D12. "The 28th" as a one-off day** counts after on, due, by or before ("dentist on the 28th", "lab report due the 28th"), and means the next 28th from today. Without a cue it stays in the title, so "Read the 3rd chapter" and "Finish the 2nd draft" stay titles.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `packages/core/src/quick-add.ts` | Modify | `withDay` replaces `withDue`: a tapped Start and a tapped Due, typed words winning, the filled-in Start (D1); one-off "the 28th" (D12); monthly rules typed without a day get one (D10) |
| `packages/core/src/when.ts` | Modify | `fillStart` (D1); `monthlyChoices(anchor)` (D8); the `monthly` repeat chip carries its day |
| `packages/core/src/dates.ts` | Modify | `parseRRule` reads `BYMONTHDAY` and numbered `BYDAY`; `occurrenceOnOrAfter` and `describeRRule` handle them (D9, D10) |
| `packages/core/src/quick-add-repeat.ts` | Modify | The monthly grammar (D11) |
| `packages/core/src/nation.ts` | Modify | Copy (below); the How to use guide's capture section and its Task line |
| `packages/core/test/quick-add.test.ts` | Modify | `withDay` replaces the `withDue` cases; monthly phrases; titles that must stay titles |
| `packages/core/test/dates.test.ts`, `reminders.test.ts` | Modify | Monthly turns and the reminders they ring (month ends, leap day, the November daylight-saving change, check-off without drift) |
| `apps/app/src/components/capture.tsx` | Modify | The Start row with Later, Add a due date and the Due row, the filled-in Start, Upcoming's day (D2, D3, D4) |
| `apps/app/src/app/task/[id].tsx` | Modify | Start and Due labels; Due fills in the Start with a notice and Undo (D5, D6) |
| `apps/app/src/components/day-picker.tsx` | Modify | The "none" chip can read Later (D6) |
| `apps/app/src/components/row-menu.tsx` | Modify | Move to…'s sheet title reads Start |
| `apps/app/src/components/task/repeat-sheet.tsx` | Modify | Every month… and its choices (D8) |
| `DECISIONS.md`, `CHANGELOG.md`, `STATUS.md`, `docs/architecture.md` | Modify | Below |

No new files. `docs/architecture.md` changes only if a module's description does.

## Phases

Three pull requests, one after another: phases 1 and 2 share `quick-add.ts` and `nation.ts`, and phase 3 needs phase 2's rules. None of it reaches the iPhone until the next TestFlight build.

**Phase 1: Start leads** (decisions 1–3, D1–D7)

- **Core:** `withDay` and `fillStart`, the copy, the guide.
- **App:** the + sheet's Start row, Later, Add a due date and the filled-in Start; Upcoming's "+"; Plan it ignoring an untouched filled-in Start; the task page's labels and the Due notice; Move to…'s title.
- **Checked:**
  - Core tests: `withDay` replaces `withDue`'s cases (typed words winning, a time alone going with the picked day) and adds the filled-in Start, around midnight and a later day end.
  - `npm run app:check`.
  - In the browser pane, at phone and laptop width, Night and Day:
    - "Buy shampoo" + Enter lands in Customs. Later says the same.
    - "Read ch 4 due fri" shows Due Fri and Start picked on Thursday, with the line. Tomorrow replaces it.
    - "Essay due fri" shows Start today (an essay sounds big enough for a plan).
    - Add a due date opens the Due row.
    - Plan it on "Essay due fri" starts the steps today.
    - Upcoming's "+" shows the Start row with its day.
    - The task page reads Start and Due.
  - Anything added on Alex's staging account is deleted afterwards.
  - The `code-reviewer` subagent.
- **Needs Alex:** the iPhone look with the next TestFlight build.
- **Built 2026-10-20 (`claude/when-dates-rethink-5d5bcc`).**
  - **Core:** `fillStart` in `when.ts`; `withPicks` (with `namesItsStart`, `namesItsDue` and `DayPicks`) replaces `withDue` in `quick-add.ts`. A parse can say its time belongs to the deadline (`dueTime`), so "essay due fri 5pm" with a start filled in is still due at 5.
  - **Changed from the plan:** the + sheet's line also shows when the filled-in start is today ("Today, so there's time before it's due."), so a picked Today never looks like a mistake. The task page's notice says the same.
  - **Checked:**
    - Core tests (93): picks, typed words winning, the filled-in start (the day before, big work, due tomorrow, Later), where a time goes, and the filled-in start at 1:30 AM with the day ending at 3 AM and across the November clock change.
    - `npm run app:check`.
    - In the browser pane, on Alex's staging account:
      - "Read ch 4 due fri" picked Thu with "The day before it's due."; "Essay due fri" picked Today with its line and led with Plan it.
      - "Buy stamps" with Later showed Lands in Customs; Add a due date, Due Tomorrow, then unpicking Later filled in Today.
      - Added it: Today said "Added to Today." Its page read Start Today, Due Tomorrow. Start → Later, then Due → Fri 23 Oct said "Start Thu, the day before it's due." with Undo, and Undo left Start Later and Due Fri. The task was then deleted.
      - Upcoming's "+" on Thu 22 Oct, at phone width: the Start row opened on Thu, and "Lab report due fri" kept Thu with Due Fri.
      - No console errors.
  - **From review (the `code-reviewer` subagent), fixed:**
    - "Read ch 4 this evening due fri" starts this evening (it had filled in Thursday with a 7 PM reminder). Tested.
    - Plan it from the + sheet keeps a filled-in start on the task, so leaving Plan it doesn't leave a deadline with no start; the plan page gets `fromToday=1` and dates the steps from today.
    - A repeat's Start sheet and Move to… keep saying No date, not Later, since clearing a repeat's start ends the repeat.
    - The task page doesn't fill in a start for a note's checklist line, for a due day already gone, or when only the due's time changes.
    - A typed deadline on a typed repeat ("Essay every mon due fri") is kept, as before.
    - The day row is its own file, `components/capture-day-row.tsx`; Add a due date puts the cursor back; Upcoming's day chip goes when Later is picked.
  - **Rechecked:** core tests (94), `npm run app:check`, and the + sheet from Upcoming's "+" in the browser pane.
  - **Not checked:** Plan it from the + sheet (it makes a real plan), Move to…'s sheet title by eye, Day theme by eye (the rows use existing tokens), and the iPhone (next build). How tall the + sheet gets on a small iPhone with the keyboard up and the Due row open is for the TestFlight check.
  - **Found in passing:** quick add reads "today" from the clock, not the person's day, so with a day ending after midnight, "this evening" typed at 1 AM lands on the clock's day ("Tomorrow" on Today's terms). Older than this change.

**Phase 2: Monthly repeats in core and quick add** (decision 4, D9–D12)

- **Core:** the rule's monthly parts, their turns and their words ("Every month on the 1st", "Every month on the last day", "Every month on the third Tue", "Every 2 months on the 15th"); typed monthly repeats carry their day; the grammar; "the 28th".
- **Checked:**
  - Reminder tests (required: a reminder ringing on the wrong day is one of the six reasons):
    - The 31st rings on 30 Nov, 31 Dec and 28 Feb, and is back on the 31st in March after being checked off each month.
    - The last day rings on 29 Feb 2028.
    - "On the 1st at 9am" rings at 9 AM local on 1 Nov 2026, the night after clocks go back in New York.
    - The third Tuesday, the last Friday.
  - Quick add: every phrase in D11 and D12, and about 30 fresh titles with ordinals or "last" that must stay titles.
  - `npm run site:test` (the Web Push sender works out turns with core too) and `npm run app:check`.
  - The + sheet's chips in the browser pane ("Every month on the 1st", "Starts Sun 1 Nov").
  - The `code-reviewer` subagent.
- **Needs Alex:** nothing beyond the PR review.

**Phase 3: Every month… in the Repeat sheet** (D8)

- **App:** the Repeat sheet's monthly choices; an old plain monthly rule shows as its current day.
- **Checked:** core tests for `monthlyChoices` (the 20th, the third and last Tuesday, the 1st, the last day, no duplicates). In the browser pane: the choices for a task on Tue 20 Oct, Sat 31 Oct and Sun 1 Nov, and where saving one lands (`repeatPatch`, the first matching day on or after the task's day). Read-only on staging unless a test task is made and deleted. The `code-reviewer` subagent.
- **Needs Alex:** the iPhone look with the next TestFlight build.

**After shipping:** `DECISIONS.md` replaces "The + sheet asks for a due date with taps" with decisions 1–3 and adds decision 4; "Looks wrong, isn't" gets D9 and D10. `CHANGELOG.md` and `STATUS.md` say what shipped. This plan moves to `docs/plans/shipped/`.

## Data and copy

**Database:** no change. `tasks.rrule` is text, and the new monthly parts are written into it. Nothing is migrated: existing tasks keep their dates, and a task with only a Due still shows on its due day.

**Copy** in `nation.ts`, no guilt:
- **Start**, **Later**, **Add a due date**.
- The filled-in line: "The day before it's due.", or "Today, so there's time before it's due."
- The notice: "Start Thu, the day before it's due." with Undo.
- **Every month…** and its choices: "On the 20th", "On the third Tuesday", "On the last Tuesday", "On the 1st", "On the last day".
- The guide: "Give it a Start day (the day you’ll start it), or Later. A due date is optional; with one, PN fills in a Start day before it."

**Privacy:** nothing new is collected, and nothing new goes to Anthropic. The policy doesn't change.

## Risks

- **The filled-in Start is wrong for a task.** It's shown before saving and changes with one tap. If testers keep changing it, try two days before, or use the estimate.
- **Later becomes the habit**, and Customs fills up. That's what Enter does today, so nothing gets worse. After the beta's first weeks, count how many new tasks have no Start.
- **A title read as a monthly repeat** ("every 1st draft"). The cue rule and the title tests guard it, and the chips show what was understood before Add.
- **Old plain monthly rules** that already slid to the 28th stay there. Few exist; editing the repeat fixes one.
- **`nation.ts` changes in the sibling sessions' PRs** (step timers, finished steps on Today). Each phase merges the base branch before its PR.

**Left out on purpose:** changing one turn of a repeat versus the whole series (which would also settle Move to… on a repeat), and plans on repeats. Both change how repeats are stored, and the repeat-previews plan already parked them.

## Done when

- [ ] The + sheet offers Start: Today · Tomorrow · Pick a date · Later, and Add a due date. Enter with nothing picked still adds at once.
- [ ] Typed on Tuesday, "Read ch 4 due fri" gets Start Thu and "Essay due fri" gets Start today, both shown before Add and changeable. Plan it on the essay starts the steps today.
- [ ] Setting a Due on the task page of a task with no Start fills one in, with a notice and Undo.
- [ ] The task page, Move to… and the guide say Start.
- [ ] "pay rent every month on the 1st" repeats on the 1st, titled "pay rent". "every last friday book club" repeats on each month's last Friday. "lab report due the 28th" is due on the 28th.
- [ ] A series on the 31st rings on each month's last day and doesn't slide after February.
- [ ] Repeat → Every month… offers the task's day, its weekday, the 1st and the last day.
- [ ] `DECISIONS.md`, `CHANGELOG.md` and `STATUS.md` record it.
