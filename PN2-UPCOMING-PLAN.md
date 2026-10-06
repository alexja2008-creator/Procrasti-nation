# Plan: Upcoming (ProcrastiNation 2.0, `v2` branch)

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. This plan was approved for implementation in a fresh session; build all three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## What it is

The Upcoming tab (today a placeholder: `apps/app/src/app/(tabs)/upcoming.tsx` renders `DraftPage`) becomes the person's week and month: everything scheduled or due **after today**, grouped by day, with a calendar to jump around. Today keeps today and anything missed; Upcoming starts tomorrow. Same features on iOS and web; the layout adapts at laptop width.

```
 UPCOMING
 The week ahead.
 ┌ M  T  W  T  F  S  S ┐        ← week strip, dots on days with items
 │    7· 8· 9 10 11 12 │ [Month]  ← toggle expands the full MonthCalendar
 └─────────────────────┘
 TOMORROW · WED 7 OCT            +   ← "+" adds to this day
 ○ Trace the July Crisis chain   45 min
   Write 5-page history paper · step 4 of 10
 ○ Walk Biscuit  ↻ Every day     6:00 PM
 THU 8 OCT                       +
   Nothing yet.
 FRI 9 OCT                       +
 ▸ DUE  Write 5-page history paper on WWI   ← deadline marker (terracotta), not a to-do
 …
 LATER
 ○ Apply to Deloitte             due 2 Nov
```

Laptop width (≥ 900 px, `useIsWide`): two columns, the month calendar on the left (sticky) and the day list on the right.

## Decisions (all confirmed by Alex on 2026-10-06)

