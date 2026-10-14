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
| `CLAUDE.md`, `docs/archive/handoff-2026-10.md` | Modify | Structure, storage key, roadmap |

No database change: every action is an ordinary task update.

## Phase 1: The briefing (core + Today)
1. **Core** (`briefing.ts` + tests). Depends on: none.
2. **Copy** (`nation.ts`): the card, the sheet, the actions, Undo notices; the tone line (Diplomat "Four things carried over. Let’s give each one a place.", Drill Sergeant, Roast poking at the tasks, never the person).
3. **Not now** storage (`data/briefing.ts`). Depends on: none.
4. **Card and sheet** (`components/briefing/*`), using `Sheet`, `DateSheet` (Pick a day) and the store's `update` / `notify`. Depends on: 1–3.
5. **Today** shows the card when `count > 0` and it wasn't put off today. Depends on: 4.

**Built 2026-10-08** (phase 1). The sheet shows a plan's carried-over steps only when it has two or fewer, or after **One by one** (Re-spread is the quick way for a long plan). The tasks store now sends each task's writes one at a time, in order, so a quick Undo can't land before the change it undoes. **Checked on the iPhone (Expo Go, signed in as Alex, Roast tone):** the card counted 15 carried over, matching staging; the sheet groups three plans and the loose tasks ("from yesterday", "was due Sat 3 Oct"); Today saved to staging and Undo put it back exactly (staging compared field by field with a snapshot taken first); One by one and Hide steps; Pick a day opens the When sheet on today and closing it saves nothing; Not now hides the card for the day. **Not exercised on real data:** Re-spread the rest, Let it go and Move all to today (their patches are covered by core tests), the web, and night theme.

## Phase 2: Morning and recap (built 2026-10-12)
- **The morning list notification** adds what will have carried over by then ("Start with “Gather sources”. Two things carried over, ready to sort.", the same line in every tone), on the iPhone and through Web Push (the site's sender uses core's `planReminders`). Opening it opens Today with the briefing (`/?briefing=1`; the web's older `/` payload still opens Today), even if the card was put off, and only when something carried over.
- **Yesterday's recap (Alex: finished tasks + starts):** "Yesterday: four things finished and two starts.", above the lead on the card and in the sheet; left out at zero or if the count fails. Counts one-offs, plan steps and checklist lines finished in yesterday's window (their rollover hour included) and Start Mode starts, as head-only count queries under RLS. A repeat checked off leaves no record (it moves on), so repeats aren't counted and the words never claim "everything"; a full completions log can come with State of the Union.
- **Web keyboard:** nothing to build. React Native Web's Modal already closes on Escape (the date sheet first when it's open), and Tab reaches every button in order; arrow keys through rows were dropped as not worth a roving-focus model. The sheet is 460 wide at laptop width.
- **Checked:** core tests (the notification's line, a repeat never counted, none when nothing carried over; the recap's words and zero); site tests (the morning list's path); on the iPhone (Expo Go, 2026-10-12, Alex's 3 AM rollover): `/?briefing=1` opened the briefing over Today with 24 carried over, closing it didn't reopen on the next visit, a second open reopened it; no recap line (nothing finished or started on Oct 10, confirmed on staging, while Oct 6 counts 2 finished and 6 starts). **Not seen:** a recap on screen (needs a day with something done), a real morning notification (Alex's morning list is off), and the web.

