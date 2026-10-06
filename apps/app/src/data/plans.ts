// "Plan it": the AI Adherence Planner (apps/site /api/generate-plan, unchanged
// and eval-gated) plus date resolution, saved as real child tasks.
import { fallbackStepDates, localTimeZone, parseMinutes, plannerStyle, type LocalDate, type Task } from '@pn/core';
import * as Crypto from 'expo-crypto';

import { insertSteps, setDeleted, updateTask } from '@/data/tasks';
import { apiPost } from '@/lib/api';

export interface PlanStep {
  id: number;
  title: string;
  description: string;
  estimatedTime: string;
  when: string;
}

export interface Plan {
  taskTitle: string;
  analysis: string;
  totalEstimatedTime: string;
  resolvedDueDate: string | null;
  steps: PlanStep[];
}

const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Up to three clarifying questions if the task is too vague to plan well (free; not counted). */
export async function clarifyingQuestions(task: Task, today: LocalDate): Promise<string[]> {
  const result = await apiPost<{ needsClarification: boolean; questions: string[] }>('/api/generate-plan', {
    task: task.title,
    deadline: task.dueOn ?? undefined,
    checkClarification: true,
    today,
    timeZone: localTimeZone(),
  });
  return result.needsClarification ? result.questions.slice(0, 3) : [];
}

export async function generatePlan(
  task: Task,
  today: LocalDate,
  options: { questions?: string[]; answers?: string[]; style?: string } = {},
): Promise<Plan> {
  const answers = Object.fromEntries((options.answers ?? []).map((a, i) => [i, a.trim()]).filter(([, a]) => a));
  const { plan } = await apiPost<{ plan: Plan }>('/api/generate-plan', {
    task: task.title,
    taskId: task.id,
    deadline: task.dueOn ?? undefined,
    clarificationQuestions: options.questions,
    clarificationAnswers: answers,
    procrastinationType: plannerStyle(options.style),
    today,
    timeZone: localTimeZone(),
  });
  return plan;
}

/** A calendar date per step (Haiku resolves "Tomorrow morning" etc.), or an even spread if that fails. */
export async function resolveStepDates(plan: Plan, today: LocalDate, dueOn: LocalDate | null): Promise<LocalDate[]> {
  try {
    const { dates } = await apiPost<{ dates: string[] }>('/api/resolve-step-dates', {
      steps: plan.steps.slice(0, 20).map((s) => ({ title: s.title.slice(0, 200), when: s.when.slice(0, 100) })),
      dueDate: dueOn ?? undefined,
      today,
    });
    if (dates.length === plan.steps.length && dates.every(isIsoDate)) return dates;
  } catch {
    // fall through to the even spread
  }
  return fallbackStepDates(plan.steps.length, today, dueOn);
}

/**
 * Saves the plan: steps become child tasks; the task gets the plan's deadline
 * if it had none. A re-plan passes the open steps it `replaces` (soft-deleted,
 * and returned marked so) and continues numbering after the finished ones.
 */
export async function savePlan(
  task: Task,
  plan: Plan,
  dates: LocalDate[],
  { replaces = [], after = 0 }: { replaces?: Task[]; after?: number } = {},
): Promise<Task[]> {
  const steps = await insertSteps(
    plan.steps.map((s, i) => ({
      id: Crypto.randomUUID(),
      userId: task.userId,
      parentId: task.id,
      title: s.title,
      notes: s.description.trim() || null,
      estimateMinutes: parseMinutes(s.estimatedTime),
      scheduledOn: dates[i] ?? null,
      sortOrder: after + i + 1,
    })),
  );
  if (replaces.length) {
    const stamp = new Date().toISOString();
    try {
      await setDeleted(
        replaces.map((t) => t.id),
        stamp,
      );
    } catch (e) {
      // Don't leave both plans behind: take the new steps back out, then report.
      await setDeleted(
        steps.map((t) => t.id),
        stamp,
      ).catch(() => undefined);
      throw e;
    }
    steps.push(...replaces.map((t) => ({ ...t, deletedAt: stamp })));
  }
  if (!task.dueOn && isIsoDate(plan.resolvedDueDate)) {
    try {
      return [await updateTask(task.id, { dueOn: plan.resolvedDueDate }), ...steps];
    } catch {
      // The steps are saved; a missing deadline isn't worth failing (and duplicating) the plan.
    }
  }
  return steps;
}
