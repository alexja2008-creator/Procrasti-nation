import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildNudgeEmail } from '../../../../lib/emails';

// Use service role key so we can query all users' tasks (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request) {
  // Verify this is called by Vercel Cron (or us in testing)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Find all in-progress tasks that:
    // 1. Have not been updated in 24+ hours
    // 2. Haven't had a nudge sent in the last 24 hours (or never nudged)
    const { data: staleTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('id, user_id, title, steps, completed_steps, total_steps, last_nudge_sent')
      .eq('status', 'in_progress')
      .lt('updated_at', twentyFourHoursAgo)
      .or(`last_nudge_sent.is.null,last_nudge_sent.lt.${twentyFourHoursAgo}`);

    if (error) {
      console.error('[nudge] DB query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!staleTasks || staleTasks.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No stale tasks found' });
    }

    // Get unique user IDs
    const userIds = [...new Set(staleTasks.map(t => t.user_id))];

    // Fetch user emails from auth.users via admin API
    const userEmailMap = {};
    for (const userId of userIds) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userError && user?.email) {
        userEmailMap[userId] = user.email;
      }
    }

    let sent = 0;
    let errors = 0;

    for (const task of staleTasks) {
      const email = userEmailMap[task.user_id];
      if (!email) continue;

      // Calculate remaining steps
      const steps = task.steps || [];
      const stepsRemaining = steps.filter(s => !s.completed).length;
      if (stepsRemaining === 0) continue; // All steps done, skip

      const { subject, html } = buildNudgeEmail({
        taskTitle: task.title,
        stepsRemaining,
        taskId: task.id,
        userEmail: email,
      });

      try {
        await resend.emails.send({
          from: 'ProcrastiNation <nudge@procrastination.nation>',
          to: email,
          subject,
          html,
        });

        // Update last_nudge_sent so we don't spam
        await supabaseAdmin
          .from('tasks')
          .update({ last_nudge_sent: now.toISOString() })
          .eq('id', task.id);

        sent++;
      } catch (sendError) {
        console.error(`[nudge] Failed to send to ${email}:`, sendError);
        errors++;
      }
    }

    console.log(`[nudge] Sent ${sent} nudges, ${errors} errors, from ${staleTasks.length} stale tasks`);
    return NextResponse.json({ sent, errors, total: staleTasks.length });

  } catch (err) {
    console.error('[nudge] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
