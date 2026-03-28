import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/authMiddleware';

const ANTHROPIC_TIMEOUT_MS = 30_000;

export async function POST(request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { steps, deadline, dueDate, today } = await request.json();

    if (!Array.isArray(steps) || steps.length === 0 || steps.length > 20) {
      return NextResponse.json({ error: 'steps must be between 1 and 20 items' }, { status: 400 });
    }
    if (!steps.every(s => s && typeof s.title === 'string' && typeof s.when === 'string')) {
      return NextResponse.json({ error: 'each step must have a title and when string' }, { status: 400 });
    }
    if (steps.some(s => s.title.length > 200 || s.when.length > 100)) {
      return NextResponse.json({ error: 'step fields exceed maximum length' }, { status: 400 });
    }
    if (today && String(today).length > 50) {
      return NextResponse.json({ error: 'invalid today value' }, { status: 400 });
    }
    if (deadline && String(deadline).length > 200) {
      return NextResponse.json({ error: 'deadline is too long' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const sanitizeForXml = (s) => String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const prompt = `You are a scheduling assistant. Given a list of task steps with relative timing descriptions, resolve each step's "when" field into a concrete calendar date.

Today's date: <today>${sanitizeForXml(today)}</today>
${dueDate ? `Due date (structured): <due_date>${sanitizeForXml(dueDate)}</due_date>` : ''}
${deadline ? `Deadline (as described by user): <deadline>${sanitizeForXml(deadline)}</deadline>` : ''}

<steps>
${steps.map((s, i) => `${i + 1}. <title>${sanitizeForXml(s.title)}</title> — when: <when>${sanitizeForXml(s.when)}</when>`).join('\n')}
</steps>

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

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), ANTHROPIC_TIMEOUT_MS);
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
      signal: ac.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json({ error: 'AI request failed. Please try again.' }, { status: response.status });
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
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
