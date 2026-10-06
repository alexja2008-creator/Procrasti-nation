// Search as typed: the words to look for, and the territory a "#tag" names
// (matched as quick add does). The matching itself runs in the database
// (`search_items`); this decides what to ask for and how to show it.

import { matchTerritory } from './territories.ts';
import type { List } from './types.ts';

/** Results come this many at a time per group (Show more). */
export const SEARCH_PAGE = 25;

export interface ParsedSearch {
  /** What to look for: the text with the territory's #tag taken out. */
  words: string;
  /** The territory the first matching #tag names, if any. */
  listId: string | null;
  /** That #tag as typed ("#chem"), so it can be taken out again. */
  tag: string | null;
}

/**
 * Reads a search: the first #tag naming a territory narrows to it ("#chem
 * lab" → "lab" in Chem 201); any other #word is searched as a word.
 */
export function parseSearch(text: string, lists: Pick<List, 'id' | 'name' | 'sortOrder' | 'deletedAt'>[]): ParsedSearch {
  const live = lists.filter((l) => !l.deletedAt);
  let listId: string | null = null;
  let tag: string | null = null;
  const words = text.replace(/(^|\s)#([^\s#]+)/g, (_, space: string, word: string) => {
    const found = listId === null ? matchTerritory(word, live) : null;
    if (!found) return `${space}${word}`;
    listId = found.id;
    tag = `#${word}`;
    return space;
  });
  return { words: words.replace(/\s+/g, ' ').trim(), listId, tag };
}

/** Whether there's anything to search for (not just spaces and punctuation). */
export const hasSearchWords = (words: string) => /[^\s!-/:-@[-`{-~]/.test(words);

/** A snippet split at its «highlights», to show where it matched. */
export function splitHighlights(snippet: string): { text: string; hit: boolean }[] {
  const parts: { text: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of snippet.matchAll(/«([^»]*)»/g)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: snippet.slice(last, at), hit: false });
    if (m[1]) parts.push({ text: m[1], hit: true });
    last = at + m[0].length;
  }
  if (last < snippet.length) parts.push({ text: snippet.slice(last), hit: false });
  return parts;
}
