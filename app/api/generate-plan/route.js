import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/authMiddleware';

export async function POST(request) {
  try {
    const { task, deadline, clarificationAnswers, clarificationQuestions, checkClarification, procrastinationType } = await request.json();

    const { user, token, error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // If we're checking for clarification needs
    if (checkClarification) {
      const clarificationPrompt = `You are an AI productivity assistant. A user wants help breaking down a task.

Task: ${task}
Deadline: ${deadline}

Analyze if this task description is specific enough to create a detailed plan. If the task is vague or missing key information, ask 2-3 clarifying questions. If it's specific enough, respond with "SUFFICIENT".

For vague tasks, ask about:
- Specific subject/topic if not mentioned
- Length/scope (word count, number of slides, number of problems, pages, etc.)
- Any special requirements or format

Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "needsClarification": true or false,
  "questions": ["question 1", "question 2", "question 3"] or []
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: clarificationPrompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.error?.message || 'Failed to check clarification' },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text = data.content.map(item => item.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      let result;
      try {
        result = JSON.parse(clean);
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
      }

      return NextResponse.json(result);
    }

    // Enforce monthly plan limit for free (non-trial) users
    const trialEndsAt = user.user_metadata?.trial_ends_at;
    const isProOrTrial = trialEndsAt && new Date(trialEndsAt) > new Date();
    if (!isProOrTrial) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { count } = await userSupabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth);
      if (count >= 5) {
        return NextResponse.json(
          { error: 'Monthly plan limit reached. Upgrade to Pro for unlimited plans.' },
          { status: 429 }
        );
      }
    }

    // Build task context with clarifications if provided
    let taskContext = task;
    if (clarificationAnswers && Object.keys(clarificationAnswers).length > 0 && clarificationQuestions) {
      taskContext += '\n\nAdditional details:\n';
      clarificationQuestions.forEach((q, i) => {
        if (clarificationAnswers[i]) {
          taskContext += `- ${q} ${clarificationAnswers[i]}\n`;
        }
      });
    }

    // Generate the plan
    const planPrompt = `You are an AI productivity assistant helping students and professionals break down tasks into micro-steps.

Task: ${taskContext}
Deadline: ${deadline}

Generate a realistic, actionable plan with the appropriate number of micro-steps (typically 3-8 depending on complexity) that will help complete this task on time. Each step should:
- Be small and specific (15-45 minutes of work)
- Build on previous steps logically
- Be easy to start (low activation energy)
- Include estimated time
- Number of steps should match task complexity (simpler tasks = fewer steps, complex tasks = more steps)
${procrastinationType ? `
The user has been identified as a "${procrastinationType}" procrastinator. Tailor your step descriptions accordingly:
- If "avoider": Use encouraging, low-pressure language. Emphasize "just get started" and small first actions. Make the first step trivially easy.
- If "perfectionist": Explicitly say "rough draft is fine" or "don't aim for perfect." Remind them done > perfect.
- If "overwhelmed": Break steps into the smallest possible pieces. Reassure them each step is very manageable on its own.
- If "boredom": Make steps sound interesting or varied. Suggest timeboxing (e.g. "spend just 15 focused minutes") to keep things moving.
` : ''}
Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "taskTitle": "brief rewrite of the task",
  "analysis": "one sentence about the approach",
  "totalEstimatedTime": "X hours",
  "resolvedDueDate": "YYYY-MM-DD or null if no clear deadline",
  "steps": [
    {
      "id": 1,
      "title": "step title",
      "description": "what to do",
      "estimatedTime": "X min",
      "when": "suggested timing like 'Today' or 'Tomorrow morning'"
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: planPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate plan' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.content.map(item => item.text || '').join('\n');
    const clean = text.replace(/```json|```/g, '').trim();
    let plan;
    try {
      plan = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error in generate-plan API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
