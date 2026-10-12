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

## On the Passport (built 2026-10-12, Alex: a page of its own)
A Declarations page below Visas & stamps: a violet count stamp (DECLARATIONS · N · KEPT) with "Seven start times signed and kept.", then a register of the latest five kept (task title, the day and time they started; a task deleted since reads "A task since deleted"), Show all for the rest. Only what was kept is ever shown: no kept-or-missed tally. With none yet, a line says how to declare one. Reads `stamps` of kind `declaration-kept` with the task's title (an embedded select, under RLS); Show all pages past 1,000. **Checked on the iPhone:** the empty page on Alex's account; the full page with sample rows fed in temporarily (not committed): the stamp, newest first, a long title truncated, the deleted-task line, Show all (7) and Show fewer. Day and night: light only so far.

## The Oath's first Declaration (built 2026-10-12)
A page after Your first week, "Your first Declaration": when will you start the plan's first open step (`firstStepOf`)? The same chips and signature line as the Declare sheet (one `useDeclaration` hook behind both), Declare or Not now. The page holds still while a stroke is drawn (`Screen scrollEnabled`, the pad's `onDrawing`). The nudge page after it then says what notifications are for: "Allow notifications and your Declaration rings at 7:00 PM today. Each morning at 10 AM, a short list of what's on, too." Its Not now also drops Today's first-time ask for that same time (it would ask twice otherwise). Without a plan (Not now at the Oath) the page is skipped. Days are the calendar's here too. **Checked on the iPhone** through a temporary route showing the two pages on Alex's real plan (not committed; the full Application needs a fresh account, which is Alex's to make): the step named, Evening picked, a drawn signature (the page didn't scroll under it), Sign with my name (fixed: its line height clipped the name), Declare wrote the step's day, time and `declared_at` on staging, and the nudge page named the time; staging was restored and matched the snapshot. **Not exercised:** the whole Application run from a new passport, and "Yes, nudge me" (iOS's prompt).

## Night and web pass (2026-10-12)
**Night on the iPhone:** the row menu, the Declare sheet (cream ink on navy, Sign with my name), the DECLARED seal and "· Declared" on the task page, the Passport's Declarations page empty and full (sample rows, not saved), Your first Declaration and the nudge page (through a temporary route, deleted). **The web, signed in as Alex,** at 284 px and 1280 px, night and day: right-click → Declare a start; a mouse stroke signs; Sign with my name with Space; Tab order runs Sign with my name → Clear → Declare; Enter declares (staging got exactly `remind_at` and `declared_at`) and Undo put it back exactly; the keyboard path without a right-click is the row (Enter) → Declare on the task page; Escape closes only the sheet; at laptop width it's a centered 440 px card; the Passport's empty line reads "Right-click or press and hold". **Fixed:** on web a signed name was cut off ("Citizen 00…"): `adjustsFontSizeToFit` is native only, so the web sizes it from its length. **Not seen:** "Declaration kept" in Start Mode (it would write a stamp and a start; its violet is 7.5:1 at night), and the two onboarding pages on the web (the same parts as the sheet).

## Done when
- [ ] Declaring sets the task's day and time and `declared_at`; Undo puts all three back.
- [ ] The reminder at that time reads as a Declaration (iPhone and Web Push), with Start 5 min.
- [ ] Moving the task withdraws it; a repeat can't be declared.
- [ ] Starting within the window earns one "Declaration kept" stamp; starting again doesn't earn another.
- [ ] Core, database and site tests pass; the app type-checks; checked on the iPhone.
