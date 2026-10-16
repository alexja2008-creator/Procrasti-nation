import assert from 'node:assert/strict';
import { test } from 'node:test';

import { elapsedMs, formatClock, pauseClock, resumeClock, startClock } from '../src/start-mode.ts';

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
