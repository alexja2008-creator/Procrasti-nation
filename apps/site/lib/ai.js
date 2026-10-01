// Single entry point for Anthropic calls. Raw fetch (project convention), one place
// to change models, structured JSON output instead of regex-parsing replies.

export const MODELS = {
  // Quality-critical: adherence plans, clarifying questions, syllabus parsing.
  plan: 'claude-sonnet-5-5',
  // Cheap + fast: step-date resolution, short copy. Never used to build plans.
  fast: 'claude-haiku-4-5',
};

// Effort for plan generation on Sonnet 5.5, chosen by evals/plan-quality
// (on the original prompt, medium passed 20/30 cases vs 14/30 at low, at the same latency).
export const PLAN_EFFORT = 'medium';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_TIMEOUT_MS = 45_000;

export class AIError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * Call Claude and return the reply text, or the parsed object when `schema` is given.
 * `effort` only applies to Sonnet/Opus models — Haiku 4.5 rejects it.
 */
export async function callClaude({
  model,
  messages,
  system,
  schema,
  effort,
  maxTokens = 16000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AIError('API key not configured', 500);

  const body = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;

  const outputConfig = {};
  if (effort) outputConfig.effort = effort;
  if (schema) outputConfig.format = { type: 'json_schema', schema };
  if (Object.keys(outputConfig).length > 0) body.output_config = outputConfig;

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };

  // Sonnet 5.5 safety classifiers can decline benign requests; let the API retry
  // on its recommended fallback model instead of failing the user's plan.
  if (model === MODELS.plan) {
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw new AIError('The AI took too long to respond. Please try again.', 504);
    throw new AIError('AI request failed. Please try again.', 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`[ai] ${model} HTTP ${response.status}:`, detail.slice(0, 500));
    throw new AIError('AI request failed. Please try again.', response.status === 429 ? 429 : 502);
  }

  const data = await response.json();

  if (data.stop_reason === 'refusal') {
    console.error(`[ai] ${model} refusal:`, data.stop_details?.category);
    throw new AIError("The AI couldn't help with that request. Try rewording it.", 422);
  }
  if (data.stop_reason === 'max_tokens') {
    console.error(`[ai] ${model} hit max_tokens (${maxTokens})`);
    throw new AIError('The AI response was cut off. Please try again.', 502);
  }

  // Responses can start with thinking blocks — only text blocks carry the answer.
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!schema) return text;

  try {
    return JSON.parse(text);
  } catch {
    console.error(`[ai] ${model} returned invalid JSON:`, text.slice(0, 500));
    throw new AIError('Failed to parse AI response. Please try again.', 502);
  }
}

// Escape angle brackets so user text can't close the XML tags that delimit it in prompts.
export function sanitizeForXml(s) {
  return String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Resolve the user's "today" from what the client sent, falling back to the server clock.
// Returns { iso: 'YYYY-MM-DD', label: 'Wednesday, September 30, 2026', timeZone }.
export function resolveToday(clientToday, clientTimeZone) {
  const timeZone = isValidTimeZone(clientTimeZone) ? clientTimeZone : 'UTC';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(clientToday || '')
    ? clientToday
    : new Date().toLocaleDateString('en-CA', { timeZone });
  const label = new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  return { iso, label, timeZone };
}

function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
