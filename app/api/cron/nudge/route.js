import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildDailyDigestEmail, buildCommitmentNudgeEmail } from '../../../../lib/emails';

// Use service role key so we can query all users' tasks (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Pick the task the user should tackle first: due-soon tasks first, then fewest remaining steps
function pickSpotlightTask(tasks) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const eligible = tasks.filter(t => {
    const steps = t.steps || [];
    return steps.some(s => !s.completed);
  });
  if (eligible.length === 0) return null;

  const scored = eligible.map(t => {
    const steps = t.steps || [];
    const nextStep = steps.find(s => !s.completed);
    const remaining = steps.filter(s => !s.completed).length;
    let score = 0;
    let isDueSoon = false;
    if (t.due_date) {
      const due = new Date(t.due_date);
      if (due <= threeDaysFromNow) { score += 100; isDueSoon = true; }
    }
    // Fewer remaining = closer to done = more motivating
    score += Math.max(0, 20 - remaining);
    return { ...t, score, isDueSoon, nextStep, remaining };
  });

  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0];

  return {
    id: pick.id,
    title: pick.title,
    nextStepText: pick.nextStep?.title || pick.nextStep?.text || 'Continue this task',
    isDueSoon: pick.isDueSoon,
  };
}

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
    // 1. Were created 24+ hours ago (created_at is immutable — not affected by the updated_at trigger)
    // 2. Haven't had a nudge sent in the last 24 hours (or never nudged)
    const { data: staleTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('id, user_id, title, steps, completed_steps, total_steps, due_date, last_nudge_sent')
      .eq('status', 'in_progress')
      .lt('created_at', twentyFourHoursAgo)
      .or(`last_nudge_sent.is.null,last_nudge_sent.lt.${twentyFourHoursAgo}`);

    if (error) {
      console.error('[nudge] DB query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!staleTasks || staleTasks.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No stale tasks found' });
    }

    // Group tasks by user_id
    const tasksByUser = {};
    for (const task of staleTasks) {
      if (!tasksByUser[task.user_id]) tasksByUser[task.user_id] = [];
      tasksByUser[task.user_id].push(task);
    }

    const userIds = Object.keys(tasksByUser);

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

    for (const userId of userIds) {
      const email = userEmailMap[userId];
      if (!email) continue;

      const userTasks = tasksByUser[userId];

      // Only include tasks that still have incomplete steps
      const activeTasks = userTasks.filter(t => {
        const steps = t.steps || [];
        return steps.some(s => !s.completed);
      });
      if (activeTasks.length === 0) continue;

      const taskSummaries = activeTasks.map(t => ({
        id: t.id,
        title: t.title,
        completedSteps: t.completed_steps || 0,
        totalSteps: t.total_steps || (t.steps || []).length || 1,
        steps: t.steps || [],
        due_date: t.due_date,
      }));

      const spotlightTask = pickSpotlightTask(activeTasks);

      const { subject, html } = buildDailyDigestEmail({ tasks: taskSummaries, spotlightTask });

      try {
        await resend.emails.send({
          from: 'ProcrastiNation <nudge@procrasti-nation.work>',
          to: email,
          subject,
          html,
        });

        // Update last_nudge_sent on all this user's stale tasks
        const taskIds = userTasks.map(t => t.id);
        await supabaseAdmin
          .from('tasks')
          .update({ last_nudge_sent: now.toISOString() })
          .in('id', taskIds);

        sent++;
      } catch (sendError) {
        console.error(`[nudge] Failed to send digest to ${email}:`, sendError);
        errors++;
      }
    }

    // ── Commitment nudges ──
    // Find tasks where start_commitment has passed + 1 hour and no steps completed
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: missedCommitments } = await supabaseAdmin
      .from('tasks')
      .select('id, user_id, title, completed_steps, start_commitment, last_nudge_sent')
      .eq('status', 'in_progress')
      .not('start_commitment', 'is', null)
      .lt('start_commitment', oneHourAgo)
      .eq('completed_steps', 0)
      .or(`last_nudge_sent.is.null,last_nudge_sent.lt.${twentyFourHoursAgo}`);

    let commitmentSent = 0;
    if (missedCommitments && missedCommitments.length > 0) {
      for (const task of missedCommitments) {
        const email = userEmailMap[task.user_id];
        if (!email) {
          // Fetch email if not already in the map
          const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(task.user_id);
          if (u?.email) userEmailMap[task.user_id] = u.email;
          else continue;
        }
        const toEmail = userEmailMap[task.user_id];

        const commitTime = new Date(task.start_commitment).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });

        const { subject, html } = buildCommitmentNudgeEmail({
          taskTitle: task.title,
          commitmentTime: commitTime,
          taskId: task.id,
          userEmail: toEmail,
        });

        try {
          await resend.emails.send({
            from: 'ProcrastiNation <nudge@procrasti-nation.work>',
            to: toEmail,
            subject,
            html,
          });
          await supabaseAdmin.from('tasks').update({ last_nudge_sent: now.toISOString() }).eq('id', task.id);
          commitmentSent++;
        } catch (sendError) {
          console.error(`[nudge] Commitment nudge failed for ${toEmail}:`, sendError);
          errors++;
        }
      }
    }

    console.log(`[nudge] Sent ${sent} digest emails + ${commitmentSent} commitment nudges, ${errors} errors`);
    return NextResponse.json({ sent, commitmentSent, errors, usersWithStaleTasks: userIds.length });

  } catch (err) {
    console.error('[nudge] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
