# Plan: Declarations

## Overview
A Declaration is a start time you sign for one task: "I’ll start “History essay” at 4:00 PM today." Deciding exactly when you'll start makes starting likelier (implementation intentions: Gollwitzer & Sheeran's 2006 meta-analysis found a medium-to-large effect on reaching goals). The nation theme gives it the ceremony of signing a document. It schedules the nudge: the task's own reminder rings at that time, in a "you declared this" voice, with Start 5 min.

## Decisions (Alex, 2026-10-12)
- **Signing:** draw it with your finger (a mouse on web). The signature is the ceremony and isn't stored. "Sign with my name" signs for VoiceOver and keyboard users (and anyone).
- **Keeping it:** opening Start Mode on the task from 15 minutes before to an hour after the declared time earns a "Declaration kept" stamp, once per Declaration, with a line in Start Mode. On the Passport later. Missing it says nothing: the task carries over to the Morning Briefing like anything else.
- **The Oath:** later. Declarations on tasks first; the onboarding page once it's proven.
- **Moving a declared task** (Move to…, the When field, the Morning Briefing, a repeat) withdraws the Declaration: a new time takes a new signature. Nothing calls it broken.

## The model
A Declaration is the task's When (`scheduled_on` + `remind_at`, which every reminder path already rings on iPhone and web), plus **one new column, `tasks.declared_at TIMESTAMPTZ`**: when they signed. Core's `whenPatch` clears it, so any other change of When withdraws the Declaration with no extra code at each call site. Repeats can't be declared (each occurrence would need its own signature).

v1's `tasks.start_commitment` isn't reused: v1's nudge cron emails "You committed to starting…" an hour after it passes when v1's `completed_steps` is 0, which v2 never updates. That email retires with the v1 pages at cutover.

## Files
| File | What changes |
|---|---|
| `supabase/v2/01_schema.sql`, `99_rollback.sql` | `declared_at` added; dropped by the rollback (its test checks v1's exact columns) |
| `packages/core/src/types.ts`, `when.ts` | `Task.declaredAt`; `Schedule` gains it; `whenPatch` clears it |
| `packages/core/src/declarations.ts` (+ test) | `canDeclare`, `declarePatch`, `isDeclared` (still ahead: today or later), `keepsDeclaration(task, now)` (the window), `declaredWhen` ("at 4:00 PM today") |
| `packages/core/src/reminders.ts`, `nation.ts`, `start-mode.ts`, `export.ts` | The declared reminder's words per tone; `voice.declaration`; `stampKinds.declarationKept`; the export carries `declaredAt` |
| `apps/app/src/data/tasks.ts`, `stamps.ts` | The column; `awardDeclarationKept` (once per Declaration) |
| `apps/app/src/components/declare/declare-sheet.tsx`, `signature-pad.tsx` | The document: statement, day and time chips, the signature line, Declare |
| `row-menu.tsx`, `task/[id].tsx` | "Declare a start" in the menu; Declare beside Start |
| `task-row.tsx` + Today, territory, Upcoming rows | A "Declared" mark by the time while it's ahead |
| `start/[id].tsx` | The kept stamp and its line |
| `apps/site/app/api/cron/push/route.js` | Reads `declared_at`, so Web Push rings in the declared voice |

## Built 2026-10-12
- `tasks.declared_at` with a CHECK (`tasks_declared_has_time`: a Declaration always has a time); applied to staging; dropped by the rollback; a migration test on both structures. v1's `start_commitment` stays as it is.
- Core: `declarations.ts`; `whenPatch` and Let it go clear `declaredAt`; the reminder at a declared time reads "Your declared start. Five minutes is enough to begin." (Drill Sergeant and Roast have their own), the same id so reconciling just updates the words; the export carries `declaredAt`; `stampKinds.declarationKept`.
- The app: Declare a start in the row menu (not for repeats, which also lose Plan it there now, as on the task page); Declare beside Start on the task page, and "· Declared" on its When field; the Declare sheet (the statement fills in as you pick, day chips, In 15 min plus the parts of the day still ahead, Other time in quarter hours, then the signature line pinned with Declare at the bottom: a stroke there never scrolls the sheet); a violet DECLARED seal under the row's time on Today, Upcoming and territory pages; "Declaration kept" in Start Mode within the window, its stamp awarded once per Declaration. Days in the sheet are the calendar's (at 12:30 AM a night owl's "today at 4 PM" is this afternoon).
- **Checked on the iPhone (Expo Go, Alex's account, 12:35 AM):** the menu offers Declare on Essay and not on Walk Biscuit (a repeat); the sheet's statement updated with each pick; Declare stayed off until a time and a drawn signature; declaring wrote exactly `scheduled_on`, `remind_at` and `declared_at` on staging (compared with a snapshot) and showed the seal and the Undo notice; clearing the When afterwards withdrew it and staging matched the snapshot again (37 open tasks, stamp and start counts unchanged); the task page's buttons. **Not exercised on the device:** the reminder ringing in the declared voice (core-tested; Alex's morning list and this task had no time to ring before cleanup), Undo within its 10 seconds (the store's Undo is the briefing's, checked there), Sign with my name, and the kept stamp (it would write a stamp and a start to Alex's account; core tests cover the window). The web and night theme are unchecked.

## Done when
- [ ] Declaring sets the task's day and time and `declared_at`; Undo puts all three back.
- [ ] The reminder at that time reads as a Declaration (iPhone and Web Push), with Start 5 min.
- [ ] Moving the task withdraws it; a repeat can't be declared.
- [ ] Starting within the window earns one "Declaration kept" stamp; starting again doesn't earn another.
- [ ] Core, database and site tests pass; the app type-checks; checked on the iPhone.
