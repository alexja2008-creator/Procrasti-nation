# Plan-quality eval

The AI Adherence Planner is the core of the product. Any change to the plan prompt
(`lib/prompts/plan.js`) or the plan model/effort (`lib/ai.js`) must match or beat the
current production numbers here before it ships.

## Run

```bash
node --no-warnings evals/plan-quality/run.mjs --config sonnet-medium                  # production prompt
node --no-warnings evals/plan-quality/run.mjs --config sonnet-medium --prompt evals/plan-quality/prompt-v1.js
node --no-warnings evals/plan-quality/run.mjs --config sonnet-low --only calc-pset,history-paper
node --no-warnings evals/plan-quality/dates-check.mjs results/<label>.json           # Haiku vs Sonnet step dates
```

Configs: `sonnet-medium`, `sonnet-low`, `haiku`. Reads `ANTHROPIC_API_KEY` from `.env.local`.
A full run is 64 API calls (32 plans + 32 grades) and costs roughly a dollar.

## What it measures

`cases.json` holds 30 real student tasks across all four procrastination types, plus two
repeating habits (walk-dog, vitamins, added 2026-10-15), with "today" fixed at Wed 2026-09-30
so due dates are checkable. Each plan gets:

- **Deterministic checks:** due date resolved correctly, first-step minutes, step count, and
  `noOtherReminders`: no step tells them to set an alarm, use the phone's Reminders, or use
  another reminder or to-do app, since PN reminds them itself.
  - The pattern (`OTHER_REMINDER` in `run.mjs`) matches "alarm", "set/add/create/schedule/put
    a … reminder" (up to two words between, so "set a 10-minute reminder" and "add three gentle
    reminders"), "reminder(s) app", "the phone's / Apple / Google Reminders", "to/in your
    Reminders", "to-do app", Todoist, TickTick, Any.do, Google Tasks and Microsoft To Do. It
    runs per sentence on each step's title and description.
  - Allowed (decision 6 in the dates-and-repeats plan): putting an appointment in the calendar,
    even with the calendar's own reminder ("add it to your phone calendar with a reminder the day
    before"), "check your calendar", reminders sent to other people ("send a reminder to the
    group"), timers, a paper to-do list, and any sentence that names ProcrastiNation.
  - Tuned on the saved runs: on `sonnet-medium__prompt-v3.json` it flags prof-email, spanish-trip
    (Duolingo's daily reminder) and psych-post.
- **Sonnet grader (1–5):** fit, first step (≤5 min, no decisions), specificity, sequence,
  timing, style adaptation, overall. A case passes at overall ≥ 4 with no criterion below 3.

## Results (2026-09-30, Sonnet 4 retired → Sonnet 5.5 migration)

| Config | Prompt | Pass | Overall | First step | Timing | Due dates | p50 / p95 |
|---|---|---|---|---|---|---|---|
| haiku | original (v1) | 2/30 | 2.87 | 2.33 | 3.03 | 30/30 | 7.2s / 11.8s |
| sonnet-low | original (v1) | 14/30 | 3.60 | 2.90 | 3.37 | 30/30 | 8.7s / 12.3s |
| sonnet-medium | original (v1) | 20/30 | 3.73 | 2.93 | 3.57 | 30/30 | 8.6s / 13.3s |
| sonnet-medium | v2 | 24/30 | 3.87 | 4.17 | 3.33 | 30/30 | 8.3s / 12.4s |
| **sonnet-medium** | **v3 (production)** | **27/30** | **3.93** | **4.23** | **3.60** | **30/30** | 11.2s / 19.1s |

Haiku is not used for plans. It resolves step dates (`/api/resolve-step-dates`): on the
v3 plans it matched Sonnet on 334/336 steps, and the route clamps dates to today…due date.

## Results (2026-10-15, the reminder rule, 32 cases)

Family testers' "walk the dog every M/W/Sat" plan told them to set an alarm. The candidate
(`prompt-v4.js`) is v3 plus one rule: PN puts the steps on their days and can remind them at a
time they pick; never tell them to set an alarm or use another reminder or to-do app; an
appointment in their calendar is fine; for a habit that repeats on a schedule, plan the first one.
The run was made with that bullet put into `lib/prompts/plan.js`; `prompt-v4.js` is a copy
written afterwards (rerun it with `--prompt` and a new `--label`, or it overwrites the saved file).

| Config | Prompt | Pass | Overall | First step | Timing | Due dates | No alarm / other app | p50 / p95 |
|---|---|---|---|---|---|---|---|---|
| **sonnet-medium** | **v3 (production)** | **31/32** | **3.97** | **4.25** | **3.44** | **32/32** | **28/32** | 10.1s / 18.9s |
| sonnet-medium | v4 candidate | 27/32 | 3.88 | 4.22 | 3.34 | 32/32 | 32/32 | 9.3s / 20.4s |

v4 failed the gate (fewer passes, lower overall and first step), so production stays on v3, and
v3's 32-case row is the one to beat.

- v3's hits: walk-dog (a repeating phone alarm), vitamins (a daily alarm), gym and dentist
  ("set a reminder").
- v4's four new fails all scored 2 on timing: orgo-midterm, surprise-party, stats-r-hw and
  walk-dog. Only walk-dog is about reminders.
- Run to run, v3 alone went from 27/30 (2026-09-30) to 29/30 on the same 30 cases here, so one
  run of each can't tell a 4-case drop from noise.
- Under v4, walk-dog's alarms became a repeating Mon/Wed/Sat calendar event, which the check
  allows, and it still planned three walks rather than the first one.
