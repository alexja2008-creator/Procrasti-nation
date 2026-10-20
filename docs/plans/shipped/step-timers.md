# Plan: A step's timer runs for its estimate

**Status: shipped with `claude/step-timers-21695f`'s PR (2026-10-20).** Alex answered the open questions on 2026-10-20 (decisions 1–4). It's one phase, so the plan moves to `shipped/` in the same PR.

## Overview

Alex's feedback (2026-10-20): "The first step of a task should populate with a 1 - 5 minute timer, per the usual routes. However, if a step is estimated to take 30 minutes, the timer should start at 30 and count down from there."

Today every Start Mode visit gets the same short timer (`defaultStartMinutes`: the length picked in Settings, or 2/5/10/25 from what stops you), even on a plan's 45-minute step. The planner already makes a plan's first step 2–5 minutes and the later ones 15–60 (`apps/site/lib/prompts/plan.js`), and each step keeps that as `estimateMinutes`. So a step counts down from its own estimate, and a plan's first step stays short because its estimate is short.

## Decisions (Alex, 2026-10-20)

1. **Every step of a plan counts down from its estimate,** the first one included. Settings' Start Mode length applies to a task that isn't a step (even one with an estimate of its own) and to a first step with no estimate. (Claude had recommended later steps only.)
2. **The first step's length stays as it is today** when it has no estimate: Settings' choice, else 2/5/10/25 from what stops you. No cap at 5.
3. **A later step with no estimate gets a 25-minute timebox** (a step added by hand has none). (Claude had recommended the start timer.)
4. **The words around a long timer.** For a timer longer than 25 minutes (longer than any start timer), only:

  | Tone | Under the timer | When it ends |
  |---|---|---|
  | Diplomat | Thirty minutes for this step. Settle in. Stop when the timer ends, or keep going. | Thirty minutes in. You stayed with it. |
  | Drill Sergeant | (as now) Thirty minutes. One task. The timer's running: begin. | Thirty minutes. Position held. |
  | Roast | Thirty minutes. The task is more scared of you than you are of it. (drops "Just") | (as now) Thirty minutes. Who even are you? |

  The line under each title stays as it is ("That was the hard part. Keep going, or stop here with a clear conscience."). Lengths read as words: thirty minutes, forty-five minutes, an hour, an hour and a half, two hours.

  Settings → Start Mode → Timer's note: Alex approved "How long Start Mode runs for a task or a plan's first step. Later steps run for their estimate." Decision 1 makes that wrong, so it becomes "How long Start Mode runs for a task. A plan's steps run for their estimate. Automatic follows what stops you." The How to use guide's Start Mode section says the same.

### Claude's defaults (stand unless Alex changes them)

- **D1. "First step" means first in the plan's order,** finished or not. It only matters for a step with no estimate (decisions 2 and 3).
- **D2. A reminder's "Start 5 min" still starts 5 minutes**, since the button says so. Start on a plan opens its next open step, which gets that step's timer.
- **D3. "I'm stuck" still restarts at two minutes** on one tiny action.
- **D4. A timer is at most 3 hours** (`MAX_TIMER_MINUTES`, 180): `start_sessions.planned_minutes` takes 1–180, and planner text like "2 hours (120 min)" reads as 240. A session row that can't be saved is a start that never counts. A clock of an hour or more ("1:30:00") is a size smaller so it stays inside the ring.
- **D5. Picking a session back up** (the app was closed, the page reloaded) keeps the length it started with, as now.
- **D6. One new test:** the 3-hour cap (DECISIONS' reason 2, data loss). The lengths themselves get none: Start Mode's clock is a "nice to have" test area, tested only after a bug reached someone.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `packages/core/src/start-mode.ts` | Modify | `startMinutesFor(task, step, prefs)`: a step's estimate; else 25 for a later step, `defaultStartMinutes` otherwise |
| `packages/core/src/nation.ts` | Modify | Lengths in words; the long-timer lines in each tone (decision 4); Settings' timer note; the guide's Start Mode lines |
| `apps/app/src/app/start/[id].tsx` | Modify | Uses `startMinutesFor` with the step's place in its plan |
| `apps/app/src/components/start/timer-ring.tsx` | Modify | A clock of an hour or more is a size smaller (D4) |
| `packages/core/test/start-mode.test.ts` | Modify | The 3-hour cap (D6) |
| `apps/app/src/hooks/use-start-session.ts` | Modify | The length is settled when the session begins, not when the screen first draws, so a step opened by link (before its plan has loaded) still gets its estimate |
| `DECISIONS.md`, `CHANGELOG.md`, `STATUS.md` | Modify | Alex's answers; in users' words; this week |

## Phases

One phase.
- **Built:** the files above.
- **Checked:** `npm run core:test`, `npm run app:check`; on the web (`npm run app:web`), a plan whose steps count down from their estimates, by Start on the plan and by "Start the next step" after Done; a reload mid-step keeps its length; "I'm stuck" still gives two minutes. Phone and laptop width, Night.
- **Needs Alex:** nothing more.
- **Built 2026-10-20:** `npm run core:test` (89 tests, the new cap included) and `npm run app:check` pass, and the `code-reviewer` ran. Its findings (the 3-hour cap, the clock's size at an hour or more, spelled lengths) are fixed. Each tone's lines were printed for 1 minute to 2½ hours, and the clock's width was measured in the browser: "1:00:00" is 208px at 58px against 192px inside the ring, and 157–164px at 44px. **Not checked:** Start Mode itself on the web or iPhone. That needed a staging sign-in in the browser pane, and Alex chose to skip the web check, so it's an open item in `STATUS.md`. The iPhone gets it with the next TestFlight build.

## Data and copy

No tables or columns change: `start_sessions.planned_minutes` already records each session's length (1–180, hence D4). New copy is in `nation.ts` (decision 4) and follows the no-guilt voice. Nothing new is collected, so the privacy policy doesn't change.

## Risks

- A longer timer means leaving before it ends is recorded as "stopped" rather than "kept going" more often. That's only in `start_sessions` and the export; nothing shows it to the person.
- A very long countdown might feel heavy to someone who only wanted to begin. "I'm stuck" (two minutes) and Stop here are still one tap away.

## Done when

- [ ] A plan's steps start at their estimates, the first included (web).
- [ ] A first step with no estimate and a plain task keep the start timer; a later step with no estimate gets 25 minutes; a reminder's Start 5 min and "I'm stuck" keep their lengths.
- [ ] The long-timer words read as approved in each tone.
- [ ] `npm run core:test` and `npm run app:check` pass; `code-reviewer` run before the commit.
