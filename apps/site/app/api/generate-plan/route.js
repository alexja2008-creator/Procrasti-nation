import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/authMiddleware';
import { callClaude, AIError, MODELS, PLAN_EFFORT, resolveToday } from '../../../lib/ai';
import { CLARIFY_SCHEMA, PLAN_SCHEMA, buildClarificationPrompt, buildPlanPrompt } from '../../../lib/prompts/plan';

export const maxDuration = 60;

const FREE_PLANS_PER_MONTH = 3;

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

    // Clarification checks are free — they do not count against the monthly plan cap
    if (checkClarification) {
      const result = await callClaude({
        model: MODELS.plan,
        effort: 'low',
        schema: CLARIFY_SCHEMA,
        messages: [{ role: 'user', content: buildClarificationPrompt({ task, deadline, today }) }],
      });
      return NextResponse.json(result);
    }

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Enforce monthly plan limit for free users (not in trial, not subscribed)
    const trialEndsAt = user.user_metadata?.trial_ends_at;
    const inTrial = trialEndsAt && new Date(trialEndsAt) > new Date();
    if (!inTrial) {
      const { data: profile } = await userSupabase
        .from('profiles')
        .select('stripe_subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();
      const isPro = profile?.stripe_subscription_status === 'active';

      if (!isPro) {
        // Count plans actually built (v2: most tasks come from quick add, not the planner).
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count, error: countError } = await userSupabase
          .from('plan_generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth);
        if (countError) throw countError;
        if (count >= FREE_PLANS_PER_MONTH) {
          return NextResponse.json(
            { error: 'Monthly plan limit reached. Upgrade to Pro for unlimited plans.' },
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

    // Log the plan for the monthly allowance (RLS: the user can insert their own rows only).
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
