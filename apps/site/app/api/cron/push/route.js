import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { morningListOf, remindersDue } from '../../../../lib/core';
import { LATE_LIMIT_S, morningInWindow, reminderPayload, sendPush, withTimeZone } from '../../../../lib/push';

// Web Push reminders. Supabase Cron calls this every minute
// (supabase/v2/03_push_cron.sql; scripts/push-cron-dev.sh in development).
// For each person with reminders on in a browser, it works out what came due
// since the last minute from their tasks as they are now, in their own
// timezone, with the same core code the iPhone schedules from, and sends it to
// each of their browsers. Every send is logged first (push_sends), so nothing
// rings twice even if runs overlap.

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** A missed run is caught up this far back; anything older is skipped. */
const LOOKBACK_MS = 10 * 60 * 1000;
/** The send log only has to outlast the look-back; it's pruned after this. */
const KEEP_SENDS_MS = 2 * 24 * 60 * 60 * 1000;
/** Sends in flight at once. */
const PARALLEL = 20;
/** Supabase returns at most 1,000 rows a request; `.in()` lists stay short enough for a URL. */
const PAGE = 1000;
const IDS_PER_QUERY = 100;

const TASK_COLUMNS =
  'id,user_id,list_id,parent_id,note_id,title,status,due_on,due_at,remind_at,rrule,estimate_minutes,' +
  'scheduled_on,sort_order,source,external_id,completed_at,created_at,updated_at,deleted_at';

// Rows → core's shapes (as apps/app/src/data does). Notes text isn't needed to plan.
const taskFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  listId: r.list_id,
  parentId: r.parent_id,
  noteId: r.note_id,
  title: r.title,
  notes: null,
  status: r.status === 'completed' ? 'completed' : 'in_progress',
  dueOn: r.due_on,
  dueAt: r.due_at,
  remindAt: r.remind_at,
  rrule: r.rrule,
  estimateMinutes: r.estimate_minutes,
  scheduledOn: r.scheduled_on,
  sortOrder: Number(r.sort_order),
  source: r.source,
  externalId: r.external_id,
  completedAt: r.completed_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

const listFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  kind: r.kind,
  ink: r.ink,
  sortOrder: Number(r.sort_order),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

const groupBy = (items, key) => {
  const groups = new Map();
  for (const item of items) groups.set(item[key], [...(groups.get(item[key]) ?? []), item]);
  return groups;
};

/** Every row a query matches, a page at a time (a cut-off list would fail silently). */
async function fetchAll(query) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

/** The same query for many people, a slice of ids at a time. */
async function forUsers(userIds, query) {
  const parts = await Promise.all(chunk(userIds, IDS_PER_QUERY).map((ids) => fetchAll(() => query(ids))));
  return parts.flat();
}

/** Open (live, unfinished) tasks; `timedOnly` keeps just the ones with a time, which is all a first look needs. */
const openTasks = (userIds, timedOnly) =>
  forUsers(userIds, (ids) => {
    let q = supabaseAdmin.from('tasks').select(TASK_COLUMNS).in('user_id', ids).is('deleted_at', null).is('completed_at', null);
    if (timedOnly) q = q.or('remind_at.not.is.null,due_at.not.is.null');
    return q.order('id');
  });

