// Prompt + schema for resolving plan steps' "when" text into calendar dates.
// Shared by app/api/resolve-step-dates and evals/plan-quality/dates-check.mjs.
import { sanitizeForXml } from '../ai.js';

export const DATES_SCHEMA = {
  type: 'object',
  properties: {
    dates: { type: 'array', items: { type: 'string', format: 'date' } },
  },
  required: ['dates'],
  additionalProperties: false,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "Wed 2026-09-30 (today)", "Thu 2026-10-01", … so the model never does weekday arithmetic.
function upcomingDays(todayIso, count) {
  const start = Date.parse(`${todayIso}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start + i * DAY_MS);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    return `${weekday} ${d.toISOString().slice(0, 10)}${i === 0 ? ' (today)' : ''}`;
  }).join('\n');
}

export function buildDatesPrompt({ steps, today, dueDate, deadline }) {
  return `You are a scheduling assistant. Given a list of task steps with relative timing descriptions, resolve each step's "when" field into a concrete calendar date.

Today's date: <today>${today.label} (${today.iso})</today>
${dueDate ? `Due date (structured): <due_date>${sanitizeForXml(dueDate)}</due_date>` : ''}
${deadline ? `Deadline (as described by user): <deadline>${sanitizeForXml(deadline)}</deadline>` : ''}

The next 14 days, for looking up weekdays:
${upcomingDays(today.iso, 14)}

<steps>
${steps.map((s, i) => `${i + 1}. <title>${sanitizeForXml(s.title)}</title> — when: <when>${sanitizeForXml(s.when)}</when>`).join('\n')}
</steps>

Rules:
- Interpret each "when" string relative to the due date (if provided) or today
- If no due date is available, interpret relative to today
- "Today" and "Tonight" = today's date; "Tomorrow" = today + 1 day
- A weekday name ("Thursday") = its next occurrence on or after today, taken from the list above
- A calendar date ("Oct 17") = that date, in the year that keeps it on or after today
- "Day before deadline" = due date minus 1 day; "2 days before deadline" = due date minus 2 days
- "3-4 days before deadline" = due date minus 3 days (use the earlier/more conservative end)
- "Same day as step N" = same date you assigned to step N
- "Next day" = one day after the previous step's date
- Never assign a date earlier than today
- Never assign a date after the due date (clamp to due date if needed)
- Return one ISO date (YYYY-MM-DD) per step, in the same order as the input`;
}
