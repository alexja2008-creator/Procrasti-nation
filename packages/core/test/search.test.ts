import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasSearchWords, parseSearch, splitHighlights } from '../src/search.ts';

const LISTS = [
  { id: 'chem', name: 'Chem 201', sortOrder: 1, deletedAt: null },
  { id: 'work', name: 'Work', sortOrder: 2, deletedAt: null },
  { id: 'gone', name: 'Geology', sortOrder: 3, deletedAt: '2026-10-01T00:00:00Z' },
];

test('a #tag naming a territory narrows the search; other #words are words', () => {
  assert.deepEqual(parseSearch('#chem lab', LISTS), { words: 'lab', listId: 'chem', tag: '#chem' });
  assert.deepEqual(parseSearch('lab  #chem201 report', LISTS), { words: 'lab report', listId: 'chem', tag: '#chem201' });
  assert.deepEqual(parseSearch('#chem', LISTS), { words: '', listId: 'chem', tag: '#chem' });
  assert.deepEqual(parseSearch('#history essay', LISTS), { words: 'history essay', listId: null, tag: null }, 'unknown: searched as a word');
  assert.deepEqual(parseSearch('#chem #work notes', LISTS), { words: 'work notes', listId: 'chem', tag: '#chem' }, 'the first match wins');
  assert.deepEqual(parseSearch('#geo rocks', LISTS), { words: 'geo rocks', listId: null, tag: null }, 'not a deleted territory');
  assert.deepEqual(parseSearch('C# notes', LISTS), { words: 'C# notes', listId: null, tag: null }, 'a # inside a word is just text');
});

test('only letters or digits make something to search', () => {
  assert.equal(hasSearchWords('lab'), true);
  assert.equal(hasSearchWords('  4 '), true);
  assert.equal(hasSearchWords('é'), true);
  assert.equal(hasSearchWords(' .,!? '), false);
  assert.equal(hasSearchWords(''), false);
});

test('snippets split at their highlights', () => {
  assert.deepEqual(splitHighlights('the «Krebs» «cycle» is on it'), [
    { text: 'the ', hit: false },
    { text: 'Krebs', hit: true },
    { text: ' ', hit: false },
    { text: 'cycle', hit: true },
    { text: ' is on it', hit: false },
  ]);
  assert.deepEqual(splitHighlights('no match shown'), [{ text: 'no match shown', hit: false }]);
  assert.deepEqual(splitHighlights('«lab»'), [{ text: 'lab', hit: true }]);
});
