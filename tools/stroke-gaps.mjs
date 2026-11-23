#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessons = JSON.parse(await readFile(path.join(ROOT, 'data', 'lessons.json'), 'utf8'));
const characters = [...new Set(lessons.flatMap((lesson) => [...lesson.traditionalText.value]))];
const missing = [];
for (const character of characters) {
  const codepoint = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  try { await access(path.join(ROOT, 'data', 'strokes', `${codepoint}.json`)); }
  catch { missing.push({ character, codepoint }); }
}
const result = { missing: missing.map(({ character }) => character), codepoints: missing.map(({ codepoint }) => codepoint) };
const output = path.join(ROOT, 'data', 'stroke-gaps.json');
await writeFile(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(`Wrote ${path.relative(ROOT, output)}: ${missing.length} missing characters`);
console.log(missing.map(({ character, codepoint }) => `${character} U+${codepoint}`).join(', '));
