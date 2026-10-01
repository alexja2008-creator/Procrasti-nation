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
A full run is 60 API calls (30 plans + 30 grades) and costs roughly a dollar.

## What it measures

`cases.json` holds 30 real student tasks across all four procrastination types, with
"today" fixed at Wed 2026-09-30 so due dates are checkable. Each plan gets:

- **Deterministic checks:** due date resolved correctly, first-step minutes, step count.
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
