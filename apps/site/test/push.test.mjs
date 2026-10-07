// Web Push helpers (lib/push.js): Snooze tokens, the per-person timezone
// switch, and what a notification carries. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.CRON_SECRET = 'test-secret';
const { morningInWindow, readSnoozeToken, reminderPayload, snoozeToken, withTimeZone } = await import('../lib/push.js');

const snooze = { userId: 'u1', taskId: 't1', day: '2026-10-07', title: 'Walk Biscuit', body: 'Every day · Home' };

test('a snooze token reads back, and only untouched and in date', () => {
  const now = Date.parse('2026-10-07T18:00:00Z');
  const token = snoozeToken(snooze, now);
  assert.deepEqual(readSnoozeToken(token, now), snooze);
  assert.equal(readSnoozeToken(token, now + 8 * 86_400_000), null, 'expired after 7 days');

  const [body, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), t: 'someone-elses-task' })).toString('base64url');
  assert.equal(readSnoozeToken(`${forged}.${sig}`, now), null, 'another task under the same signature');
  assert.equal(readSnoozeToken(`${body}.${sig.slice(0, -2)}xx`, now), null, 'a changed signature');
  assert.equal(readSnoozeToken(`${body}.${sig}.extra`, now), null);
  assert.equal(readSnoozeToken(undefined, now), null);
  assert.equal(readSnoozeToken('not-a-token', now), null);

  process.env.CRON_SECRET = 'another-secret';
  assert.equal(readSnoozeToken(token, now), null, 'signed with another secret');
  process.env.CRON_SECRET = 'test-secret';
});

test('times are worked out in the zone asked for, and the old zone comes back', () => {
  const before = process.env.TZ;
  const instant = new Date('2026-10-07T22:00:00Z');
  assert.equal(withTimeZone('Asia/Tokyo', () => instant.getHours()), 7);
  assert.equal(withTimeZone('America/Los_Angeles', () => instant.getHours()), 15);
  assert.equal(process.env.TZ, before);
  assert.throws(() => withTimeZone('Not/AZone', () => 1), RangeError, 'an unknown zone is refused, not treated as UTC');
  assert.equal(process.env.TZ, before);
  assert.throws(() => withTimeZone('UTC', async () => 1), /synchronous/);
});

test('the morning list is due only inside the window, in their zone', () => {
  const morning = { on: true, hour: 8, minute: 0 };
  // 8:00 AM in New York is 12:00 UTC in October.
  const due = (since, now) => withTimeZone('America/New_York', () => morningInWindow(morning, new Date(since), new Date(now)));
  assert.equal(due('2026-10-07T11:55:00Z', '2026-10-07T12:00:00Z'), true);
  assert.equal(due('2026-10-07T12:00:00Z', '2026-10-07T12:05:00Z'), false);
  assert.equal(due('2026-10-07T07:55:00Z', '2026-10-07T08:00:00Z'), false, '8:00 UTC is 4 AM there');
});

test('a reminder carries Start 5 min and Snooze 10 min, never Done; the morning list carries none', () => {
  const reminder = { id: 'task:t1:1', kind: 'task', taskId: 't1', at: 1, day: '2026-10-07', title: 'Walk Biscuit', body: 'Every day · Home' };
  const payload = reminderPayload('u1', reminder, 'https://procrasti-nation.work/api/push/action');
  assert.equal(payload.path, '/task/t1');
  assert.deepEqual(payload.buttons.map((b) => [b.action, b.title]), [['start', 'Start 5 min'], ['snooze', 'Snooze 10 min']]);
  assert.equal(payload.buttons[0].path, '/start/t1?minutes=5');
  assert.deepEqual(readSnoozeToken(payload.buttons[1].token), { userId: 'u1', taskId: 't1', day: '2026-10-07', title: 'Walk Biscuit', body: 'Every day · Home' });

  const long = reminderPayload('u1', { ...reminder, title: 'x'.repeat(1000) }, 'https://x.test');
  assert.equal(long.title.length, 200, 'long titles are cut to fit a push');
  assert.ok(JSON.stringify(long).length < 3000);

  const morningList = reminderPayload('u1', { id: 'morning:2026-10-07', kind: 'morning', taskId: null, at: 1, day: '2026-10-07', title: 'Three things today', body: 'Start with “Read”.' }, 'https://x.test');
  assert.deepEqual([morningList.path, morningList.buttons], ['/', []]);
});
