import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/authMiddleware';
import { callClaude, AIError, MODELS, resolveToday } from '../../../lib/ai';
import { DATES_SCHEMA, buildDatesPrompt } from '../../../lib/prompts/dates';

export const maxDuration = 60;

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

    const todayInfo = resolveToday(today);
    const prompt = buildDatesPrompt({ steps, today: todayInfo, dueDate, deadline });

    const result = await callClaude({
      model: MODELS.fast,
      maxTokens: 1024,
      schema: DATES_SCHEMA,
      messages: [{ role: 'user', content: prompt }],
    });

    // Safety net for the prompt's rules: never before today, never after the due date
    const dueIso = /^\d{4}-\d{2}-\d{2}$/.test(dueDate || '') && dueDate >= todayInfo.iso ? dueDate : null;
    const dates = result.dates.map(d => {
      if (d < todayInfo.iso) return todayInfo.iso;
      if (dueIso && d > dueIso) return dueIso;
      return d;
    });

    return NextResponse.json({ dates });
  } catch (error) {
    if (error instanceof AIError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