## Phase 3: Pick three (Alex, 2026-10-12)
A long briefing is the pile again, and Move all to today would put the whole pile on today. So a long one asks for less.
- **When:** 10 or more things to decide about, a plan counting once (Re-spread sorts a plan in one go, so plans far behind stay the usual list). Alex's own briefing showed why: 17 carried over, all steps of three plans. Move all to today isn't offered at 10 or more carried over (steps counted one by one) either way.
- **The sheet opens on Pick three:** the lead (per tone) says it's a lot and three is plenty; the card's button says Pick three; the app suggests three, already ticked: deadlines still ahead first (the soonest first), then the oldest day first. A plan offers only its next carried-over step (steps go in order), with the plan's name under it. The suggestions show first; Show the rest lists the others. They can untick and swap, up to three; a fourth tap says "Three picked. Untick one to swap." just above Put on today (pinned, so it's seen wherever the list is scrolled to) The tick boxes are square, so they never read as Done.
- **Put on today:** the ticked ones go on today (keeping their times), the card rests for the day (as Not now does), the sheet closes, and the notice says the rest can wait, with Undo (which brings the card back too).
- **The rest stay as they are:** still carried over, back on tomorrow's card. Nothing is moved, undated or spread without being asked.
- **Sort one by one** switches to the usual list (with Today / Pick a day / Let it go for each); on a long list it has no Move all to today.
- **VoiceOver:** each row's buttons already read with the task's title (phase 1); the tick boxes are checkboxes named by the task.
- **No AI** (it's a ranking on the device) and no database change.

| File | What changes |
|---|---|
| `packages/core/src/briefing.ts` (+ test) | `LONG_BRIEFING` = 10, `PICK_MOST` = 3, `picksOf(briefing, today)` (each loose task and each plan's next carried-over step, ranked), `isLongBriefing` (picks, not steps) |
| `packages/core/src/nation.ts` | The copy: `toneLines.briefingPickLead` per tone, `voice.briefing` pick words and the notice |
| `apps/app/src/components/briefing/pick-row.tsx` | Create: a tick box row (title, plan, where it came from, a deadline ahead) |
| `apps/app/src/components/briefing/briefing-sheet.tsx` | Pick three mode, Sort one by one, no Move all on a long list |
| `apps/app/src/components/briefing/morning-briefing.tsx` | The card's lead and button on a long list; lets the sheet rest the card and Undo wake it |
| `apps/app/src/data/briefing.ts` | Clearing the put-off day (for Undo) |

**Built 2026-10-12.** **Checked on the iPhone (Expo Go, Alex's account, Roast tone):** Alex's real 17 (three plans) stays the usual list, now without Move all to today. With nine sample tasks added in memory only (never saved; removed before committing) beside his three plans: the card read "26 things followed you here. Nobody does 26 things in a day. Pick three." with Pick three; the sheet ticked the chem step (due Wed) between two samples due sooner, then listed the rest oldest first ("from Mon 28 Sep", "was due Mon 5 Oct", a plan's step under its plan's name); Show the rest / Hide the rest (a ticked one from the rest stayed in sight); a fourth tap said to untick one; swapping; Sort one by one instead (no Move all, Pick three instead) and back; Put one on today wrote exactly that step's `scheduled_on` on staging (compared with a snapshot), closed the sheet, rested the card and showed "One thing is on today. The rest can wait."; Undo put the step back and the card with it; the sheet's Not now rested the card; the morning list's link (`/?briefing=1`) still opened Pick three while it rested; night theme. Staging matched the snapshot afterwards (37 open tasks, counts unchanged). **Not exercised:** VoiceOver itself (the rows are checkboxes named by title and where they came from; checked in code only) and the web signed in (the browser pane is signed out; the web bundle loads clean).

**Night and web pass (2026-10-12).** Night on the iPhone: the card, both sheets and the date sheet read well (every text color on them is at least 6.3:1 on its background). The web, signed in as Alex, at 284 px (the pane, narrower than any phone) and 1280 px, night and day: the card and both sheets (a centered 460 px card at laptop width, nothing overflowing); the buttons read with the task's title ("Today: Grab a laundry basket and trash bag"); Escape closes; Enter on Pick three opens it; the tick boxes are checkboxes with `aria-checked`, named by title and where they came from, ticked with a click or Enter. **Fixed:** with the rest shown and scrolled, a fourth tap's message was in the scrolled-away header; it now sits above Put on today. **Found, not fixed:** Space doesn't tick a checkbox on the web (React Native Web activates only `role="button"` with Space), here and on every older checkbox (rows, steps, checklist lines, the task page); Enter does.

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
