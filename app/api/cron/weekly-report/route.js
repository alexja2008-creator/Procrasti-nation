import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildWeeklyReportEmail } from '../../../../lib/emails';
import { callClaude, MODELS } from '../../../../lib/ai';
import { unsubscribeUrl, unsubscribeHeaders } from '../../../../lib/unsubscribe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export const maxDuration = 60;

async function generatePepTalk(completedCount, inProgressCount, streak) {
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
    return await callClaude({
      model: MODELS.fast,
      maxTokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }) || null;
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

    // Respect opt-outs. If the preference column doesn't exist yet, treat everyone as opted in.
    const optedOut = new Set();
    const { data: prefs, error: prefsError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email_reports_enabled')
      .in('user_id', uniqueUserIds);
    if (prefsError) {
      console.error('[weekly-report] Could not read email preferences:', prefsError.message);
    } else {
      for (const p of prefs || []) {
        if (p.email_reports_enabled === false) optedOut.add(p.user_id);
      }
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
        if (!user?.email || optedOut.has(userId)) continue;

        const completedTitles = completedByUser[userId] || [];
        const inProgressTitles = inProgressByUser[userId] || [];
        const completedThisWeek = completedTitles.length;
        const currentStreak = streakByUser[userId] || 0;

        const pepTalk = completedThisWeek > 0 ? pepTalkActive : pepTalkInactive;
        const unsubUrl = unsubscribeUrl(userId, 'reports');

        const { subject, html } = buildWeeklyReportEmail({
          completedThisWeek,
          completedTitles,
          currentStreak,
          inProgressTasks: inProgressTitles,
          pepTalk,
          unsubscribeUrl: unsubUrl,
        });

        await resend.emails.send({
          from: 'ProcrastiNation <report@procrasti-nation.work>',
          to: user.email,
          subject,
          html,
          headers: unsubscribeHeaders(unsubUrl),
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
