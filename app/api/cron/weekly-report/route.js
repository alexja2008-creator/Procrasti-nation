import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildWeeklyReportEmail } from '../../../../lib/emails';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);
const ANTHROPIC_TIMEOUT_MS = 30_000;

async function generatePepTalk(completedCount, inProgressCount, streak) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const context = completedCount > 0
    ? `completed ${completedCount} task${completedCount === 1 ? '' : 's'} this week with a ${streak}-day streak`
    : `didn't complete any tasks this week but has ${inProgressCount} task${inProgressCount === 1 ? '' : 's'} in progress`;

  const prompt = `You are the voice of ProcrastiNation, a productivity app with a "nation/citizenship" brand voice — direct, self-aware, encouraging without being saccharine.

Write a 2-sentence motivational note for a user who ${context}.
- Acknowledge where they are honestly
- End with a forward-looking push toward this week
- Avoid generic platitudes like "you've got this!" or "keep it up!"
- Write in second person ("you"), punchy, nation-themed where natural
- Max 50 words total

Respond with only the text, no quotes or preamble.`;

  try {
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
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ac.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return null;
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get all users who have at least one task
    const { data: activeUserIds, error: userIdError } = await supabaseAdmin
      .from('tasks')
      .select('user_id')
      .limit(1000);

    if (userIdError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const uniqueUserIds = [...new Set(activeUserIds.map(r => r.user_id))];
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active users' });
    }

    // Two shared pep talk variants to avoid N+1 Anthropic calls (trade-off: less personalised,
    // but prevents cron timeout at scale — each per-user call would cost up to 30s)
    const [pepTalkActive, pepTalkInactive] = await Promise.all([
      generatePepTalk(3, 0, 5),  // representative active user — completed tasks this week
      generatePepTalk(0, 2, 0),  // representative inactive user — nothing completed
    ]);

    // Batch all 3 DB queries across all users upfront to avoid N+1 sequential calls
    const [
      { data: allCompletedTasks },
      { data: allInProgressTasks },
      { data: allStreaks },
      userResults,
    ] = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('user_id, title')
        .in('user_id', uniqueUserIds)
        .eq('status', 'completed')
        .gte('completed_at', sevenDaysAgo),
      supabaseAdmin
        .from('tasks')
        .select('user_id, title, created_at')
        .in('user_id', uniqueUserIds)
        .eq('status', 'in_progress'),
      supabaseAdmin
        .from('streaks')
        .select('user_id, current_streak')
        .in('user_id', uniqueUserIds),
      Promise.all(uniqueUserIds.map(id => supabaseAdmin.auth.admin.getUserById(id))),
    ]);

    // Build lookup maps keyed by user_id
    const completedByUser = {};
    for (const row of (allCompletedTasks || [])) {
      (completedByUser[row.user_id] ||= []).push(row.title);
    }

    const inProgressByUser = {};
    for (const row of (allInProgressTasks || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
      const arr = (inProgressByUser[row.user_id] ||= []);
      if (arr.length < 5) arr.push(row.title);
    }

    const streakByUser = {};
    for (const row of (allStreaks || [])) {
      streakByUser[row.user_id] = row.current_streak;
    }

    const userById = {};
    for (const result of userResults) {
      const u = result.data?.user;
      if (u?.id) userById[u.id] = u;
    }

    let sent = 0;
    let errors = 0;

    for (const userId of uniqueUserIds) {
      try {
        const user = userById[userId];
        if (!user?.email) continue;

        const completedTitles = completedByUser[userId] || [];
        const inProgressTitles = inProgressByUser[userId] || [];
        const completedThisWeek = completedTitles.length;
        const currentStreak = streakByUser[userId] || 0;

        const pepTalk = completedThisWeek > 0 ? pepTalkActive : pepTalkInactive;

        const { subject, html } = buildWeeklyReportEmail({
          completedThisWeek,
          completedTitles,
          currentStreak,
          inProgressTasks: inProgressTitles,
          pepTalk,
        });

        await resend.emails.send({
          from: 'ProcrastiNation <report@procrasti-nation.work>',
          to: user.email,
          subject,
          html,
        });

        sent++;
      } catch (userErr) {
        console.error(`[weekly-report] Error processing user ${userId}:`, userErr);
        errors++;
      }
    }

    console.log(`[weekly-report] Sent ${sent} reports to ${uniqueUserIds.length} users, ${errors} errors`);
    return NextResponse.json({ sent, errors, totalUsers: uniqueUserIds.length });

  } catch (err) {
    console.error('[weekly-report] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
