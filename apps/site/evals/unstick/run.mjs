// "I'm stuck" eval: does the tiny first action actually get a stuck student moving?
//
//   node evals/unstick/run.mjs --config sonnet-low [--label name] [--only id1,id2]
//
// Generates an action for every case in cases.json with lib/prompts/unstick.js, grades
// each with Sonnet against the rubric below, and writes results/<label>.json.
// Gate: a prompt or model change ships only if it matches or beats the current baseline.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
process.loadEnvFile(path.join(root, '.env.local'));

const { callClaude, MODELS } = await import(pathToFileURL(path.join(root, 'lib/ai.js')).href);
const { UNSTICK_SCHEMA, STUCK_REASONS, buildUnstickPrompt } = await import(
  pathToFileURL(path.join(root, 'lib/prompts/unstick.js')).href
);

const CONFIGS = {
  'sonnet-low': { model: MODELS.plan, effort: 'low' },
  'sonnet-medium': { model: MODELS.plan, effort: 'medium' },
  haiku: { model: MODELS.fast },
};

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
const configName = args.config || 'sonnet-low';
const label = args.label || configName;
const config = CONFIGS[configName];
if (!config) throw new Error(`Unknown --config ${configName}. Options: ${Object.keys(CONFIGS).join(', ')}`);

const { cases: allCases } = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));
const only = args.only ? new Set(args.only.split(',')) : null;
const cases = only ? allCases.filter((c) => only.has(c.id)) : allCases;

// ── Rubric ──────────────────────────────────────────────────────────────────
const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    tiny: { type: 'integer', description: 'Doable in about two minutes or less (1-5)' },
    concrete: { type: 'integer', description: 'A physical, observable action, not thinking or planning (1-5)' },
    noDecisions: { type: 'integer', description: 'Needs no choices from the student; any choice is made for them (1-5)' },
    specific: { type: 'integer', description: 'Specific to this step, naming the actual thing involved; not generic advice (1-5)' },
    progress: { type: 'integer', description: 'Doing it leaves the student visibly closer to finishing the step (1-5)' },
    fitsReason: { type: 'integer', description: "Answers what's in the way (and differs from earlier suggestions, if any) (1-5)" },
    overall: { type: 'integer', description: 'Would a stuck, procrastinating student actually do this right now? (1-5)' },
    notes: { type: 'string', description: 'One sentence on the biggest weakness' },
  },
  required: ['tiny', 'concrete', 'noDecisions', 'specific', 'progress', 'fitsReason', 'overall', 'notes'],
  additionalProperties: false,
};
const CRITERIA = ['overall', 'tiny', 'concrete', 'noDecisions', 'specific', 'progress', 'fitsReason'];

function gradePrompt(c, action) {
  return `You are grading the "I'm stuck" helper in ProcrastiNation, an app for students who procrastinate. A student in a focus timer pressed "I'm stuck" on a step and said what's in the way. The helper must answer with ONE tiny first action: about two minutes, physical and concrete, no decisions needed, specific to this exact step, and it should leave the student closer to done so continuing feels easy.

${c.parent ? `<task>${c.parent}</task>\n` : ''}<step>${c.step}</step>
${c.notes ? `<step_details>${c.notes}</step_details>\n` : ''}<whats_in_the_way>${STUCK_REASONS[c.reason].said}</whats_in_the_way>
<procrastination_type>${c.type ?? 'none given'}</procrastination_type>
${c.avoid?.length ? `<earlier_suggestions>${c.avoid.join(' | ')}</earlier_suggestions>\n` : ''}
<action>${action}</action>

Score each criterion from 1 (poor) to 5 (excellent). Be strict: 5 means nothing meaningful to improve.`;
}

// ── Run ─────────────────────────────────────────────────────────────────────
async function runCase(c) {
  const started = Date.now();
  let action;
  try {
    ({ action } = await callClaude({
      model: config.model,
      effort: config.effort,
      maxTokens: 4000,
      schema: UNSTICK_SCHEMA,
      messages: [
        {
          role: 'user',
          content: buildUnstickPrompt({
            step: c.step,
            notes: c.notes,
            parent: c.parent,
            reason: c.reason,
            procrastinationType: c.type,
            avoid: c.avoid,
          }),
        },
      ],
      timeoutMs: 60_000,
    }));
  } catch (err) {
    return { id: c.id, error: err.message, latencyMs: Date.now() - started };
  }
  const latencyMs = Date.now() - started;
  const words = action.trim().split(/\s+/).length;

  let grade;
  try {
    grade = await callClaude({
      model: MODELS.plan,
      effort: 'medium',
      schema: GRADE_SCHEMA,
      messages: [{ role: 'user', content: gradePrompt(c, action) }],
      timeoutMs: 120_000,
    });
  } catch (err) {
    grade = { error: err.message };
  }
  return { id: c.id, latencyMs, words, action, grade };
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
        process.stdout.write('.');
      }
    }),
  );
  process.stdout.write('\n');
  return out;
}

console.log(`Running ${cases.length} cases · config=${configName}`);
const results = await pool(cases, 6, runCase);

// ── Summary ─────────────────────────────────────────────────────────────────
const ok = results.filter((r) => !r.error && !r.grade?.error);
const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
const passes = ok.filter((r) => r.words <= 25 && r.grade.overall >= 4 && CRITERIA.every((k) => r.grade[k] >= 3));
const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

const summary = {
  label,
  config: configName,
  cases: cases.length,
  errors: results.length - ok.length,
  passRate: `${passes.length}/${ok.length}`,
  over25Words: ok.filter((r) => r.words > 25).length,
  latencyP50s: latencies[Math.floor(latencies.length / 2)] / 1000,
  latencyP95s: latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] / 1000,
  ...Object.fromEntries(CRITERIA.map((k) => [`avg_${k}`, avg(ok.map((r) => r.grade[k]))])),
};

fs.mkdirSync(path.join(here, 'results'), { recursive: true });
fs.writeFileSync(path.join(here, 'results', `${label}.json`), JSON.stringify({ summary, results }, null, 2));

console.table(summary);
for (const r of ok) console.log(`${passes.includes(r) ? 'PASS' : 'FAIL'}  ${r.id.padEnd(18)} ${r.action}`);
const fails = ok.filter((r) => !passes.includes(r));
if (fails.length) console.log('\nWeakest:\n' + fails.map((r) => `  ${r.id} (overall ${r.grade.overall}): ${r.grade.notes}`).join('\n'));
const errs = results.filter((r) => r.error || r.grade?.error);
if (errs.length) console.log('Errors:', errs.map((r) => `${r.id}: ${r.error || r.grade.error}`).join('; '));
