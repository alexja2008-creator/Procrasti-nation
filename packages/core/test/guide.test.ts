import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guide, type GuideFor } from '../src/nation.ts';

const PLACES: GuideFor[] = [
  { web: false, mac: false },
  { web: true, mac: true },
  { web: true, mac: false },
];

/** Every word the guide shows on one platform. */
function allText(p: GuideFor): string[] {
  const sections = guide.sections(p);
  return [
    guide.open,
    guide.title,
    guide.lead,
    guide.wordsLabel,
    ...guide.words.flatMap((w) => [w.term, w.meaning]),
    ...sections.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (typeof b === 'string' ? [b] : b.flatMap((e) => [e.typed, e.means])))]),
  ];
}

test('the guide never sounds like a scolding', () => {
  for (const p of PLACES) {
    for (const line of allText(p)) {
      assert.doesNotMatch(line, /overdue|\blate\b|fail|lazy|behind|disappoint|should have/i, line);
    }
  }
});

test('the AI button is always "Plan it"', () => {
  for (const p of PLACES) {
    for (const line of allText(p)) {
      for (const m of line.matchAll(/plan it/gi)) assert.equal(m[0], 'Plan it', line);
    }
  }
});
