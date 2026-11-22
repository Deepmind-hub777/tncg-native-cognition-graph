import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLessons } from '../tools/validate-content.mjs';

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
