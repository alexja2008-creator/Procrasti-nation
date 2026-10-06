# Plan: Territories (ProcrastiNation 2.0, `v2` branch)

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## What it is

The Territories tab (today a placeholder: `apps/app/src/app/(tabs)/territories.tsx` renders `DraftPage`) becomes the person's places: **Customs** at the top (undated, unsorted captures; the same items Today shows inline), then their territories (a class like "Chem 201", Work, Home, their own), each with its open tasks. A task can be filed into a territory from task detail, the row menu, or quick add (`#chem`). Same features on iOS and web; the layout adapts at laptop width.

```
 TERRITORIES
 Every corner of your life.
 ┌ ⌂ Customs · Inbox ───────────── 3 waiting ┐   ← dashed, like Today's banner
 └───────────────────────────────────────────┘
 ▌ Chem 201          4 open · Lab report Fri  ›    ← ink stripe (terracotta/violet/forest), kind icon
 ▌ Work              2 open                   ›
 ▌ Home              1 open · Walk Biscuit 6 PM ›
 [+ New territory]

 Chem 201 (territory page)                    [+] [Edit]
 COMING UP
 ○ Write lab report            Fri · 45 min
 ○ Problem set 4               Mon
 ANYTIME
 ○ Email Dr. Ruiz about the quiz
 ○ Study for midterm           3 of 8 steps     ← planned parent: progress, not its steps
```

Laptop width (≥ 900 px, `useIsWide`): two columns, the territory list on the left and the selected territory's page on the right (selected in place; `/territory/[id]` still works as a link).

## Decisions

Confirmed by Alex on 2026-10-06:
- **Deleting a territory sends its tasks back to Customs.** They lose the territory and nothing is lost: undated ones land in Customs, dated ones stay on Today / Upcoming. Undo for 10 seconds.
- **Row menu: "File in…"** files a task into a territory (Start · Plan it · Move to… · File in…). "Move to…" stays the date.
- **Quick add understands `#name`:** "lab report fri #chem" files into Chem 201 (case- and accent-insensitive match on the name, ignoring spaces; an exact match wins, otherwise a prefix, ties go to the first in the person's order). An unknown `#word` stays in the title. A chip shows the territory.
- **Today and Upcoming rows name the territory** in the meta line: "Chem 201 · due Fri". Plan steps keep "Parent · step i of n" (the parent already gives the context).

Technical choices (mine; say if you disagree):
- **No schema change.** `lists` (name, kind, ink, sort order, soft delete, owner-only RLS) and `tasks.list_id` with its ownership trigger are already in `01_schema.sql` and on staging.
- **Steps inherit their plan's territory** at read time (effective territory = the parent's). Filing a plan moves its steps with it, with no cascade writes; steps have no territory field or "File in…" of their own. Start Mode's Done stamp records the effective territory.
- **Customs is one definition** (undated, unfiled, not a repeat, no plan, top-level), shared by Today and the Territories tab.
- **Territory page:** top-level open tasks only. "Coming up" (dated, by date and time) then "Anytime" (as arranged). Finished items hide with Undo, as on Upcoming. A planned parent shows "3 of 8 steps".
- **Kinds and inks:** School / Work / Home / Other (`custom`) with stroke icons (book, briefcase, house, flag), and the three stamp inks. With no territories yet, the empty state offers one-tap starters (School, Work, Home) next to "New territory". Onboarding pre-creates them later.
- **Order:** territories keep `sort_order`; drag to reorder in phase 3 (same gesture as steps).
- **Online-first like the tasks store:** a lists store with optimistic changes that roll back on failure.

## Files

