# Plan: Morning Briefing (roll-forward)

## Overview
Anything not done rolls into Today silently (`buildToday` includes every open task scheduled or due on or before today), so a few missed days turn Today into a pile, which is the overwhelm the app exists to defuse. The Morning Briefing is a short daily sort of what carried over: each leftover gets a place (**Today**, **Pick a day**, **Let it go**), a plan that fell behind can be spread out again, and nothing is ever called overdue (see the self-compassion voice: missed things roll forward kindly).

## Decisions (Alex, 2026-10-08)
- **Where:** a card at the top of Today when something carried over ("Four things carried over"), opening the briefing. Nothing blocks Today; **Not now** hides the card until tomorrow (this device).
- **Let it go:** takes the date off. The task leaves your days and waits undated (its territory's Anytime, or Customs), with Undo. Deleting stays on the task page.
- **Repeats are left out.** A missed repeat already shows on Today as one item, never a pile, and checking it off moves it on.
- **A plan that fell behind:** one **Re-spread the rest** button per plan. Its open steps spread out again from today to the plan's deadline (one a day without one), using core's `fallbackStepDates`. Instant, free, no AI call. Single steps can still be sorted one by one.

## What counts as carried over
An open, live, one-off task (no `rrule`) whose chosen day has passed: `scheduledOn < today`, or, with no `scheduledOn`, `dueOn < today`. A task already given today or a later day isn't carried over, even if its deadline passed. Plan steps group under their plan; everything else (tasks, a note's checklist lines) is listed on its own.

## The actions
| Action | Patch | Notes |
|---|---|---|
| Today | `scheduledOn` = today, keeping its time of day | A passed deadline stays (it shows "due Sat 3 Oct" for context). |
| Pick a day | `scheduledOn` = the day, with the time picked (the When sheet) | A deadline that has passed is cleared, or the task would keep showing on Today. |
| Let it go | `scheduledOn`, `remindAt` cleared; a passed deadline cleared | A deadline still ahead stays: the task comes back on that day. |
| Move all to today | Today, for every leftover | One Undo for the lot. |
| Re-spread the rest (a plan) | Every open step of the plan gets `fallbackStepDates(n, today, plan.dueOn)` in step order, keeping each step's time | A deadline that has passed spreads one a day instead. One Undo. |

Every action applies at once through the tasks store (`update`, rolled back if a save fails) and offers Undo, which puts the old fields back.

## Files to Create/Modify
| File | Action | What changes |
|------|--------|-------------|
| `packages/core/src/briefing.ts` | Create | `briefingOf(tasks, today)` (plans and loose leftovers, count), `leftoverPatch(task, action, today, pick?)`, `respreadPatches(plan, steps, today)` |
| `packages/core/test/briefing.test.ts` | Create | What carries over (repeats, done, deleted, future days, passed deadlines), grouping, each patch, re-spreading |
| `packages/core/src/nation.ts` | Modify | `names.morningBriefing`; `voice.briefing` copy; `briefingLead(n)` per nudge tone in `toneLines` |
| `packages/core/src/index.ts` | Modify | Export `briefing.ts` |
| `apps/app/src/components/briefing/briefing-card.tsx` | Create | The card on Today: tone line, Sort them, Not now |
| `apps/app/src/components/briefing/briefing-sheet.tsx` | Create | The briefing: plans (Re-spread the rest, then their steps) and loose tasks, each row with Today / Pick a day / Let it go; Move all to today; "All sorted." when empty |
| `apps/app/src/components/briefing/leftover-row.tsx` | Create | One leftover: title, where it came from ("from Tue", "was due Sat 3 Oct"), the three actions |
| `apps/app/src/data/briefing.ts` | Create | Not now for today: `pn.briefing.not-now.<userId>` = the day (AsyncStorage, per device) |
| `apps/app/src/app/(tabs)/index.tsx` | Modify | The card above Customs and the next step (focused Today too) |
| `CLAUDE.md`, `PN2-HANDOFF.md` | Modify | Structure, storage key, roadmap |

No database change: every action is an ordinary task update.

## Phase 1: The briefing (core + Today)
1. **Core** (`briefing.ts` + tests). Depends on: none.
2. **Copy** (`nation.ts`): the card, the sheet, the actions, Undo notices; the tone line (Diplomat "Four things carried over. Let’s give each one a place.", Drill Sergeant, Roast poking at the tasks, never the person).
3. **Not now** storage (`data/briefing.ts`). Depends on: none.
4. **Card and sheet** (`components/briefing/*`), using `Sheet`, `DateSheet` (Pick a day) and the store's `update` / `notify`. Depends on: 1–3.
5. **Today** shows the card when `count > 0` and it wasn't put off today. Depends on: 4.

**Built 2026-10-08** (phase 1). The sheet shows a plan's carried-over steps only when it has two or fewer, or after **One by one** (Re-spread is the quick way for a long plan). The tasks store now sends each task's writes one at a time, in order, so a quick Undo can't land before the change it undoes. **Checked on the iPhone (Expo Go, signed in as Alex, Roast tone):** the card counted 15 carried over, matching staging; the sheet groups three plans and the loose tasks ("from yesterday", "was due Sat 3 Oct"); Today saved to staging and Undo put it back exactly (staging compared field by field with a snapshot taken first); One by one and Hide steps; Pick a day opens the When sheet on today and closing it saves nothing; Not now hides the card for the day. **Not exercised on real data:** Re-spread the rest, Let it go and Move all to today (their patches are covered by core tests), the web, and night theme.

## Phase 2: Morning and recap
- The morning list notification counts what carried over ("…and two from before"), and tapping it opens the briefing.
- A recap of yesterday, true numbers only and hidden at zero. **Open question:** checking off a repeat leaves no record (it only moves on), so "done yesterday" would miss "Walk Biscuit"; starts (`start_sessions`) are exact. Decide what to count before building.
- Web: keyboard (Escape closes, arrow keys through rows), the laptop panel width.

## Phase 3: Polish
- A long list (say 10+): suggest picking up to three for today and letting the rest wait.
- VoiceOver: each row's actions read with the task's title.

## State & Data Flow
- Leftovers are derived from the tasks store on every render (`briefingOf`), like Today itself. Sorting a task changes its dates, so it leaves the briefing (and the card's count) at once, on every device after its next refresh.
- Not now lives on the device only; a sorted list needs no flag (there's nothing left to show).

## Risks
- **A passed deadline cleared by Pick a day or Let it go** loses the original date. Acceptable: the deadline is over, the person chose a new day, and Undo is right there.
- **Many updates at once** (Move all, Re-spread): one write per task, like dragging; each rolls back on its own if it fails, and the store shows the usual save error.
- **Reminders:** moving a timed task to today keeps its time; if that time already passed today, it won't ring (same as Move to… today).

## Done When
- [ ] A task missed yesterday shows in the card's count and the briefing; a repeat, a finished task and one moved to today don't.
- [ ] Today / Pick a day / Let it go each move the task where the table says, with Undo restoring it exactly.
- [ ] Re-spread puts a plan's open steps between today and its deadline, in order.
- [ ] Not now hides the card until tomorrow; it comes back the next day if anything is still carried over.
- [ ] Core tests pass; the app type-checks and lints; checked on web and iPhone, day and night.
