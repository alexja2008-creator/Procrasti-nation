import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/authMiddleware';
import { callClaude, AIError, MODELS, PLAN_EFFORT, resolveToday } from '../../../lib/ai';
import { CLARIFY_SCHEMA, PLAN_SCHEMA, buildClarificationPrompt, buildPlanPrompt } from '../../../lib/prompts/plan';
import { trialDaysRemaining } from '../../../lib/trial';
import { FREE_PLANS_PER_WINDOW, planWindow } from '../../../lib/core';

export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
// Clarifying questions are free, but an anonymous passport costs nothing to make, so they're capped.
const CLARIFY_DAILY_LIMIT = 20;
// One plan at a time per person: a burst of parallel requests can't all pass the free tier's count.
const ONE_PLAN_AT_A_TIME_MS = 20 * 1000;

/**
 * Logs this request first, then counts the person's requests of that kind since `sinceMs` ago,
 * this one included, so parallel requests can't all slip under (RLS: insert and read own rows).
 */
async function logAndCount(db, userId, kind, sinceMs) {
  const { error: logError } = await db.from('ai_requests').insert({ user_id: userId, kind });
  if (logError) throw logError;
  const { count, error } = await db
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', new Date(Date.now() - sinceMs).toISOString());
  if (error) throw error;
  return count;
}

export async function POST(request) {
  try {
    const { user, token, error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { task, taskId, deadline, clarificationAnswers, clarificationQuestions, checkClarification, procrastinationType, today: clientToday, timeZone } = await request.json();

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return NextResponse.json({ error: 'task is required' }, { status: 400 });
    }
    if (task.length > 2000) {
      return NextResponse.json({ error: 'task is too long' }, { status: 400 });
    }
    if (deadline && deadline.length > 200) {
      return NextResponse.json({ error: 'deadline is too long' }, { status: 400 });
    }
    if (procrastinationType && procrastinationType.length > 50) {
      return NextResponse.json({ error: 'invalid procrastinationType' }, { status: 400 });
    }
    if (taskId != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(taskId))) {
      return NextResponse.json({ error: 'invalid taskId' }, { status: 400 });
    }

    const today = resolveToday(clientToday, timeZone);

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Clarification checks don't count against the free plans, but they're capped per day.
    if (checkClarification) {
      if ((await logAndCount(userSupabase, user.id, 'clarify', DAY_MS)) > CLARIFY_DAILY_LIMIT) {
        return NextResponse.json({ error: 'Daily limit reached. Try again tomorrow.' }, { status: 429 });
      }
      const result = await callClaude({
        model: MODELS.plan,
        effort: 'low',
        schema: CLARIFY_SCHEMA,
        messages: [{ role: 'user', content: buildClarificationPrompt({ task, deadline, today }) }],
      });
      return NextResponse.json(result);
    }

    if ((await logAndCount(userSupabase, user.id, 'plan', ONE_PLAN_AT_A_TIME_MS)) > 1) {
      return NextResponse.json({ error: 'A plan is already being made. Try again in a moment.' }, { status: 409 });
    }

    // The free tier's plans (not in trial, not subscribed). An anonymous passport costs nothing to
    // make, so it never gets the no-card trial: its free plans are all it has until the real trial.
    const inTrial = !user.is_anonymous && trialDaysRemaining(user) > 0;
    if (!inTrial) {
      const { data: subscriptionStatus, error: statusError } = await userSupabase.rpc('my_subscription_status');
      if (statusError) console.error('generate-plan: could not read subscription status', statusError.code);
      const isPro = subscriptionStatus === 'active';

      if (!isPro) {
        // Count plans actually built in the current 30.5-day window from the account's creation.
        const { count, error: countError } = await userSupabase
          .from('plan_generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', planWindow(user.created_at).start.toISOString());
        if (countError) throw countError;
        if (count >= FREE_PLANS_PER_WINDOW) {
          return NextResponse.json(
            { error: 'Free plan limit reached for now. Upgrade to Pro for unlimited plans.' },
            { status: 429 }
          );
        }
      }
    }

    // Build task context with clarifications if provided
    if (clarificationAnswers && (
      Object.keys(clarificationAnswers).length > 10 ||
      Object.values(clarificationAnswers).some(v => typeof v !== 'string' || v.length > 500)
    )) {
      return NextResponse.json({ error: 'Invalid clarification answers' }, { status: 400 });
    }
    let taskContext = task;
    if (clarificationAnswers && Object.keys(clarificationAnswers).length > 0 && clarificationQuestions) {
      taskContext += '\n\nAdditional details:\n';
      clarificationQuestions.forEach((q, i) => {
        if (clarificationAnswers[i]) {
          taskContext += `- ${q} ${clarificationAnswers[i]}\n`;
        }
      });
    }

    const plan = await callClaude({
      model: MODELS.plan,
      effort: PLAN_EFFORT,
      schema: PLAN_SCHEMA,
      messages: [{ role: 'user', content: buildPlanPrompt({ taskContext, deadline, today, procrastinationType }) }],
    });

    // Log the plan for the free allowance (RLS: the user can insert their own rows only).
    const { error: logError } = await userSupabase
      .from('plan_generations')
      .insert({ user_id: user.id, task_id: taskId ?? null });
    if (logError) console.error('generate-plan: could not log plan generation', logError.code);

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof AIError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in generate-plan API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