| Area | File | Change |
|---|---|---|
| Core | `packages/core/src/territories.ts` (new) | `isInCustoms`, `effectiveListId`, `buildTerritories(lists, tasks, today)` → Customs + per-territory open count and next dated item; `buildTerritory(listId, tasks, today)` → `{ comingUp, anytime }` with plan progress; `matchTerritory(tag, lists)` |
| Core | `packages/core/src/agenda.ts` | Today's Customs uses `isInCustoms` |
| Core | `packages/core/src/quick-add.ts` | `#tag` → `listId` when `{ lists }` is passed (a `territory` match kind); unknown tags stay in the title |
| Core | `packages/core/src/nation.ts` | `voice.territories` (eyebrow, title, customs subtitle, counts, empty state, starters, new/edit/delete copy, "File in…", "in Chem 201" chip, "Added to …") |
| Core | `packages/core/test/territories.test.ts` (new), `quick-add.test.ts` | counts, next item, sections, Customs, inheritance, name matching, `#tag` parsing |
| Data | `apps/app/src/data/lists.ts` (new), `lists-store.tsx` (new) | fetch / insert / update / soft delete; `useLists()` with optimistic add, update, reorder, and remove (detach tasks, Undo) |
| Data | `apps/app/src/data/tasks.ts`, `tasks-store.tsx` | `listId` in inserts and `TaskPatch`; `detachList` / `reattach` for delete and Undo |
| App | `apps/app/src/app/(tabs)/territories.tsx` | Customs card, territory cards, New territory, starters; two columns when wide |
| App | `apps/app/src/app/territory/[id].tsx` (new) | territory page (`customs` for Customs) on phones |
| App | `apps/app/src/components/territory/` (new) | `territory-view` (page body), `territory-card`, `territory-sheet` (pick one: list + Customs + New), `territory-edit-sheet` (name, kind, ink, Delete) |
| App | `apps/app/src/components/icon.tsx` | `book`, `briefcase`, `house`, `flag` glyphs |
| App | `task/[id].tsx`, `row-menu.tsx`, `capture.tsx`, `(tabs)/index.tsx`, `upcoming/day-section.tsx`, `start/[id].tsx` | Territory field; "File in…"; capture preset + `#tag` chip; territory in row meta; effective territory on stamps |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure lines, what works, commits, next steps |

## Phases (commit + push `v2` after each)

1. **Places:** core `territories.ts` + tests; the lists data layer and store; the Territories tab (Customs card, territory cards, New territory with name / kind / ink, starters); the territory page and Customs page with rows (tap / hold / check + Undo) and a "+" that captures into that territory; Edit (rename, kind, ink, Delete → back to Customs, Undo); two columns at laptop width. Verify on web against staging.
2. **Filing:** Territory field in task detail; "File in…" in the row menu (Today, Upcoming, territory pages); territory name in Today / Upcoming row meta; steps inherit; Start Mode stamps record the effective territory.
3. **Quick add and polish:** `#tag` parsing with the territory chip and "Added to Chem 201."; drag to reorder territories; checks on the iOS Simulator and on web (phone and laptop widths, day and night); code review (`agents/code-review.md`), database review of the new queries (`agents/database-review.md`); docs.

## Out of scope (noted)

- **v1 boards** live in `localStorage['task-boards']` on procrasti-nation.work, which the v2 app (another origin) can't read. Bring them over at cutover from the v1 site, or let them go (they were per-device).
- **Schools classes** (`classes`, `enrollments`, teacher assignments) could later appear as School territories automatically; still the open product question in the handoff.
- **Notes on territories** arrive with capture-first notes; the territory page leaves room for a Notes section.
- **A unique stamp design per territory** (Passport) comes later; the ink is recorded now.

## Done when

- [ ] Create, rename, recolor and delete a territory (its tasks return to Customs; Undo restores both).
- [ ] Customs shows the same items as Today's Customs; filing one into a territory removes it from Customs.
- [ ] File a task from task detail, the row menu and quick add `#tag`; a filed plan's steps follow it; the territory shows on Today / Upcoming rows.
- [ ] A territory's page lists Coming up and Anytime correctly; "+" captures into it; checking a row hides it with Undo.
- [ ] Same on iOS and web; laptop width shows two columns; light and night; `npm run core:test`, `npm run app:check` pass.
