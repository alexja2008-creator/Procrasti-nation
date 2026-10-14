# "I'm stuck" eval

Start Mode's "I'm stuck" turns the current step into one tiny first action
(`app/api/unstick`, prompt in `lib/prompts/unstick.js`). Any change to that prompt or
its model/effort must match or beat the current numbers here before it ships.

## Run

```bash
node --no-warnings evals/unstick/run.mjs --config sonnet-low --label sonnet-low__v4
node --no-warnings evals/unstick/run.mjs --config haiku --only fafsa,dentist
```

Configs: `sonnet-low`, `sonnet-medium`, `haiku`. Reads `ANTHROPIC_API_KEY` from `.env.local`.
A full run is 32 API calls and costs well under a dollar.

## What it measures

`cases.json` holds 16 real steps across the four stuck reasons (don't know where to
begin, too big, not in the mood, missing something), all four procrastination types,
and one "try another" case with an earlier suggestion to avoid. Each action gets:

- **Deterministic check:** at most 25 words.
- **Sonnet grader (1–5):** tiny (≤2 min), concrete, no decisions, specific to the step,
  progress toward done, fits the reason, overall. A case passes at overall ≥ 4 with no
  criterion below 3.

## Results (2026-10-04)

| Config | Prompt | Pass | Overall | No decisions | Fits reason | p50 / p95 |
|---|---|---|---|---|---|---|
| haiku | v1 | 8/16 | 3.44 | 3.63 | 3.06 | 1.5s / 2.9s |
| sonnet-low | v1 | 11/16 | 3.69 | 3.38 | 3.38 | 2.0s / 2.7s |
| sonnet-low | v2 | 11/16 | 3.69 | 3.63 | 3.44 | 1.9s / 2.2s |
| haiku | v3 | 8/16 | 3.50 | 3.31 | 3.31 | 0.9s / 1.5s |
| **sonnet-low** | **v3 (production)** | **12/16** | **3.75** | **3.63** | **3.50** | 1.9s / 2.0s |

v2 added: hand them the opening words; "missing" never asks them to list what's missing;
"try another" must be a different way in. v3 added: for "not in the mood", start with the
least dreaded piece and route around the dreaded part; never depend on knowledge they may
not have yet. Remaining weak spots: "not in the mood" answers sometimes lack a hook, and
"missing something" is ambiguous from one tap (the grader and the prompt disagree on whether
listing what's missing is useful).
