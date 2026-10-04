import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatStampDate } from '../src/dates.ts';
import {
  defaultStartMinutes,
  elapsedMs,
  formatClock,
  leftOutcome,
  pauseClock,
  resumeClock,
  startClock,
} from '../src/start-mode.ts';

test('the default timer follows what stops you, unless you chose one', () => {
  assert.equal(defaultStartMinutes(undefined), 5);
  assert.equal(defaultStartMinutes({}), 5);
  assert.equal(defaultStartMinutes({ style: 'avoid' }), 5);
  assert.equal(defaultStartMinutes({ style: 'overwhelmed' }), 2);
  assert.equal(defaultStartMinutes({ style: 'perfectionist' }), 10);
  assert.equal(defaultStartMinutes({ style: 'bored' }), 25);
  assert.equal(defaultStartMinutes({ style: 'bored', startMinutes: 5 }), 5);
});

test('the clock is wall time minus pauses', () => {
  let clock = startClock(1_000);
  assert.equal(elapsedMs(clock, 61_000), 60_000);
  clock = pauseClock(clock, 61_000);
  assert.equal(elapsedMs(clock, 200_000), 60_000, 'frozen while paused');
  assert.equal(pauseClock(clock, 90_000), clock, 'pausing twice changes nothing');
  clock = resumeClock(clock, 121_000);
  assert.equal(elapsedMs(clock, 131_000), 70_000, 'the minute paused does not count');
  assert.equal(resumeClock(clock, 140_000), clock, 'resuming a running clock changes nothing');
  assert.equal(elapsedMs(startClock(5_000), 1_000), 0, 'never negative if the device clock jumps back');
});

test('clock labels', () => {
  assert.equal(formatClock(192_000), '3:12');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(299_001, 'up'), '5:00', 'a countdown shows 5:00 until a full second has passed');
  assert.equal(formatClock(299_999), '4:59');
  assert.equal(formatClock(3_723_000), '1:02:03');
});

test('leaving early is "stopped"; leaving after the timer is "kept going"', () => {
  assert.equal(leftOutcome(4 * 60_000, 5), 'stopped');
  assert.equal(leftOutcome(5 * 60_000, 5), 'kept-going');
});

test('stamp dates read like a passport', () => {
  assert.equal(formatStampDate(new Date(2026, 8, 4, 23, 30)), '04 SEP · 2026');
});
