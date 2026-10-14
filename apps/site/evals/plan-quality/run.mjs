// Plan-quality eval for the AI Adherence Planner.
//
//   node evals/plan-quality/run.mjs --config sonnet-low [--prompt ./evals/plan-quality/prompt-v2.js] [--only id1,id2]
//
// Generates a plan for every case in cases.json with the chosen model config and prompt
// module (default: lib/prompts/plan.js, i.e. production), runs deterministic checks,
// grades each plan with Sonnet against the rubric below, and writes results/<label>.json.
// Gate: a model or prompt change ships only if it matches or beats the current baseline.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
process.loadEnvFile(path.join(root, '.env.local'));

const { callClaude, MODELS, resolveToday } = await import(pathToFileURL(path.join(root, 'lib/ai.js')).href);

const CONFIGS = {
  'sonnet-low': { model: MODELS.plan, effort: 'low' },
  'sonnet-medium': { model: MODELS.plan, effort: 'medium' },
  'haiku': { model: MODELS.fast },
};

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, [])
);
const configName = args.config || 'sonnet-low';
const config = CONFIGS[configName];
if (!config) throw new Error(`Unknown --config ${configName}. Options: ${Object.keys(CONFIGS).join(', ')}`);

const promptPath = path.resolve(root, args.prompt || 'lib/prompts/plan.js');
const promptModule = await import(pathToFileURL(promptPath).href);
const promptLabel = path.basename(promptPath, '.js') === 'plan' ? 'prod' : path.basename(promptPath, '.js');
const label = args.label || `${configName}__${promptLabel}`;

const { today: todayIso, timeZone, cases: allCases } = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));
const only = args.only ? new Set(args.only.split(',')) : null;
const cases = only ? allCases.filter((c) => only.has(c.id)) : allCases;
const today = resolveToday(todayIso, timeZone);

// ── Rubric ──────────────────────────────────────────────────────────────────
const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    fit: { type: 'integer', description: 'Step count and step size fit the task complexity (1-5)' },
    firstStep: { type: 'integer', description: 'First step is tiny (about 5 minutes or less), concrete, and needs no decisions (1-5)' },
    specificity: { type: 'integer', description: 'Steps are specific to this exact task, not generic productivity advice (1-5)' },
    sequence: { type: 'integer', description: 'Steps are in a logical order and each builds on the previous (1-5)' },
    timing: { type: 'integer', description: '"when" values are realistic given today and the deadline; nothing lands after the deadline; workload is spread sensibly (1-5)' },
    style: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Adapts wording to the procrastination type (1-5); null when no type was given' },
    overall: { type: 'integer', description: 'Would a procrastinating student actually start and finish with this plan? (1-5)' },
    notes: { type: 'string', description: 'One or two sentences on the biggest weakness' },
  },
  required: ['fit', 'firstStep', 'specificity', 'sequence', 'timing', 'style', 'overall', 'notes'],
  additionalProperties: false,
};

function gradePrompt(c, plan) {
  return `You are grading a task plan produced by ProcrastiNation, an app for students who procrastinate. A great plan makes starting almost effortless: the first step is a tiny, concrete action (about 5 minutes, no decisions required, e.g. "open a doc and paste the prompt"), every step is specific to this task, steps are sized to the task (a simple chore needs 2-4 steps, a research paper needs more), and the schedule fits the real time before the deadline.

Today is ${today.label} (${today.iso}).
<task>${c.task}</task>
<deadline>${c.deadline}</deadline>
<procrastination_type>${c.type ?? 'none given'}</procrastination_type>

<plan>
${JSON.stringify(plan, null, 2)}
</plan>

Score each criterion from 1 (poor) to 5 (excellent). Be strict: 5 means nothing meaningful to improve. For style, return null if no procrastination type was given.
- avoider: low-pressure language, trivially easy first action
- perfectionist: explicit permission for rough drafts, "done beats perfect"
- overwhelmed: the smallest possible pieces, reassurance that each piece is manageable
- boredom: variety, timeboxing, making steps feel engaging`;
}

