#!/usr/bin/env node
import { readFile, readdir, stat, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_DIR = path.join(ROOT, 'assets', 'illustrations');
const LESSONS_FILE = path.join(ROOT, 'data', 'lessons.json');
const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !['--dry-run', '--write'].includes(arg)) || (args.has('--dry-run') && args.has('--write'))) {
  console.error('Usage: node tools/import-illustrations.mjs [--dry-run | --write]');
  process.exit(2);
}
const writeMode = args.has('--write');
const entries = await readdir(ASSET_DIR, { withFileTypes: true });
const imageEntries = entries.filter((entry) => entry.isFile() && /^qzw-/i.test(entry.name) && /\.(jpe?g|png)$/i.test(entry.name));
const found = new Map();
const malformed = [];
let totalBytes = 0;
for (const entry of imageEntries) {
  const file = path.join(ASSET_DIR, entry.name);
  totalBytes += (await stat(file)).size;
  const match = /^qzw-(\d+)\.(jpg|jpeg|png)$/i.exec(entry.name);
  if (!match) { malformed.push(entry.name); continue; }
  const sequence = Number(match[1]);
  const canonicalName = `qzw-${String(sequence).padStart(3, '0')}.jpg`;
  // qzw-001 is the existing golden sample and is outside this import batch.
  if (sequence === 1) continue;
  if (match[1] !== String(sequence).padStart(3, '0')) malformed.push(`${entry.name} (应命名为 ${canonicalName})`);
  if (sequence < 2 || sequence > 250) { malformed.push(`${entry.name} (序号须为 002–250)`); continue; }
  const items = found.get(sequence) ?? [];
  items.push({ name: entry.name, ext: match[2].toLowerCase(), canonicalName, file });
  found.set(sequence, items);
}
const duplicates = [...found].filter(([, items]) => items.length > 1);
const missing = Array.from({ length: 249 }, (_, index) => index + 2).filter((sequence) => !found.has(sequence));
const lessons = JSON.parse(await readFile(LESSONS_FILE, 'utf8'));
const lessonBySequence = new Map(lessons.map((lesson) => [lesson.sequence, lesson]));
console.log(`模式：${writeMode ? 'write' : 'dry-run'}`);
console.log(`扫描图片：${imageEntries.length} 张；总大小：${(totalBytes / 1024 / 1024).toFixed(2)} MB (${totalBytes} bytes)`);
console.log(`缺失序号（${missing.length}）：${missing.length ? missing.map((n) => String(n).padStart(3, '0')).join(', ') : '无'}`);
if (malformed.length) console.log(`命名/范围错误（${malformed.length}）：\n- ${malformed.join('\n- ')}`);
if (duplicates.length) console.log(`重复序号：\n${duplicates.map(([n, items]) => `- ${String(n).padStart(3, '0')}: ${items.map((item) => item.name).join(', ')}`).join('\n')}`);
if (totalBytes > 75 * 1024 * 1024) console.warn('警告：插图总大小超过 75 MB。请先评估仓库体积，再决定 .gitignore 或 Git LFS；本工具不会自行更改它们。');
let writeErrors = [];
if (writeMode) {
  for (const [sequence, items] of found) {
    if (items.length !== 1) continue;
    const item = items[0];
    if (item.ext === 'png') { writeErrors.push(`${item.name}: PNG 无法作为 .jpg 路径登记，请先转换为 JPEG`); continue; }
    if (item.name !== item.canonicalName) {
      if (item.ext === 'jpeg' && !malformed.some((entry) => entry.startsWith(item.name))) await copyFile(item.file, path.join(ASSET_DIR, item.canonicalName));
      else { writeErrors.push(`${item.name}: 文件名须补零并规范为 ${item.canonicalName}`); continue; }
    }
    const lesson = lessonBySequence.get(sequence);
    if (!lesson) { writeErrors.push(`找不到 sequence=${sequence} 的课程记录`); continue; }
    lesson.illustration.value.path = `assets/illustrations/${item.canonicalName}`;
    lesson.illustration.status = 'needs_review';
    lesson.illustration.source = 'ChatGPT 生成草稿，待教学审核';
  }
  await writeFile(LESSONS_FILE, JSON.stringify(lessons, null, 2) + '\n', 'utf8');
  console.log(`已写入课程图片路径；状态均保持 needs_review。\n${writeErrors.length ? `未登记项：\n- ${writeErrors.join('\n- ')}` : '无写入错误。'}`);
}
if (malformed.length || duplicates.length || writeErrors.length) process.exitCode = 1;
