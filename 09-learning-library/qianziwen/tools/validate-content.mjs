import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CONTENT_FIELDS = ['traditionalText', 'pinyin', 'simplifiedMeaning', 'englishNote', 'illustration', 'audio', 'strokeData'];

export function validateLessons(entries, { expectedCount = 250 } = {}) {
  const errors = [];
  if (!Array.isArray(entries)) return ['lessons must be an array'];
  if (entries.length !== expectedCount) errors.push(`expected ${expectedCount} lessons, received ${entries.length}`);
  const ids = new Set();
  const sequences = new Set();
  for (const [index, entry] of entries.entries()) {
    const label = `lesson ${index + 1}`;
    if (!entry || typeof entry !== 'object') { errors.push(`${label} must be an object`); continue; }
    if (typeof entry.id !== 'string' || !entry.id.trim()) errors.push(`${label} missing id`);
    else if (ids.has(entry.id)) errors.push(`${label} duplicate id ${entry.id}`);
    else ids.add(entry.id);
    if (!Number.isInteger(entry.sequence) || entry.sequence < 1) errors.push(`${label} invalid sequence`);
    else if (sequences.has(entry.sequence)) errors.push(`${label} duplicate sequence ${entry.sequence}`);
    else sequences.add(entry.sequence);
    for (const field of CONTENT_FIELDS) {
      const item = entry[field];
      if (!item || typeof item !== 'object' || !('value' in item) || !['verified', 'needs_review'].includes(item.status) || !('source' in item)) {
        errors.push(`${label} ${field} requires value, status and source`);
        continue;
      }
      if (field === 'traditionalText' && (typeof item.value !== 'string' || [...item.value].length !== 4)) errors.push(`${label} traditionalText must contain exactly four characters`);
      if (field === 'pinyin' && (!Array.isArray(item.value) || item.value.length !== 4 || item.value.some((v) => typeof v !== 'string' || !v.trim()))) errors.push(`${label} pinyin must contain four non-empty syllables`);
    }
  }
  return errors;
}

async function runCli() {
  const sampleMode = process.argv.includes('--sample');
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url), 'utf8'));
  const errors = validateLessons(lessons, { expectedCount: sampleMode ? 1 : 250 });
  if (errors.length) {
    console.error(`Content validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log(`Content validation passed: ${lessons.length} lessons, ${Math.ceil(lessons.length / 4)} pages.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
