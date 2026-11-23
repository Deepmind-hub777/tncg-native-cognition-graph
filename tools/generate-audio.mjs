import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAudioTargets, buildNormalAudioTargets } from './audio-targets.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const readArgs = () => {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith('--')) args.set(process.argv[i], process.argv[++i]);
  return args;
};
const args = readArgs();
const start = Number(args.get('--start') ?? 2), end = Number(args.get('--end') ?? 250);
const concurrency = Math.max(1, Math.min(8, Number(args.get('--concurrency') ?? 5)));
const mode = args.get('--mode') ?? 'legacy';
if (!['legacy', 'normal'].includes(mode)) throw new RangeError(`unsupported audio mode: ${mode}`);
const dryRun = process.argv.includes('--dry-run');
const lessonsPath = resolve(root, 'data/lessons.json');
const manifestPath = resolve(root, 'data/audio-manifest.json');
const lessons = JSON.parse(await readFile(lessonsPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const targets = mode === 'normal'
  ? buildNormalAudioTargets(lessons, { start, end })
  : buildAudioTargets(lessons, { start, end });

if (dryRun) {
  console.log(JSON.stringify({ start, end, concurrency, targetCount: targets.length, groupCount: targets.filter((target) => target.key.startsWith('qzw-')).length, uniqueCharacterCount: targets.filter((target) => target.key.startsWith('char-')).length }, null, 2));
  process.exit(0);
}

const gcloud = process.env.GCLOUD_CMD || (process.platform === 'win32' && process.env.LOCALAPPDATA
  ? resolve(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd')
  : 'gcloud');
const runGcloud = (args) => process.platform === 'win32'
  ? execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '& $env:GCLOUD_CMD ' + args.join(' ')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GCLOUD_CMD: gcloud } })
  : execFileSync(gcloud, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
// 凭据来源优先级：显式 token → gcloud 用户凭据 → ADC。
// 注意：ADC 常属于另一个 Google 身份，若它不是该项目的成员，会在 TTS 上返回 403
// "serviceusage.services.use"，因此只在前两者都不可用时才降级，并且必须打印警告。
let token = '';
let tokenSource = '';
if (process.env.TTS_ACCESS_TOKEN) { token = process.env.TTS_ACCESS_TOKEN.trim(); tokenSource = 'env:TTS_ACCESS_TOKEN'; }
if (!token) {
  try { token = runGcloud(['auth', 'print-access-token']).trim(); if (token) tokenSource = 'gcloud-user'; } catch { token = ''; }
}
if (!token) {
  try { token = runGcloud(['auth', 'application-default', 'print-access-token']).trim(); if (token) tokenSource = 'gcloud-adc'; } catch { token = ''; }
}
if (!token) throw new Error('No gcloud CLI or application-default access token is available. Set TTS_ACCESS_TOKEN, or run gcloud auth login as an account that owns the project.');
if (tokenSource === 'gcloud-adc') console.warn('WARN: 使用 ADC 凭据；若该身份不是项目成员，TTS 会返回 403 serviceusage.services.use。建议改用 gcloud auth login 或设置 TTS_ACCESS_TOKEN。');
const project = runGcloud(['config', 'get-value', 'project']).trim();
if (!project || project === '(unset)') throw new Error('No active Google Cloud project is configured.');
console.log(`auth: ${tokenSource} · project: ${project}`);

const voice = 'cmn-CN-Standard-A';
const pending = [];
for (const target of targets) {
  const path = resolve(root, target.path);
  try { await stat(path); manifest.clips[target.key] ??= { path: target.path, text: target.text, pinyin: target.pinyin, speakingRate: target.speakingRate, status: 'needs_review' }; }
  catch { pending.push(target); }
}
let completed = targets.length - pending.length;
let next = 0, firstError = null;
let saveQueue = Promise.resolve();
const saveManifest = () => {
  saveQueue = saveQueue.then(async () => {
    if (mode === 'normal') manifest.normalAudioStatus = 'partial';
    else manifest.generationStatus = 'partial';
    manifest.generatedAt = new Date().toISOString();
    await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n'); await rename(`${manifestPath}.tmp`, manifestPath);
  });
  return saveQueue;
};
const worker = async () => {
  while (next < pending.length && !firstError) {
    const target = pending[next++];
    let lastError;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': project },
          body: JSON.stringify({ input: target.ssml ? { ssml: target.ssml } : { text: target.text }, voice: { languageCode: 'cmn-CN', name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: target.speakingRate } }),
        });
        const payload = await response.json();
        if (!response.ok) {
          lastError = new Error(`TTS request failed (${response.status}): ${payload.error?.message ?? 'unknown API error'}`);
          if (![429, 500, 502, 503, 504].includes(response.status)) {
            firstError = lastError;
            return;
          }
        } else {
          const output = resolve(root, target.path); await mkdir(dirname(output), { recursive: true });
          const tempOutput = `${output}.tmp`; await writeFile(tempOutput, Buffer.from(payload.audioContent, 'base64')); await rename(tempOutput, output);
          manifest.clips[target.key] = { path: target.path, text: target.text, pinyin: target.pinyin, speakingRate: target.speakingRate, ...(target.ssml ? { pronunciationOverride: true } : {}), status: 'needs_review' };
          completed += 1;
          break;
        }
      } catch (error) { lastError = error; }
      await new Promise((resolveWait) => setTimeout(resolveWait, Math.min(15000, 750 * 2 ** attempt)));
    }
    if (!manifest.clips[target.key]) { firstError = new Error(`${target.key} failed after retries: ${lastError?.message ?? 'unknown error'}`); return; }
    if (completed % 25 === 0 || completed === targets.length) {
      await saveManifest();
      console.log(`generated ${completed}/${targets.length}: ${target.key}`);
    }
  }
};
await Promise.all(Array.from({ length: concurrency }, worker));
await saveQueue;
if (firstError) throw firstError;

for (const lesson of lessons.filter((entry) => entry.sequence >= start && entry.sequence <= end)) {
  if (mode === 'normal') {
    const key = lesson.sequence === 1 ? 'normal' : `qzw-${String(lesson.sequence).padStart(3, '0')}-normal`;
    if (manifest.clips[key]) lesson.audio.value.normal = manifest.clips[key].path;
    continue;
  }
  const groupKey = `qzw-${String(lesson.sequence).padStart(3, '0')}-slow`;
  const pathFor = (character) => `assets/audio/chars/${[...character].map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')}.mp3`;
  lesson.audio.value.slow = manifest.clips[groupKey]?.path ?? `assets/audio/qzw-${String(lesson.sequence).padStart(3, '0')}-slow.mp3`;
  lesson.audio.value.characters = [...lesson.traditionalText.value].map(pathFor);
}
await writeFile(`${lessonsPath}.tmp`, JSON.stringify(lessons, null, 2) + '\n'); await rename(`${lessonsPath}.tmp`, lessonsPath);
if (mode === 'normal') {
  const allNormalTargets = buildNormalAudioTargets(lessons);
  manifest.normalAudioStatus = allNormalTargets.every((target) => manifest.clips[target.key]) ? 'generated' : 'partial';
  manifest.normalAudioGeneratedCount = allNormalTargets.filter((target) => manifest.clips[target.key]).length;
} else {
  manifest.generationStatus = targets.every((target) => manifest.clips[target.key]) ? 'generated' : 'partial';
}
manifest.generatedAt = new Date().toISOString();
await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n'); await rename(`${manifestPath}.tmp`, manifestPath);
console.log(`Generated ${targets.length} requested ${mode} audio assets with ${voice}; existing assets were reused and all clips remain needs_review.`);
