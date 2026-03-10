import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { steps, deadline, dueDate, today } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `You are a scheduling assistant. Given a list of task steps with relative timing descriptions, resolve each step's "when" field into a concrete calendar date.

Today's date: ${today}
${dueDate ? `Due date (structured): ${dueDate}` : ''}
${deadline ? `Deadline (as described by user): ${deadline}` : ''}

Steps:
${steps.map((s, i) => `${i + 1}. "${s.title}" — when: "${s.when}"`).join('\n')}

Rules:
- Interpret each "when" string relative to the due date (if provided) or today
- If no due date is available, interpret relative to today
- "Day before deadline" = due date minus 1 day
- "2 days before deadline" = due date minus 2 days
- "3-4 days before deadline" = due date minus 3 days (use the earlier/more conservative end)
- "Same day as step N" = same date you assigned to step N
- "Next day" = one day after the previous step's date
- "Today" = today's date
- "Tomorrow" = today + 1 day
- Never assign a date earlier than today
- Never assign a date after the due date (clamp to due date if needed)
- Return one ISO date (YYYY-MM-DD) per step, in the same order as the input

Respond ONLY with valid JSON, no preamble or markdown:
{
  "dates": ["YYYY-MM-DD", "YYYY-MM-DD", ...]
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
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || 'AI request failed' }, { status: response.status });
    }

    const data = await response.json();
    const text = data.content.map(item => item.text || '').join('\n');
    const clean = text.replace(/```json|```/g, '').trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
