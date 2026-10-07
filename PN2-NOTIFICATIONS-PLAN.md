# Plan: Local notifications (ProcrastiNation 2.0, `v2` branch)

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## What it is

Reminders that ring on the iPhone at the right moment, with buttons that act without opening the app: **Done · Snooze · Start 5 min**. They're scheduled on the device, so they ring at the exact time and work offline. Plus an optional **morning list**: one notification a day with what's on, and the first thing to start. Web reminders come next, as their own feature (Web Push).

```
 ┌───────────────────────────────────────┐    long-press / pull down:
 │ ProcrastiNation              6:00 PM   │    ┌──────────────────────┐
 │ Walk Biscuit                           │    │ Done                 │
 │ Every day · Home                       │    │ Snooze 10 min        │
 └───────────────────────────────────────┘    │ Start 5 min          │
                                              └──────────────────────┘
 ┌───────────────────────────────────────┐
 │ ProcrastiNation              8:00 AM   │    Morning list (optional):
 │ Six things today                       │    tap → Today
 │ Start with “Gather 4-5 sources”.       │
 └───────────────────────────────────────┘
```

## Decisions

Confirmed by Alex on 2026-10-06:
- **What rings:** a task with a time ("walk Biscuit 6pm" at 6:00 PM, each time a repeat comes round); a deadline with a time ("essay due Fri 5pm" at 5:00 PM Friday); and an optional **morning list** at a set time.
- **Snooze:** one button, rings again in **10 minutes**. The task itself doesn't move.
- **Permission:** asked **the first time a task gets a time** ("Want a nudge at 6:00 PM?"), not on launch. Onboarding (the Oath) can take this over when it's built.
- **Web:** iPhone now; **Web Push is the next feature** (it needs a server sender to work with the tab closed).

Technical choices (mine; say if you disagree):
- **`expo-notifications`** (installed with `npx expo install`, config plugin in `app.json`). Local notifications run in Expo Go on iOS, so the Simulator can test them; if action buttons turn out not to work in Expo Go, a Simulator development build (`npx expo run:ios`, no Apple account needed) does. On web the module isn't used at all (`.web.ts` no-ops).
- **Planned in core, scheduled on the device.** A pure `planReminders(tasks, now, settings)` in `@pn/core` (unit-tested) lists what should ring: each open task's time, each timed deadline, the next occurrences of repeats, and the morning lists, soonest first, over the next 14 days. iOS allows **64 pending notifications** per app, so it keeps the soonest 64 (including the morning lists).
- **Reconcile, don't track.** Each notification's id says what it's for and when (`task:<id>:<time>`, `due:…`, `morning:<day>`). Whenever tasks change (after a short pause), the app comes to the foreground, or settings change, the app compares the plan with what iOS has scheduled and cancels or adds the difference (and replaces any whose words changed). Finishing, deleting, re-dating or retitling a task updates its reminder without special cases.
- **Buttons:** **Done** finishes the task (a repeat moves to its next date, exactly like checking it off), without opening the app. **Snooze** schedules a one-off reminder 10 minutes on (kept across reconciles until it rings or the task is finished). **Start 5 min** opens the app into Start Mode for that task. Tapping the notification opens the task (the morning list opens Today). Responses are handled whether the app was open, in the background or closed (on launch), and each is handled once.
- **The ask:** the first time a task gets a time while notifications are undecided, a small sheet explains ("Want a nudge at 6:00 PM? Reminders ring here at the time you set.") with **Allow** (then iOS's own prompt) or **Not now** (remembered on the device; turn it on later from the Reminders card).
- **Reminders card on the Passport tab** until Settings exists: whether notifications are on (if iOS has them off, a button to open Settings), and the **morning list**: on/off and its time (default 8:00 AM). The morning list setting is saved in `user_settings.preferences` (owner-only), so it follows the person; each iPhone schedules its own.
- **Words:** plain, like the rest of the app ("Walk Biscuit", "Every day · Home"; "Essay is due at 5:00 PM"). Nudge tones (Diplomat / Drill Sergeant / Roast) come with onboarding.
- **Known limit (until server push):** each iPhone schedules from what it last saw. Finish a task on the web and the phone can still ring for it until the app is next opened. Web Push and server push (Phase 4) fix this properly.

## Files

| Area | File | Change |
|---|---|---|
| Config | `apps/app/package.json`, `app.json` | `expo-notifications` + its config plugin |
| Core | `packages/core/src/reminders.ts` (new) + `test/reminders.test.ts` | `planReminders`: task times, timed deadlines, repeats, morning lists, the 64 cap, notification words |
| Core | `packages/core/src/types.ts`, `nation.ts` | `Preferences.reminders` (morning list); `voice.reminders` |
| Core | `packages/core/src/tasks.ts` (new) or `when.ts` | what checking off does (finish, or move a repeat on), shared by the store and the Done button |
| Data | `apps/app/src/data/user-settings.tsx` | save preferences (the morning list) |
| App | `apps/app/src/notifications/` (new; `.web.ts` no-ops) | scheduler (reconcile), categories and buttons, response handling, permission |
| App | `apps/app/src/components/reminder-prompt.tsx`, `components/reminders-card.tsx` (new) | the first-time ask; the Passport card |
| App | `data/signed-in-providers.tsx`, `(tabs)/passport.tsx`, `data/tasks-store.tsx` | mount the scheduler and handlers; the card; checking off through the shared rule |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure lines, device storage keys, what works, commits |

## Phases (commit + push `v2` after each)

1. **Reminders that ring:** install `expo-notifications`; core `planReminders` (task times, timed deadlines, repeats, the cap) with tests; the scheduler (reconcile on change and foreground); the first-time ask. Verify on the Simulator: a reminder rings at its time; finishing, re-timing or deleting a task cancels or moves it; a repeat lines up its next occurrences.
2. **Buttons:** Done, Snooze 10 min and Start 5 min; tapping opens the task; responses handled with the app open, in the background and closed, each once. Verify every path on the Simulator.
3. **Morning list and polish:** the morning list in `planReminders`; saving it in preferences; the Reminders card on Passport (on web it says reminders arrive with Web Push); night theme, Simulator and web checks; code and security reviews; docs.

## Out of scope (noted)

- Web Push (the next feature) and server push (Morning Briefing from the server, AI check-ins, Allies: Phase 4).
- Nudge tones, custom reminder offsets ("10 minutes before"), and a heads-up the evening before a deadline.
- Background refresh to catch changes made on other devices.
- Lock Screen Live Activities (Phase 4).

## Done when

- [ ] A task with a time rings at that time on the iPhone; a timed deadline rings at its due time; a repeat rings each time it comes round.
- [ ] Finishing, deleting, re-timing or retitling a task updates or cancels its reminder; never more than 64 are scheduled.
- [ ] Done finishes the task (a repeat moves on) without opening the app; Snooze rings again in 10 minutes; Start 5 min opens Start Mode; tapping opens the task.
- [ ] Permission is asked the first time a task gets a time, with Not now respected.
- [ ] The morning list rings at its set time with the day's count and first thing; it can be turned off or moved on the Reminders card, and the setting follows the person.
- [ ] Web is unaffected (and says reminders come with Web Push); `npm run core:test`, `npm run app:check` pass.
