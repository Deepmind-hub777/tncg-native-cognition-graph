import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DATA = new URL('../data/', import.meta.url);
const TOOLS = new URL('./', import.meta.url);

const MEANING_SOURCE = 'Doubao-authored teaching draft (2026-11-22); pending Codex/human review against primary sources.';
const MEANING_PINYIN_SOURCE = 'Char-aligned pinyin generated with pypinyin 0.55.0 over the Doubao-authored explanation draft; pending review.';
const ENGLISH_SOURCE = 'Doubao-authored English gloss draft (2026-11-22); pending review.';

async function loadDrafts() {
  const entry = new Map();
  for (const part of ['part1', 'part2', 'part3']) {
    const rows = JSON.parse(await readFile(new URL(`meaning-drafts.${part}.json`, DATA), 'utf8'));
    for (const row of rows) {
      if (entry.has(row.sequence)) throw new Error(`duplicate draft for sequence ${row.sequence}`);
      entry.set(row.sequence, row);
    }
  }
  return entry;
}

function align(meanings) {
  return new Promise((resolve, reject) => {
    const child = spawn('python', [fileURLToPath(new URL('align-pinyin.py', TOOLS))], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    let buffer = '';
    child.stdout.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`align-pinyin.py exited with ${code}`));
      resolve(JSON.parse(buffer).aligned);
    });
    child.stdin.end(JSON.stringify({ texts: meanings }));
  });
}

const drafts = await loadDrafts();
const lessons = JSON.parse(await readFile(new URL('lessons.json', DATA), 'utf8'));

const missing = lessons.filter((lesson) => lesson.sequence > 1 && !drafts.has(lesson.sequence)).map((lesson) => lesson.sequence);
if (missing.length) throw new Error(`missing drafts for sequences: ${missing.join(', ')}`);

const ordered = lessons.filter((lesson) => lesson.sequence > 1);
const aligned = await align(ordered.map((lesson) => drafts.get(lesson.sequence).meaning));

for (const [index, lesson] of ordered.entries()) {
  const draft = drafts.get(lesson.sequence);
  lesson.simplifiedMeaning.value = draft.meaning;
  lesson.simplifiedMeaning.source = MEANING_SOURCE;
  lesson.simplifiedMeaningPinyin.value = aligned[index];
  lesson.simplifiedMeaningPinyin.source = MEANING_PINYIN_SOURCE;
  lesson.englishNote.value = draft.en;
  lesson.englishNote.source = ENGLISH_SOURCE;
}

await writeFile(new URL('lessons.json', DATA), JSON.stringify(lessons, null, 2) + '\n', 'utf8');
console.log(`Applied ${ordered.length} authored meanings to lessons.json.`);
