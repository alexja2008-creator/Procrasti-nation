import { NextResponse } from 'next/server';

function buildPersonalizationContext(profile) {
  if (!profile) return '';
  const lines = [];
  if (profile.userType === 'student')      lines.push('User is a student. Use encouraging language, reference assignments and grades.');
  if (profile.userType === 'professional') lines.push('User is an early-career professional. Be outcome-focused and concise.');
  if (profile.userType === 'freelancer')   lines.push('User is a freelancer. Reference client deliverables and self-discipline.');
  if (profile.adhdLevel === 'often')       lines.push('User has ADHD. Use very small steps (5–10 min each), high-energy affirming tone, suggest body-doubling for longer tasks.');
  if (profile.adhdLevel === 'sometimes')   lines.push('User sometimes has focus challenges. Keep steps concrete and specific, avoid abstract instructions.');
  if (profile.workStyle === 'bursts')      lines.push('Cap each step at 25 minutes max. Structure the plan as Pomodoro-style sprints with natural break points.');
  if (profile.workStyle === 'long')        lines.push('Steps can be 45–90 minutes. Group related actions into fewer, larger chunks.');
  if (profile.primaryGoal === 'academic')  lines.push('Frame steps around submission deadlines and grade impact.');
  if (profile.primaryGoal === 'work')      lines.push('Frame steps around professional deliverables and time-to-completion.');
  if (profile.primaryGoal === 'habits')    lines.push('Tie steps to a consistent daily routine. Emphasize progress over perfection.');
  return lines.length ? `\n\nUser personalization (adapt your plan accordingly):\n${lines.join('\n')}` : '';
}

export async function POST(request) {
  try {
    const { task, deadline, clarificationAnswers, clarificationQuestions, checkClarification, userProfile } = await request.json();

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
    const planPrompt = `You are an AI productivity assistant helping students and professionals break down tasks into micro-steps.${buildPersonalizationContext(userProfile)}

Task: ${taskContext}
Deadline: ${deadline}

Generate a realistic, actionable plan with the appropriate number of micro-steps (typically 3-8 depending on complexity) that will help complete this task on time. Each step should:
- Be small and specific (15-45 minutes of work)
- Build on previous steps logically
- Be easy to start (low activation energy)
- Include estimated time
- Number of steps should match task complexity (simpler tasks = fewer steps, complex tasks = more steps)

Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "taskTitle": "brief rewrite of the task",
  "analysis": "one sentence about the approach",
  "totalEstimatedTime": "X hours",
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
