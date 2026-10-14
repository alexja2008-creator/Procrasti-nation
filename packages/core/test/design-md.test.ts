import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { motion, palettes, radii, space, type, type FontRole } from '../src/tokens.ts';

// DESIGN.md (repo root) restates the tokens for design tools and agents; tokens.ts stays the source
// of truth, and these tests fail when the two drift apart.

type Tree = { [key: string]: string | Tree };

const md = readFileSync(new URL('../../../DESIGN.md', import.meta.url), 'utf8');

/** The front matter's YAML, which only uses `key: value` lines nested by indentation. */
function frontMatter(text: string): Tree {
  const root: Tree = {};
  const open: { indent: number; node: Tree }[] = [{ indent: -1, node: root }];
  for (const line of text.split(/^---$/m)[1].split('\n')) {
    const match = /^( *)([\w-]+):\s*(.*)$/.exec(line);
    if (!match || line.trim().startsWith('#')) continue;
    const [, pad, key, value] = match;
    while (open[open.length - 1].indent >= pad.length) open.pop();
    const parent = open[open.length - 1].node;
    if (value) parent[key] = value.replace(/^"(.*)"$/, '$1');
    else open.push({ indent: pad.length, node: (parent[key] = {}) });
  }
  return root;
}

const design = frontMatter(md);
const section = (name: string) => design[name] as Tree;
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const px = (n: number) => `${n}px`;

function flatten(tokens: object, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    const name = prefix + kebab(key);
    if (typeof value === 'string') out[name] = value;
    else Object.assign(out, flatten(value, `${name}-`));
  }
  return out;
}

test('its colors are the night palette, and the day palette as day-*', () => {
  assert.deepEqual(section('colors'), { ...flatten(palettes.night), ...flatten(palettes.light, 'day-') });
});

test('its type scale is the type roles', () => {
  const faces: Partial<Record<FontRole, [string, string]>> = {
    display: ['Fraunces', '500'],
    body: ['Instrument Sans', '400'],
    bodyMedium: ['Instrument Sans', '500'],
    bodySemibold: ['Instrument Sans', '600'],
    mono: ['IBM Plex Mono', '400'],
    monoMedium: ['IBM Plex Mono', '500'],
  };
  const expected: Tree = {};
  for (const [role, style] of Object.entries(type)) {
    const t = style as { font: FontRole; size: number; lineHeight?: number; letterSpacing?: number };
    const face = faces[t.font];
    assert.ok(face, `add ${t.font} to the faces here`);
    expected[kebab(role)] = {
      fontFamily: face[0],
      fontSize: px(t.size),
      fontWeight: face[1],
      ...(t.lineHeight !== undefined && { lineHeight: px(t.lineHeight) }),
      ...(t.letterSpacing !== undefined && { letterSpacing: px(t.letterSpacing) }),
    };
  }
  assert.deepEqual(section('typography'), expected);
});

test('its radii and spacing are the tokens', () => {
  const inPx = (tokens: Record<string, number>) => Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, px(v)]));
  assert.deepEqual(section('rounded'), inPx(radii));
  assert.deepEqual(section('spacing'), inPx(space));
});

test("its components only point at tokens it defines", () => {
  for (const [name, props] of Object.entries(section('components'))) {
    for (const [prop, value] of Object.entries(props as Tree)) {
      const ref = /^\{(\w+)\.([\w-]+)\}$/.exec(value as string);
      if (ref) assert.ok(section(ref[1])?.[ref[2]] !== undefined, `${name}.${prop}: ${value}`);
    }
  }
});

test('its motion table has the motion tokens', () => {
  for (const [name, ms] of Object.entries(motion)) assert.match(md, new RegExp(`\\| \`motion\\.${name}\` \\| ${ms} \\|`));
});
