// Checks that the cheap model resolves step "when" values to the same calendar dates as Sonnet.
//   node evals/plan-quality/dates-check.mjs results/<label>.json
// Uses the plans from a run.mjs result file, so it costs only the date-resolution calls.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
process.loadEnvFile(path.join(root, '.env.local'));
const { callClaude, MODELS, resolveToday } = await import(pathToFileURL(path.join(root, 'lib/ai.js')).href);
const { DATES_SCHEMA: SCHEMA, buildDatesPrompt } = await import(pathToFileURL(path.join(root, 'lib/prompts/dates.js')).href);

const file = process.argv[2];
if (!file) throw new Error('Usage: node evals/plan-quality/dates-check.mjs results/<label>.json');
const { results } = JSON.parse(fs.readFileSync(path.resolve(here, file), 'utf8'));
const { today: todayIso, timeZone } = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));
const today = resolveToday(todayIso, timeZone);

let steps = 0, agree = 0, violations = 0, countMismatch = 0;
const diffs = [];
for (const r of results.filter((x) => x.plan)) {
  const due = r.plan.resolvedDueDate;
  const messages = [{ role: 'user', content: buildDatesPrompt({ steps: r.plan.steps, today, dueDate: due }) }];
  const [fast, ref] = await Promise.all([
    callClaude({ model: MODELS.fast, schema: SCHEMA, maxTokens: 1024, messages }),
    callClaude({ model: MODELS.plan, effort: 'low', schema: SCHEMA, messages }),
  ]);
  if (fast.dates.length !== r.plan.steps.length) { countMismatch++; continue; }
  fast.dates.forEach((d, i) => {
    steps++;
    if (d === ref.dates[i]) agree++;
    else diffs.push(`${r.id} step ${i + 1} "${r.plan.steps[i].when}": haiku ${d} vs sonnet ${ref.dates[i]}`);
    if (d < today.iso || (due && d > due)) violations++;
  });
  process.stdout.write('.');
}
console.log(`\nSteps: ${steps} · Haiku agrees with Sonnet: ${agree}/${steps} · Rule violations (before today / after due): ${violations} · Wrong step count: ${countMismatch}`);
if (diffs.length) console.log(diffs.slice(0, 25).join('\n'));
