import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/authMiddleware';
import { callClaude, AIError, MODELS } from '../../../lib/ai';
import { STUCK_REASONS, UNSTICK_SCHEMA, buildUnstickPrompt } from '../../../lib/prompts/unstick';

export const maxDuration = 30;

// Start Mode's "I'm stuck" is free (it's the moat, not a Pro feature), with a
// per-person daily cap so the route can't be used as an open AI proxy.
const DAILY_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
// Chosen by evals/unstick: Sonnet at low effort beat Haiku (12/16 vs 8/16) at ~2s.
const EFFORT = 'low';
const STYLES = new Set(['avoider', 'perfectionist', 'overwhelmed', 'boredom']);

const isText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isOptionalText = (v, max) => v == null || (typeof v === 'string' && v.length <= max);

export async function POST(request) {
  try {
    const { user, token, error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { step, notes, parent, reason, procrastinationType, avoid = [] } = await request.json();

    if (!isText(step, 300)) {
      return NextResponse.json({ error: 'step is required (max 300 characters)' }, { status: 400 });
    }
    if (!isOptionalText(notes, 1000) || !isOptionalText(parent, 300)) {
      return NextResponse.json({ error: 'notes or parent is too long' }, { status: 400 });
    }
    if (!Object.hasOwn(STUCK_REASONS, reason)) {
      return NextResponse.json({ error: 'invalid reason' }, { status: 400 });
    }
    if (procrastinationType != null && !STYLES.has(procrastinationType)) {
      return NextResponse.json({ error: 'invalid procrastinationType' }, { status: 400 });
    }
    if (!Array.isArray(avoid) || avoid.length > 3 || !avoid.every((a) => isText(a, 300))) {
      return NextResponse.json({ error: 'avoid must be up to 3 short strings' }, { status: 400 });
    }

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Log this request first, then count the last 24 hours including it, so a burst
    // of parallel requests can't all slip under the cap (RLS: insert and read own
    // rows only, so the count can't be reset). Refused requests count too.
    const { error: logError } = await userSupabase.from('ai_requests').insert({ user_id: user.id, kind: 'unstick' });
    if (logError) throw logError;
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { count, error: countError } = await userSupabase
      .from('ai_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('kind', 'unstick')
      .gte('created_at', since);
    if (countError) throw countError;
    if (count > DAILY_LIMIT) {
      return NextResponse.json({ error: 'Daily limit reached. Try again tomorrow.' }, { status: 429 });
    }

    const { action } = await callClaude({
      model: MODELS.plan,
      effort: EFFORT,
      maxTokens: 4000,
      timeoutMs: 20_000,
      schema: UNSTICK_SCHEMA,
      messages: [
        {
          role: 'user',
          content: buildUnstickPrompt({ step, notes, parent, reason, procrastinationType, avoid }),
        },
      ],
    });

    const trimmed = typeof action === 'string' ? action.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'No suggestion came back. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ action: trimmed.slice(0, 300) });
  } catch (error) {
    if (error instanceof AIError) {
      // The app reads 429 as "your daily limit"; an upstream rate limit is just "try again".
      return NextResponse.json({ error: error.message }, { status: error.status === 429 ? 503 : error.status });
    }
    console.error('Error in unstick API:', error?.code ?? error?.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
