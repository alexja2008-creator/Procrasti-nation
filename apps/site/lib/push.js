import crypto from 'crypto';
import webpush from 'web-push';
import { actions, atLocalTime, localDateString, voice } from './core.js';

// Web Push: sending reminders to browsers (app/api/cron/push sends what came
// due each minute), working out a person's times in their own timezone, and
// the signed token a notification's Snooze button carries
// (app/api/push/action).

/** A reminder that can't arrive within an hour of its time is dropped (a 6 PM nudge at 9 PM is noise). */
export const LATE_LIMIT_S = 60 * 60;
/** How long a notification's Snooze button keeps working. */
const SNOOZE_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;
/** Words longer than this are cut (notifications show far less, and a payload is at most 4 KB). */
const MAX_WORDS = 200;

let vapidReady = false;
function useVapid() {
  if (vapidReady) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are required for Web Push');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidReady = true;
}

/**
 * Sends one notification to one browser (a push_tokens row: `token` is the
 * endpoint). Resolves 'sent'; 'gone' when the browser unsubscribed or the push
 * service forgot it (delete the row); or 'failed'.
 */
export async function sendPush(browser, payload, ttlSeconds) {
  useVapid();
  try {
    await webpush.sendNotification({ endpoint: browser.token, keys: browser.keys }, JSON.stringify(payload), {
      TTL: Math.max(0, Math.floor(ttlSeconds)),
      urgency: 'high',
      timeout: 10_000,
    });
    return 'sent';
  } catch (err) {
    if (err?.statusCode === 404 || err?.statusCode === 410) return 'gone';
    console.error('[push] Send failed:', err?.statusCode ?? '', err?.body || err?.message);
    return 'failed';
  }
}

const cut = (text) => (text.length > MAX_WORDS ? `${text.slice(0, MAX_WORDS - 1)}…` : text);

/**
 * What the service worker (apps/app/public/sw.js) gets for a reminder: its
 * words, where a click goes, and the two buttons (Start 5 min, Snooze 10 min;
 * deliberately no Done, so dismissing can never finish a task). The morning
 * list has no buttons and opens Today.
 */
export function reminderPayload(userId, reminder, actionUrl) {
  const title = cut(reminder.title);
  const body = cut(reminder.body);
  const task = reminder.taskId;
  return {
    v: 1,
    id: reminder.id,
    at: reminder.at,
    title,
    body,
    path: task ? `/task/${task}` : '/',
    buttons: task
      ? [
          { action: 'start', title: actions.startFive, path: `/start/${task}?minutes=5` },
          {
            action: 'snooze',
            title: voice.reminders.snooze,
            url: actionUrl,
            token: snoozeToken({ userId, taskId: task, day: reminder.day, title, body }),
          },
        ]
      : [],
  };
}

/**
 * Runs `fn` with the process's local timezone switched to `timeZone`, so
 * core's date helpers (which use the device's zone on a phone) work out that
 * person's days and times. Synchronous on purpose: nothing else runs before
 * the old zone is back. Throws if the zone is unknown or the switch didn't
 * take (Node quietly falls back to UTC for a zone it doesn't know).
 */
export function withTimeZone(timeZone, fn) {
  const before = process.env.TZ;
  process.env.TZ = timeZone;
  try {
    checkZone(timeZone);
    const result = fn();
    if (typeof result?.then === 'function') throw new Error('withTimeZone runs synchronous work only');
    return result;
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
}

const pad = (n) => String(n).padStart(2, '0');

function checkZone(timeZone) {
  const probe = new Date();
  // en-CA formats as "2026-10-07, 14:05". Throws RangeError for an unknown zone.
  const there = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(probe);
  const here = `${probe.getFullYear()}-${pad(probe.getMonth() + 1)}-${pad(probe.getDate())}, ${pad(probe.getHours())}:${pad(probe.getMinutes())}`;
  if (there !== here) throw new Error(`Could not switch to time zone ${timeZone}`);
}

/** Whether the morning list's time falls after `since`, up to `now`. Call inside withTimeZone. */
export function morningInWindow(morning, since, now) {
  for (const day of new Set([localDateString(since), localDateString(now)])) {
    const at = Date.parse(atLocalTime(day, morning.hour, morning.minute));
    if (at > since.getTime() && at <= now.getTime()) return true;
  }
  return false;
}

// Snooze tokens: base64url JSON, a dot, then an HMAC of it under the
// CRON_SECRET with its own prefix (as the unsubscribe links are signed), so
// one can only snooze that one task for that one person, and only for 7 days.

function signature(body) {
  if (!process.env.CRON_SECRET) throw new Error('CRON_SECRET is required to sign snooze tokens');
  return crypto.createHmac('sha256', process.env.CRON_SECRET).update(`push-snooze:${body}`).digest('base64url');
}

export function snoozeToken({ userId, taskId, day, title, body }, now = Date.now()) {
  const json = JSON.stringify({ u: userId, t: taskId, d: day ?? null, ti: title, b: body, e: now + SNOOZE_TOKEN_MS });
  const encoded = Buffer.from(json).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}

/** The snooze a token stands for, or null if it's forged, malformed or expired. */
export function readSnoozeToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 4000 || !process.env.CRON_SECRET) return null;
  const [encoded, sig, extra] = token.split('.');
  if (!encoded || !sig || extra !== undefined) return null;
  const expected = Buffer.from(signature(encoded));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { u, t, d, ti, b, e } = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof e !== 'number' || e < now || typeof u !== 'string' || typeof t !== 'string' || typeof ti !== 'string' || typeof b !== 'string') {
      return null;
    }
    return { userId: u, taskId: t, day: typeof d === 'string' ? d : null, title: ti, body: b };
  } catch {
    return null;
  }
}
