import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_APPEARANCE, isAppearanceChoice, schemeFor } from '../src/tokens.ts';

test('night is the default, whatever the device', () => {
  assert.equal(DEFAULT_APPEARANCE, 'night');
  assert.equal(schemeFor('night', 'light'), 'night');
  assert.equal(schemeFor('night', 'dark'), 'night');
});

test('day stays day on a dark device', () => {
  assert.equal(schemeFor('day', 'dark'), 'light');
});

test('match my device follows it, and light when it says nothing', () => {
  assert.equal(schemeFor('system', 'dark'), 'night');
  assert.equal(schemeFor('system', 'light'), 'light');
  assert.equal(schemeFor('system', null), 'light');
  assert.equal(schemeFor('system', 'unspecified'), 'light');
});

test('only the three choices are read back from storage', () => {
  for (const ok of ['night', 'day', 'system']) assert.ok(isAppearanceChoice(ok));
  for (const bad of [null, undefined, '', 'dark', 'light', 'Night', 1]) assert.ok(!isAppearanceChoice(bad));
});
