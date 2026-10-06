# Plan: Capture-first notes (ProcrastiNation 2.0, `v2` branch)

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## What it is

Quick, plain notes (lecture notes, a packing list, ideas) that live next to the person's tasks. Any line can become a **live checklist line**: a checkbox that *is* a task, kept in sync both ways. Tick it in the note and the task is done; finish the task on Today and the note shows it ticked. A checklist line that names a day ("read ch 5 fri") becomes a dated task that also shows on Today and Upcoming. Not an Apple Notes clone: no formatting, folders, images or sharing.

```
 TERRITORIES                                 NOTE · Chem 201                 [☐] [⋯]
 ┌ Customs · Inbox     All clear ›┐          Lecture 7: cell energy
 ┌ ✎ Notes                    3 ›┐           Mitochondria make ATP.
 ▌ Chem 201  3 open · 2 notes  ≡             Krebs cycle is on the midterm.
                                             ☑ Read ch 5                      Fri
                                             ☐ Lab report draft         Due Thu
 Chem 201 (territory page)                   ☐ Ask about the curve
 NOTES                                       Office hours Wed 3pm.
  Lecture 7: cell energy   1 of 3 · 2h ago
 COMING UP …                                 ☐ toggles the line the cursor is on
```

## Decisions

Confirmed by Alex on 2026-10-06:
- **Where:** a **Notes** card under Customs on the Territories tab (every note, newest first), and each territory's page shows its own notes. Notes never count as "waiting".
- **Line → task: live checklist lines** (Apple Notes-style checkboxes that are real tasks, synced both ways).
- **Capture:** the + sheet gets a **Task / Note** switch. Note mode is a multi-line box with "Save note", filed in the territory the sheet was opened from, if any.
- **Task detail keeps its Notes field as is** (the planner writes step how-tos there). Attaching full notes to tasks can come later.

Technical choices (mine; say if you disagree):
- **One additive column: `tasks.note_id`** (→ `notes`, `ON DELETE SET NULL`, partial index, the ownership trigger extended so it can't point at another person's note). Added to `01_schema.sql` (not yet on production, so it rides the same pre-merge apply), removed by `99_rollback.sql` before `notes` is dropped, covered by the PGlite tests, and applied to staging. A checklist task needs to know its note: to keep it out of Customs, to load it with the note even after it's finished, and to clean up when the note goes.
- **Note body:** plain text, one line per line. A checklist line is stored as a token line `[[task:<id>]]`; the task row owns its text and done state, so there's one source of truth. Pure helpers in `@pn/core` parse and write the body and do the editing steps (turn a line into a checklist line and back, split, merge), all unit-tested.
- **The title is the first line** (Apple Notes style); no separate title field.
- **The editor is a list of blocks:** text paragraphs (multi-line inputs) and checklist rows (checkbox, single-line title, a date chip when dated). The ☐ button (and ⌘⇧L on web) toggles the line the cursor is on. In a checklist row, Return starts a new checklist row; Return on an empty one ends the checklist; Backspace on an empty one removes it. Autosaves.
- **Creating a checklist line reads it like quick add** ("read ch 5 fri #chem" → "Read ch 5", Fri). Editing it later only changes the title. Tap the chip (or press and hold the row) for task detail and the usual menu.
- **Where checklist tasks show:** in their note always; on Today / Upcoming when dated (meta "Lecture 7: cell energy"). Never in Customs, and not in a territory's task lists (they're inside the note; the note shows "1 of 3"). They take the note's territory, and follow it when the note is refiled.
- **Deleting a note deletes its checklist tasks**, with Undo for both. Removing a checklist line deletes its task quietly (that's what removing the line means).
- **Online-first** like tasks and territories: a notes store with optimistic saves that roll back on failure.

## Files

| Area | File | Change |
|---|---|---|
| DB | `supabase/v2/01_schema.sql`, `99_rollback.sql`, `test/migration.test.mjs` | `tasks.note_id` + index + ownership check; rollback; tests (foreign note rejected, rollback clean) |
| Core | `packages/core/src/notes.ts` (new) + `test/notes.test.ts` | body parse / write, title, preview, checklist progress, editing steps, `buildNotes(notes, tasks, listId?)` |
| Core | `packages/core/src/types.ts`, `territories.ts`, `upcoming.ts` | `Task.noteId`; checklist tasks out of Customs and territory task lists |
| Core | `packages/core/src/nation.ts` | `voice.notes` |
| Data | `apps/app/src/data/notes.ts` (new), `notes-store.tsx` (new) | fetch / insert / update / soft delete; `useNotes()` |
| Data | `apps/app/src/data/tasks.ts`, `tasks-store.tsx` | `note_id`; load finished checklist tasks too; trash / restore many (note delete + Undo) |
| App | `apps/app/src/app/note/[id].tsx` (new), `components/note/` (new) | note page (modal like task detail): editor, ☐ toolbar, territory, delete; notes list and note card |
| App | `(tabs)/territories.tsx`, `territory/territory-view.tsx`, `territory/customs-card.tsx` (or a sibling `notes-card`) | Notes card and page; a territory's Notes section |
| App | `components/capture.tsx` | Task / Note switch |
| App | `(tabs)/index.tsx`, `upcoming/day-section.tsx` | checklist tasks show their note's title as meta |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure lines, schema note, what works, commits |

## Phases (commit + push `v2` after each)

1. **Notes:** the `note_id` migration (tests, staging); core `notes.ts` + tests; the notes data layer and store; the Notes card and page, a territory's Notes section, and the note page with plain-text editing (create, autosave, territory, delete with Undo). Verify on web against staging.
2. **Live checklists:** the block editor (☐ toggle, Return / Backspace rules, ticking both ways, quick-add reading on creation, date chips, open the task); checklist tasks kept out of Customs and territory lists, shown on Today / Upcoming with their note's title; deleting a note takes its tasks (Undo restores both); refiling a note refiles its tasks.
3. **Capture and polish:** the Task / Note switch in +; ⌘⇧L on web; checks on the iOS Simulator and web (phone and laptop widths, day and night); code review, database review, security review (new trigger logic); docs.

## Out of scope (noted)

- Search (next feature) will cover notes.
- Formatting, images, folders, sharing, and attaching notes to tasks.
- Offline editing (waits on the PowerSync spike, like the rest).

## Done when

- [ ] Create a note from + or a Notes / territory page; it autosaves; it's listed newest first with its first line as the title.
- [ ] ☐ turns the current line into a checkbox task (a typed day becomes the task's date) and back; Return / Backspace behave as above.
- [ ] Ticking in the note completes the task; completing it on Today ticks it in the note; finished items stay ticked after a reload.
- [ ] Checklist tasks never land in Customs; dated ones show on Today / Upcoming with the note's title.
- [ ] Deleting a note deletes its tasks; Undo restores both. Refiling a note moves its tasks.
- [ ] Same on iOS and web; light and night; `npm run core:test`, `npm run db:test`, `npm run app:check` pass.
