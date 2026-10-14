// "I'm stuck": apps/site /api/unstick turns the step into one tiny first action.
import { plannerStyle, type StuckReason, type Task } from '@pn/core';

import { apiPost } from '@/lib/api';

export async function tinyFirstAction(
  step: Task,
  options: { parentTitle?: string; reason: StuckReason; style?: string; avoid: string[] },
): Promise<string> {
  const { action } = await apiPost<{ action: string }>('/api/unstick', {
    step: step.title.slice(0, 300),
    notes: step.notes?.slice(0, 1000) ?? undefined,
    parent: options.parentTitle?.slice(0, 300),
    reason: options.reason,
    procrastinationType: plannerStyle(options.style),
    avoid: options.avoid.slice(-3).map((a) => a.slice(0, 300)),
  });
  return action;
}
