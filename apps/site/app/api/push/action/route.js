import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SNOOZE_MINUTES } from '../../../../lib/core';
import { readSnoozeToken } from '../../../../lib/push';

// Snooze 10 min, pressed on a web reminder. The service worker
// (apps/app/public/sw.js) posts the signed token the notification carried; no
// session is involved, since the page may not be open. The token is good for
// snoozing that one task only, so the route runs as the server
// (service role) but touches nothing else. The sender rings it with the same
// words in 10 minutes, while the task is still open.

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Snoozes waiting per person; more than this is someone replaying a token. */
const MAX_PENDING = 20;

export async function POST(request) {
  try {
    const { token, action } = await request.json().catch(() => ({}));
    if (action !== 'snooze') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    const snooze = readSnoozeToken(token);
    if (!snooze) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('id', snooze.taskId)
      .eq('user_id', snooze.userId)
      .is('deleted_at', null)
      .is('completed_at', null)
      .maybeSingle();
    if (taskError) throw new Error(taskError.message);
    // Finished or deleted since it rang: nothing to bring back.
    if (!task) return NextResponse.json({ snoozed: false });

    const { count, error: countError } = await supabaseAdmin
      .from('push_snoozes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', snooze.userId);
    if (countError) throw new Error(countError.message);
    if (count >= MAX_PENDING) {
      return NextResponse.json({ error: 'Too many snoozes' }, { status: 429 });
    }

    const ringAt = new Date(Date.now() + SNOOZE_MINUTES * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from('push_snoozes').insert({
      user_id: snooze.userId,
      task_id: snooze.taskId,
      ring_at: ringAt,
      day: snooze.day,
      title: snooze.title,
      body: snooze.body,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ snoozed: true, ringAt });
  } catch (err) {
    console.error('[push/action] Failed:', err.message);
    return NextResponse.json({ error: 'Could not snooze' }, { status: 500 });
  }
}
