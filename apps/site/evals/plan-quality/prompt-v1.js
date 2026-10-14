// Original production plan prompt (before the Sonnet 5.5 migration), kept as the eval baseline.
import { sanitizeForXml } from '../../lib/ai.js';
export { PLAN_SCHEMA } from '../../lib/prompts/plan.js';

export function buildPlanPrompt({ taskContext, deadline, today, procrastinationType }) {
  return `You are an AI productivity assistant helping students and professionals break down tasks into micro-steps.

Today is ${today.label} (${today.iso}).
<task>${sanitizeForXml(taskContext)}</task>
<deadline>${sanitizeForXml(deadline)}</deadline>

Generate a realistic, actionable plan with the appropriate number of micro-steps (typically 3-8 depending on complexity) that will help complete this task on time. Each step should:
- Be small and specific (15-45 minutes of work)
- Build on previous steps logically
- Be easy to start (low activation energy)
- Include estimated time
- Number of steps should match task complexity (simpler tasks = fewer steps, complex tasks = more steps)
${procrastinationType ? `
The user has been identified as a <procrastination_type>${sanitizeForXml(procrastinationType)}</procrastination_type> procrastinator. Tailor your step descriptions accordingly:
- If "avoider": Use encouraging, low-pressure language. Emphasize "just get started" and small first actions. Make the first step trivially easy.
- If "perfectionist": Explicitly say "rough draft is fine" or "don't aim for perfect." Remind them done > perfect.
- If "overwhelmed": Break steps into the smallest possible pieces. Reassure them each step is very manageable on its own.
- If "boredom": Make steps sound interesting or varied. Suggest timeboxing (e.g. "spend just 15 focused minutes") to keep things moving.
` : ''}
Resolve the deadline into resolvedDueDate using today's date. Give each step a "when" that fits the time available before the deadline.`;
}