// ── Deterministic checks ────────────────────────────────────────────────────
function minutes(estimate) {
  if (!estimate) return null;
  const s = estimate.toLowerCase();
  let total = 0;
  let matched = false;
  const hours = s.match(/([\d.]+)\s*(?:-\s*[\d.]+\s*)?(?:h|hr|hrs|hour|hours)\b/);
  if (hours) { total += parseFloat(hours[1]) * 60; matched = true; }
  const mins = s.match(/([\d.]+)(?:\s*-\s*([\d.]+))?\s*(?:m|min|mins|minute|minutes)\b/);
  if (mins) {
    const lo = parseFloat(mins[1]);
    const hi = mins[2] ? parseFloat(mins[2]) : lo;
    total += (lo + hi) / 2;
    matched = true;
  }
  return matched ? Math.round(total) : null;
}

function checks(c, plan) {
  const steps = plan.steps || [];
  const stepMinutes = steps.map((s) => minutes(s.estimatedTime));
  return {
    stepCount: steps.length,
    firstStepMinutes: stepMinutes[0],
    maxStepMinutes: Math.max(...stepMinutes.filter((m) => m != null)),
    dueDateCorrect: c.expectedDue.includes(plan.resolvedDueDate ?? null),
    resolvedDueDate: plan.resolvedDueDate ?? null,
  };
}

// ── Run ─────────────────────────────────────────────────────────────────────
async function runCase(c) {
  const prompt = promptModule.buildPlanPrompt({
    taskContext: c.task, deadline: c.deadline, today, procrastinationType: c.type,
  });
  const started = Date.now();
  let plan;
  try {
    plan = await callClaude({
      model: config.model,
      effort: config.effort,
      schema: promptModule.PLAN_SCHEMA,
      messages: [{ role: 'user', content: prompt }],
      timeoutMs: 90_000,
    });
  } catch (err) {
    return { id: c.id, error: err.message, latencyMs: Date.now() - started };
  }
  const latencyMs = Date.now() - started;

  let grade;
  try {
    grade = await callClaude({
      model: MODELS.plan,
      effort: 'medium',
      schema: GRADE_SCHEMA,
      messages: [{ role: 'user', content: gradePrompt(c, plan) }],
      timeoutMs: 120_000,
    });
  } catch (err) {
    grade = { error: err.message };
  }

  return { id: c.id, latencyMs, checks: checks(c, plan), grade, plan };
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      process.stdout.write('.');
    }
  }));
  process.stdout.write('\n');
  return out;
}

console.log(`Running ${cases.length} cases · config=${configName} · prompt=${path.relative(root, promptPath)}`);
const results = await pool(cases, 6, runCase);

// ── Summary ─────────────────────────────────────────────────────────────────
const ok = results.filter((r) => !r.error && !r.grade?.error);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const avg = (xs) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null;
const crit = ['overall', 'firstStep', 'specificity', 'fit', 'sequence', 'timing', 'style'];
const passes = ok.filter((r) => r.grade.overall >= 4 && crit.every((k) => r.grade[k] == null || r.grade[k] >= 3));
const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

const summary = {
  label,
  config: configName,
  prompt: path.relative(root, promptPath),
  cases: cases.length,
  errors: results.length - ok.length,
  passRate: `${passes.length}/${ok.length}`,
  dueDateAccuracy: `${ok.filter((r) => r.checks.dueDateCorrect).length}/${ok.length}`,
  medianFirstStepMin: median(ok.map((r) => r.checks.firstStepMinutes).filter((m) => m != null)),
  avgSteps: avg(ok.map((r) => r.checks.stepCount)),
  latencyP50s: latencies[Math.floor(latencies.length / 2)] / 1000,
  latencyP95s: latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] / 1000,
  ...Object.fromEntries(crit.map((k) => [`avg_${k}`, avg(ok.map((r) => r.grade[k]).filter((v) => v != null))])),
};

fs.mkdirSync(path.join(here, 'results'), { recursive: true });
fs.writeFileSync(path.join(here, 'results', `${label}.json`), JSON.stringify({ summary, results }, null, 2));

console.table(summary);
const misses = ok.filter((r) => !r.checks.dueDateCorrect);
if (misses.length) console.log('Due-date misses:', misses.map((r) => `${r.id}→${r.checks.resolvedDueDate}`).join(', '));
const fails = ok.filter((r) => !passes.includes(r));
if (fails.length) console.log('Rubric fails:\n' + fails.map((r) => `  ${r.id} (overall ${r.grade.overall}): ${r.grade.notes}`).join('\n'));
const errs = results.filter((r) => r.error || r.grade?.error);
if (errs.length) console.log('Errors:', errs.map((r) => `${r.id}: ${r.error || r.grade.error}`).join('; '));
