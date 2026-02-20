import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildWeeklyReportEmail } from '../../../../lib/emails';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
    });

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
      return NextResponse.json({ error: userIdError.message }, { status: 500 });
    }

    const uniqueUserIds = [...new Set(activeUserIds.map(r => r.user_id))];
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active users' });
    }

    let sent = 0;
    let errors = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Get user email
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userError || !user?.email) continue;

        // Tasks completed in the last 7 days
        const { data: completedTasks } = await supabaseAdmin
          .from('tasks')
          .select('title')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('completed_at', sevenDaysAgo);

        // In-progress tasks
        const { data: inProgressTasks } = await supabaseAdmin
          .from('tasks')
          .select('title')
          .eq('user_id', userId)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(5);

        // Current streak
        const { data: streakData } = await supabaseAdmin
          .from('streaks')
          .select('current_streak')
          .eq('user_id', userId)
          .single();

        const completedThisWeek = completedTasks?.length || 0;
        const currentStreak = streakData?.current_streak || 0;
        const completedTitles = (completedTasks || []).map(t => t.title);
        const inProgressTitles = (inProgressTasks || []).map(t => t.title);

        // Generate AI pep talk (best-effort — don't block if it fails)
        const pepTalk = await generatePepTalk(
          completedThisWeek,
          inProgressTitles.length,
          currentStreak
        );

        const { subject, html } = buildWeeklyReportEmail({
          completedThisWeek,
          completedTitles,
          currentStreak,
          inProgressTasks: inProgressTitles,
          pepTalk,
        });

        await resend.emails.send({
          from: 'ProcrastiNation <report@procrastination.nation>',
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