- **Range:** the next 7 days are always shown (empty days say "Nothing yet." with the day's "+"); after that, only days that have something, up to 8 weeks out; anything further goes in a final **Later** section, sorted by date.
- **Repeating tasks appear once, on their next date** (their `scheduledOn`), with the repeat icon, like Apple Reminders. No expanding "every day" into every day (it floods the list); the task already moves on to its next date when done.
- **Deadlines:** a task appears as a to-do on its `scheduledOn`, or on its `dueOn` if it has no `scheduledOn`. When its work happens elsewhere (it has plan steps, or it's scheduled before its due date), its due day also gets a **deadline marker** row: terracotta mono "DUE" label + title, tappable to open the task, no checkbox. Plan steps show on their own days with "Parent · step i of n" (use `stepContext`).
- **Order within a day:** timed items first by time (`remindAt`, then `dueAt`), then deadline markers, then the rest by `sortOrder`. Finished items are hidden (Upcoming is forward-looking).
- **Rows reuse `TaskRow`:** tap → task detail, press-and-hold (right-click on web) → row menu, checkbox → complete. Keep the standing hint style from Today only if the list has open rows (optional; it's already taught on Today).
- **"Move to…" in the row menu (confirmed):** press-and-hold gains a third item, after Start and Plan it, with the `calendar` stroke icon, that opens the existing `DateSheet` (When) to reschedule; saves with `whenPatch`. Works on Today and Upcoming.
- **Add to a day (confirmed):** a "+" on each day header opens quick add preset to that day: the capture sheet shows "for Thu 8 Oct", and if the typed text has no date, `scheduledOn` = that day (a typed date still wins).
- **No calendar events yet.** Apple Calendar / Google overlay is Phase 5 (EventKit, OAuth); design `buildUpcoming` so events can be merged in later, but don't build it now.
- **No new data fetch or schema:** `fetchActiveTasks` already loads every open task (plus finished steps of plans on screen), so Upcoming derives from the tasks store. Online-first as today (no live cross-device sync until the PowerSync spike).

## Files

| Area | File | Change |
|---|---|---|
| Core | `packages/core/src/upcoming.ts` (new) | `buildUpcoming(tasks, today, { weeks = 8 })` → `{ days: { date, entries }[], later: entries[] }`, entries `{ task, kind: 'task' | 'deadline', parentTitle?, stepIndex?, stepCount? }`; ordering rules above; pure, no Intl |
| Core | `packages/core/test/upcoming.test.ts` (new) | range (7 fixed days + sparse to 8 weeks + Later), repeat once, deadline markers (planned parent; scheduled-before-due), step context, ordering, finished/deleted hidden, nothing on or before today |
| Core | `packages/core/src/when.ts` | `weekStrip(start)` → 7 dates Monday-first containing `start`, `shiftWeek` |
| Core | `packages/core/src/nation.ts` | `voice.upcoming` (eyebrow "Upcoming", title "The week ahead.", nothingYet "Nothing yet.", later "Later", month/week toggle labels, add-to-day a11y label "Add to Thu 8 Oct", due marker "Due"), `voice.task.moveTo` |
| App | `apps/app/src/app/(tabs)/upcoming.tsx` | replace `DraftPage`: header, week strip / month toggle, day sections; two columns when wide; scroll-to-day on selecting a date (record each section's y via `onLayout`, `ScrollView.scrollTo`) |
| App | `apps/app/src/components/upcoming/day-section.tsx` (new) | day header (mono label; "Tomorrow" spelled out), "+" button, rows, empty state, deadline marker row |
| App | `apps/app/src/components/upcoming/week-strip.tsx` (new) | 7 day cells with dots, prev/next week arrows, selected/today rings (A2 tokens; mirror `MonthCalendar` styling) |
| App | `apps/app/src/components/month-calendar.tsx` | optional `marks?: Record<LocalDate, number>` → up to 3 dots under a day; keep current props working (the date sheet uses it) |
| App | `apps/app/src/components/screen.tsx` | allow passing a ScrollView ref (or render Upcoming's own ScrollView) so the list can scroll to a day |
| App | `apps/app/src/components/capture.tsx` | `open({ day?: LocalDate })`; a "for {day}" chip; apply the preset day when the parse has no date |
| App | `apps/app/src/components/row-menu.tsx` + `app/(tabs)/index.tsx` | "Move to…" item → `DateSheet` → `update(task, whenPatch(day, time))` |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure lines, what works, commits, next steps |

## Phases (commit + push `v2` after each)

1. **List:** `buildUpcoming` + tests; the Upcoming screen with day sections (7 fixed days, sparse to 8 weeks, Later), deadline markers, `TaskRow` tap / hold / check, empty states. Verify on web against staging.
2. **Calendar:** week strip with dots and a Month toggle (phone), two-column layout with the month calendar (laptop width); selecting a day scrolls the list to it; `MonthCalendar` `marks`.
3. **Add and move:** "+" per day (capture preset) and "Move to…" in the row menu; then checks on the iOS Simulator (Expo Go; see the handoff for signing in: request the link from the simulator, open the **newest** link with `xcrun simctl openurl booted "<link>"`) and web (desktop and phone widths, light and dark); code-review checklist (`agents/code-review.md`); docs.

## Done when

- [ ] Tomorrow's plan step, a repeating task's next date, a due-only task, and a planned parent's deadline marker all appear on the right days; nothing from today or earlier; finished tasks hidden.
- [ ] Tapping a day in the week strip or month calendar scrolls to it; dots match the days that have items.
- [ ] Tap opens task detail; press-and-hold opens the row menu; checking a row completes it (a repeating one moves on and shows its next date).
- [ ] "+" on a day captures into that day; "Move to…" reschedules from Today and Upcoming.
- [ ] Same on iOS and web; laptop width shows two columns; light and night themes; `npm run core:test`, `npm run app:check` pass.

## Context the implementer needs

- Tokens and copy rules: no hex in components (`useStyles(makeStyles)` with A2 tokens), copy in `@pn/core` `voice`, `Icon` component (stroke SVG, never emoji), plain button labels.
- Reuse: `TaskRow`, `RowMenu`, `Sheet`, `Chip`, `MonthCalendar`, `DateSheet`, `NoticeBar`, `stepContext`, `relativeDayLabel`, `formatDayLabel`, `describeRRule`, `whenPatch`.
- The tasks store (`useTasks`) gives `tasks`, `today` (honours the rollover hour), `toggle`, `update`, `remove`, `addStep`, `add`.
- Staging test data: citizen #000001's WWI plan (10 steps, 2 done, due Fri 9 Oct), Essay (due Sat 3 Oct), Walk Biscuit (daily 6 PM), Stretch (daily). Restore anything you change while testing.
- Dev servers: `.claude/launch.json` (`site` on 3000, `app-web` on 8081); iOS Expo server on 8082. A previous session's server may already hold a port; the browser pane can still use it.
