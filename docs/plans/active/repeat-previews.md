# Plan: A repeat's turns in Upcoming's week ahead

**Status: approved 2026-10-16.** Alex answered the open questions and approved the plan as written, defaults D1–D6 included. Built on `feat/repeat-previews`.

## Overview

Alex tried "do bio lab homework every monday and wednesday night" (2026-10-16). It saved as a repeat with its next turn on Monday, but Wednesday didn't show anywhere until Monday was checked off. That's by design today. A repeat is one task row sitting on its next date, and Upcoming shows it once (`DECISIONS.md`, "Upcoming"). Its reminders, though, already ring on every turn in the next 14 days (`reminders.ts`, `ringDays`). So someone looking at their week ahead doesn't see what's coming, or what will ring.

This plan shows each of a repeat's turns in Upcoming's next 7 days:
- **The next turn** is the real row, as now.
- **The later turns** are previews: lighter, marked as repeats, and not checkable until the turn before them is done.

Nothing about how repeats are stored changes.

**Alternatives weighed (2026-10-16):**
- **A row per occurrence:** each turn becomes its own task. It can be checked off early, skipped, moved or planned, and it gives a history of turns. But it means a migration, rows generated without the iPhone and the web making the same day twice, "this one or all future?" edits, and missed turns piling up against the no-guilt rule.
- **A middle path:** keep one row, plus a log of finished turns and a list of skipped or moved dates. That would give history and "skip just this one" without the cost. It's left for when stats, streaks or single-turn edits are needed.
- **This plan** is the small, reversible step, and it doesn't stand in the way of either.

## Decisions (Alex, 2026-10-16)

1. **Each turn in the next 7 days shows in Upcoming.** That covers Upcoming's always-shown days, tomorrow through a week out. Beyond them, a repeat still shows once, on its next date, so a daily habit doesn't make 8 weeks look busy.
2. **Only the next turn can be checked off.** The later ones are previews. With one row per repeat, ticking Wednesday before Monday has no clear meaning, and a stray tap could finish the wrong turn.
3. **How a preview explains itself:**
   - **A repeat mark** sits where the checkbox would be.
   - **The row's line** reads "Repeats · opens after Mon".
   - **Tapping the mark** shows a notice: "Wednesday's turn opens once Monday's is done."
   - There's no card to dismiss.
4. **A preview has no row menu.** Press-and-hold (right-click on the web) does nothing on it. Tapping it opens the repeat's task page, where Repeat, Rename and the rest act on the whole series. Otherwise Move to… on Wednesday would quietly move Monday's turn.
5. **The week strip's and the calendar's dots count previews,** within the 7 days, so the dots match the list.
6. **Today doesn't change.** It shows only today's turn. A missed turn still shows once, not twice.

### Claude's defaults (stand unless Alex changes them)

- **D1. Which turns are previews:**
  - The repeat's turns after its real row's day, or after today if that row is on today or carried over. They run up to 7 days out.
  - A repeat due today (on Today) shows its later turns in Upcoming from tomorrow. Today a daily habit doesn't appear in Upcoming at all.
- **D2. A preview keeps the repeat's time.** A 6 PM repeat shows each turn at 6 PM, sorted with the day's other timed rows.
- **D3. "Opens after" names the turn before it:**
  - The real row's day: "opens after Mon", or "opens after today" when that row is on Today.
  - A third turn names the second ("opens after Wed"), since each opens as the one before it is done.
- **D4. No Plan it pill, no estimate tap, and no Start on a preview.** Its task page offers what the repeat offers.
- **D5. Reminders don't change.** They already ring on every turn.
- **D6. The shared turn listing:** `ringDays` in `reminders.ts` moves to `dates.ts` as `occurrencesBetween(rrule, anchor, from, until)`, so reminders and Upcoming list a repeat's turns the same way.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `packages/core/src/dates.ts` | Modify | `occurrencesBetween` (from `reminders.ts`'s `ringDays`) |
| `packages/core/src/reminders.ts` | Modify | Uses `occurrencesBetween`; no change in what rings |
| `packages/core/src/upcoming.ts` | Modify | `UpcomingEntry.kind` gains `'preview'`, with `opensAfter` (the turn before it). `buildUpcoming` adds previews in the 7 days. `upcomingCounts` counts them. |
| `packages/core/test/upcoming.test.ts` | Modify | The cases under "Checked", below |
| `packages/core/src/nation.ts` | Modify | The preview's line, its notice, and its screen-reader label |
| `apps/app/src/components/task-row.tsx` | Modify | A preview row: the repeat mark in the checkbox's place (a button with its own label), the title in a lighter ink, no menu, no Plan it |
| `apps/app/src/components/upcoming/day-section.tsx` | Modify | Builds preview rows; the mark's tap calls back |
| `apps/app/src/app/(tabs)/upcoming.tsx` | Modify | The mark's tap shows the notice (`notify`) |
| `DECISIONS.md`, `CHANGELOG.md`, `docs/architecture.md` | Modify | The Upcoming decision changes ("shows once" becomes "each turn in the next 7 days, later ones as previews"); in users' words; the new entry kind |

## Phases

One PR: core and app together. It's small, and neither half is useful alone.

- **Built:** decisions 1–6 and D1–D6.
- **Checked:**
  - **Core tests:**
    - Bio lab on Mon/Wed, on a Friday: Monday is the real row, Wednesday a preview "opens after Mon".
    - A daily repeat due today: previews tomorrow through 7 days out.
    - A 6 PM repeat: its previews are at 6 PM.
    - Every other week: only its on weeks.
    - Nothing past 7 days, and nothing for a finished or deleted repeat.
    - The dots count previews. Today's agenda is unchanged.
    - Reminders still ring on the same days after the move to `occurrencesBetween`.
  - `npm run app:check`.
  - **In the browser pane, on Alex's staging account, read-only:** the existing daily repeats ("Walk Biscuit", "Stretch") show a preview on each of the next 7 days.
    - Their mark's tap shows the notice. Press-and-hold and right-click do nothing.
    - Tapping a preview opens the task page.
    - The dots match.
    - Phone and laptop width, Night and Day.
  - The `code-reviewer` subagent.
- **Needs Alex:** the iPhone look with the next TestFlight build.

## Data and copy

- **Database:** no change. Previews are worked out from the repeat's rule, like reminders.
- **Copy** in `nation.ts`, no guilt and no "locked":
  - **The line:** "Repeats · opens after Mon" (or "after today").
  - **The notice:** "Wednesday's turn opens once Monday's is done."
  - **The mark's label:** "Repeats. Wednesday's turn opens once Monday's is done."
- **Privacy:** nothing new is collected.

## Risks

- **Daily habits add a row to each of the week's days.** A few of them make the week long. If that's noisy in the beta, a daily repeat could show once a day as a compact line, or once with "every day". Decide after seeing real weeks.
- **Someone tries to tick a preview.** The mark's notice explains, and the turn opens as soon as the one before it is done.
- **Moving the next turn** (Move to…, or a skipped turn) shifts what the previews show, since they're worked out from the row's day. That's correct, but worth checking: move Monday to Tuesday, and Wednesday's preview should then read "opens after Tue".

## Done when

- [ ] Every turn of a repeat in the next 7 days shows in Upcoming. Only the next is checkable; the rest are previews that say when they open.
- [ ] A preview's mark explains itself on tap. It has no row menu, and tapping the row opens the task page.
- [ ] The dots count previews within the 7 days. Today is unchanged, and reminders ring on the same days as before.
- [ ] `DECISIONS.md` and `CHANGELOG.md` record the change.
