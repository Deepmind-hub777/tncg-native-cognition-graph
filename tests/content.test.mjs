import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLessons } from '../tools/validate-content.mjs';
import { readFile, access } from 'node:fs/promises';

const field = (value) => ({ value, status: 'needs_review', source: null });
const valid = { id: 'qzw-001', sequence: 1, traditionalText: field('天地玄黃'), pinyin: field(['tiān','dì','xuán','huáng']), simplifiedMeaning: field('天地深远，色呈玄黄。'), simplifiedMeaningPinyin: field(['tiān','dì','shēn','yuǎn','','sè','chéng','xuán','huáng','']), englishNote: field('Heaven and earth unfold.'), illustration: field({ prompt: 'Primordial sky above the earth.' }), audio: field({ normal: null, slow: null, characters: [null,null,null,null] }), strokeData: field(['5929','5730','7384','9EC3']) };
test('content validation requires four characters and aligned pinyin', () => {
  assert.deepEqual(validateLessons([valid], { expectedCount: 1 }), []);
  assert.ok(validateLessons([{...valid, traditionalText:field('天地玄')}, { ...valid }], { expectedCount: 1 }).length >= 3);
  assert.ok(validateLessons([{...valid, pinyin: field(['tiān'])}], { expectedCount: 1 }).some((e) => e.includes('pinyin')));
});
test('content validation requires status and source metadata on every field', () => {
  const missing = structuredClone(valid); delete missing.englishNote.status;
  assert.ok(validateLessons([missing], { expectedCount: 1 }).some((e) => e.includes('englishNote')));
});
test('content validation requires pinyin for the simplified meaning', () => {
  const missing = structuredClone(valid); delete missing.simplifiedMeaningPinyin;
  assert.ok(validateLessons([missing], { expectedCount: 1 }).some((e) => e.includes('simplifiedMeaningPinyin')));
});
test('content validation requires one pinyin slot per explanation character', () => {
  const misaligned = structuredClone(valid); misaligned.simplifiedMeaningPinyin.value.pop();
  assert.ok(validateLessons([misaligned], { expectedCount: 1 }).some((e) => e.includes('simplifiedMeaningPinyin')));
});

test('expanded corpus contains 250 sourced four-character units and keeps unverified fields in review', async () => {
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url), 'utf8'));
  const source = (await readFile(new URL('../data/corpus-source.txt', import.meta.url), 'utf8')).replace(/\s/gu, '');
  assert.equal(source.length, 1000);
  assert.equal(lessons.length, 250);
  assert.equal(new Set(lessons.flatMap((lesson) => [...lesson.traditionalText.value])).size, 1000);
  assert.deepEqual(validateLessons(lessons), []);
  for (const lesson of lessons.slice(1)) {
    assert.equal([...lesson.traditionalText.value].length, 4);
    for (const key of ['traditionalText', 'pinyin', 'simplifiedMeaning', 'simplifiedMeaningPinyin', 'englishNote', 'illustration', 'audio', 'strokeData']) {
      assert.equal(lesson[key].status, 'needs_review', `${lesson.id} ${key} must remain unverified`);
    }
  }
  assert.equal(lessons.at(-1).traditionalText.value, '焉哉乎也');
  assert.deepEqual(lessons[9].pinyin.value, ['lù','jié','wéi','shuāng']);
});

test('every lesson audio path exists and stroke coverage gaps are explicit', async () => {
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url), 'utf8'));
  const audioPaths = lessons.flatMap((lesson) => [lesson.audio.value.slow, ...lesson.audio.value.characters]).filter(Boolean);
  await Promise.all(audioPaths.map((path) => access(new URL(`../${path}`, import.meta.url))));
  const chars = new Set(lessons.flatMap((lesson) => [...lesson.traditionalText.value]));
  const absent = await Promise.all([...chars].map(async (character) => {
    const code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    try { await access(new URL(`../data/strokes/${code}.json`, import.meta.url)); return false; }
    catch { return true; }
  }));
  assert.equal(chars.size, 1000);
  assert.equal(absent.filter(Boolean).length, 10);
});
