import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAudioTargets } from './audio-targets.mjs';

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
const dryRun = process.argv.includes('--dry-run');
const lessonsPath = resolve(root, 'data/lessons.json');
const manifestPath = resolve(root, 'data/audio-manifest.json');
const lessons = JSON.parse(await readFile(lessonsPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const targets = buildAudioTargets(lessons, { start, end });

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
let token;
try { token = runGcloud(['auth', 'print-access-token']).trim(); } catch { token = ''; }
if (!token) { try { token = runGcloud(['auth', 'application-default', 'print-access-token']).trim(); } catch { token = ''; } }
if (!token) throw new Error('No gcloud CLI or application-default access token is available.');
const project = runGcloud(['config', 'get-value', 'project']).trim();
if (!project || project === '(unset)') throw new Error('No active Google Cloud project is configured.');

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
    manifest.generationStatus = 'partial'; manifest.generatedAt = new Date().toISOString();
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
          body: JSON.stringify({ input: { text: target.text }, voice: { languageCode: 'cmn-CN', name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: target.speakingRate } }),
        });
        const payload = await response.json();
        if (!response.ok) {
          lastError = new Error(`TTS request failed (${response.status}): ${payload.error?.message ?? 'unknown API error'}`);
          if (![429, 500, 502, 503, 504].includes(response.status)) throw lastError;
        } else {
          const output = resolve(root, target.path); await mkdir(dirname(output), { recursive: true });
          const tempOutput = `${output}.tmp`; await writeFile(tempOutput, Buffer.from(payload.audioContent, 'base64')); await rename(tempOutput, output);
          manifest.clips[target.key] = { path: target.path, text: target.text, pinyin: target.pinyin, speakingRate: target.speakingRate, status: 'needs_review' };
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

for (const lesson of lessons.filter((entry) => entry.sequence >= start && entry.sequence <= end)) {
  const groupKey = `qzw-${String(lesson.sequence).padStart(3, '0')}-slow`;
  const pathFor = (character) => `assets/audio/chars/${[...character].map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')}.mp3`;
  lesson.audio.value.slow = manifest.clips[groupKey]?.path ?? `assets/audio/qzw-${String(lesson.sequence).padStart(3, '0')}-slow.mp3`;
  lesson.audio.value.characters = [...lesson.traditionalText.value].map(pathFor);
}
await writeFile(`${lessonsPath}.tmp`, JSON.stringify(lessons, null, 2) + '\n'); await rename(`${lessonsPath}.tmp`, lessonsPath);
manifest.generationStatus = targets.every((target) => manifest.clips[target.key]) ? 'generated' : 'partial';
manifest.generatedAt = new Date().toISOString();
await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n'); await rename(`${manifestPath}.tmp`, manifestPath);
if (firstError) throw firstError;
console.log(`Generated ${targets.length} requested audio assets with ${voice}; existing assets were reused and all clips remain needs_review.`);