function authorized(request) {
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ''}`);
  return !!process.env.CRON_SECRET && given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function run(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_MS);
  // The Snooze button posts back to this same site (the request's own origin: production, or localhost in development).
  const actionUrl = new URL('/api/push/action', request.url).toString();
  const stats = { people: 0, due: 0, sent: 0, failed: 0, gone: 0 };

  try {
    const browsers = groupBy(
      await fetchAll(() => supabaseAdmin.from('push_tokens').select('user_id,token,keys').eq('platform', 'web').order('id')),
      'user_id',
    );
    const userIds = [...browsers.keys()];
    stats.people = userIds.length;

    // Snoozes that have come round (older ones are cleared below without ringing).
    const { data: snoozeRows, error: snoozeError } = await supabaseAdmin
      .from('push_snoozes')
      .select('id,user_id,task_id,ring_at,day,title,body')
      .lte('ring_at', now.toISOString());
    if (snoozeError) throw new Error(snoozeError.message);
    const snoozes = groupBy(snoozeRows, 'user_id');

    if (userIds.length > 0) {
      const settings = new Map(
        (
          await forUsers(userIds, (ids) =>
            supabaseAdmin.from('user_settings').select('user_id,timezone,day_rollover_hour,preferences').in('user_id', ids).order('user_id'),
          )
        ).map((s) => [s.user_id, s]),
      );

      // First look: only tasks with a time, to find who has anything due this minute.
      const timed = groupBy((await openTasks(userIds, true)).map(taskFromRow), 'userId');
      const due = userIds.filter((id) => {
        const s = settings.get(id);
        if (!s?.timezone) return false;
        if (snoozes.has(id)) return true;
        try {
          return withTimeZone(s.timezone, () => {
            const morning = morningListOf(s.preferences);
            return remindersDue(timed.get(id) ?? [], since, now).length > 0 || (morning.on && morningInWindow(morning, since, now));
          });
        } catch (err) {
          console.error('[push] Skipping a person:', err.message);
          return false;
        }
      });

      // Then everything they have on, for the words ("step 2 of 10", the territory, the morning list's count).
      if (due.length > 0) {
        const [tasks, lists] = await Promise.all([
          openTasks(due, false),
          forUsers(due, (ids) =>
            supabaseAdmin
              .from('lists')
              .select('id,user_id,name,kind,ink,sort_order,created_at,updated_at,deleted_at')
              .in('user_id', ids)
              .is('deleted_at', null)
              .order('id'),
          ),
        ]);
        const tasksOf = groupBy(tasks.map(taskFromRow), 'userId');
        const listsOf = groupBy(lists.map(listFromRow), 'userId');

        const outgoing = due.flatMap((userId) => {
          const s = settings.get(userId);
          const theirs = tasksOf.get(userId) ?? [];
          const byId = new Map(theirs.map((t) => [t.id, t]));
          let reminders = [];
          try {
            reminders = withTimeZone(s.timezone, () =>
              remindersDue(theirs, since, now, {
                lists: listsOf.get(userId) ?? [],
                morning: morningListOf(s.preferences),
                rolloverHour: s.day_rollover_hour ?? 0,
              }),
            );
          } catch (err) {
            console.error('[push] Skipping a person:', err.message);
          }
          // Only times still ahead when the task was made (as on the iPhone): "call mom 6pm" typed at 6:03 doesn't ring.
          // created_at, not updated_at: other writers (v1's nudge cron) touch updated_at at any minute.
          reminders = reminders.filter((r) => !r.taskId || Date.parse(byId.get(r.taskId)?.createdAt ?? 0) < r.at);
          // A snooze rings with the words it was snoozed with, while its task is still open.
          for (const z of snoozes.get(userId) ?? []) {
            const at = Date.parse(z.ring_at);
            if (at > since.getTime() && byId.has(z.task_id)) {
              reminders.push({ id: `snooze:${z.task_id}:${at}`, kind: 'snooze', taskId: z.task_id, at, day: z.day, title: z.title, body: z.body });
            }
          }
          return reminders.map((reminder) => ({ userId, reminder }));
        });

        stats.due = outgoing.length;
        await deliver(outgoing, browsers, actionUrl, now, stats);
      }
    }

    // Housekeeping: snoozes that have rung (or were too late to), and an old send log.
    if (snoozeRows.length > 0) {
      const { error } = await supabaseAdmin.from('push_snoozes').delete().in('id', snoozeRows.map((z) => z.id));
      if (error) console.error('[push] Could not clear snoozes:', error.message);
    }
    const { error: pruneError } = await supabaseAdmin
      .from('push_sends')
      .delete()
      .lt('sent_at', new Date(now.getTime() - KEEP_SENDS_MS).toISOString());
    if (pruneError) console.error('[push] Could not prune the send log:', pruneError.message);

    return NextResponse.json(stats);
  } catch (err) {
    console.error('[push] Run failed:', err.message);
    return NextResponse.json({ error: 'Run failed', ...stats }, { status: 500 });
  }
}

/** Claims each reminder in the send log, then sends the claimed ones to each of the person's browsers. */
async function deliver(outgoing, browsers, actionUrl, now, stats) {
  const claimed = new Set();
  for (const part of chunk(outgoing, 500)) {
    const { data, error } = await supabaseAdmin
      .from('push_sends')
      .upsert(
        part.map(({ userId, reminder }) => ({ user_id: userId, reminder_id: reminder.id })),
        { onConflict: 'user_id,reminder_id', ignoreDuplicates: true },
      )
      .select('user_id,reminder_id');
    if (error) throw new Error(error.message);
    for (const row of data) claimed.add(`${row.user_id} ${row.reminder_id}`);
  }

  const jobs = outgoing
    .filter(({ userId, reminder }) => claimed.has(`${userId} ${reminder.id}`))
    .flatMap(({ userId, reminder }) => {
      const payload = reminderPayload(userId, reminder, actionUrl);
      // The push service holds it while the computer sleeps, until an hour after its time.
      const ttl = LATE_LIMIT_S - (now.getTime() - reminder.at) / 1000;
      return (browsers.get(userId) ?? []).map((browser) => ({ userId, reminder, browser, payload, ttl }));
    });

  const results = [];
  for (const batch of chunk(jobs, PARALLEL)) {
    results.push(...(await Promise.all(batch.map(async (job) => ({ ...job, result: await sendPush(job.browser, job.payload, job.ttl) })))));
  }

  const gone = [];
  const reached = new Set();
  for (const { userId, reminder, browser, result } of results) {
    stats[result] += 1;
    if (result === 'gone') gone.push(browser.token);
    if (result !== 'failed') reached.add(`${userId} ${reminder.id}`);
  }
  if (gone.length > 0) {
    const { error } = await supabaseAdmin.from('push_tokens').delete().eq('platform', 'web').in('token', gone);
    if (error) console.error('[push] Could not remove gone browsers:', error.message);
  }
  // Reached no browser at all (the push service failed every time): unclaim, so the next run tries again.
  const retry = new Map(results.filter((r) => !reached.has(`${r.userId} ${r.reminder.id}`)).map((r) => [`${r.userId} ${r.reminder.id}`, r]));
  for (const { userId, reminder } of retry.values()) {
    const { error } = await supabaseAdmin.from('push_sends').delete().eq('user_id', userId).eq('reminder_id', reminder.id);
    if (error) console.error('[push] Could not unclaim a reminder:', error.message);
  }
}

export const GET = run;
export const POST = run;
