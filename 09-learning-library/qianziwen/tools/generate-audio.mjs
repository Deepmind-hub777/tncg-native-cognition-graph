import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const gcloud = process.env.GCLOUD_CMD || (process.platform === 'win32' && process.env.LOCALAPPDATA
  ? resolve(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd')
  : 'gcloud');
const runGcloud = (args) => process.platform === 'win32'
  ? execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '& $env:GCLOUD_CMD ' + args.join(' ')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GCLOUD_CMD: gcloud } })
  : execFileSync(gcloud, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
let token;
try { token = runGcloud(['auth', 'print-access-token']).trim(); } catch { token = ''; }
if (!token) {
  try { token = runGcloud(['auth', 'application-default', 'print-access-token']).trim(); } catch { token = ''; }
}
if (!token) throw new Error('No gcloud CLI or application-default access token is available.');
const project = runGcloud(['config', 'get-value', 'project']).trim();
if (!project || project === '(unset)') throw new Error('No active Google Cloud project is configured.');
const lesson = JSON.parse(await readFile(resolve(root, 'data/lessons.json'), 'utf8'))[0];
const phrase = lesson.traditionalText.value;
const pinyin = lesson.pinyin.value;
const characters = [...phrase];
const targets = [
  { key: 'normal', path: `assets/audio/qzw-${String(lesson.sequence).padStart(3, '0')}-normal.mp3`, text: phrase, speakingRate: 1 },
  { key: 'slow', path: `assets/audio/qzw-${String(lesson.sequence).padStart(3, '0')}-slow.mp3`, text: phrase, speakingRate: 0.72 },
  ...characters.map((character, index) => ({ key: `character-${index + 1}`, path: `assets/audio/chars/${[...character].map((c)=>c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join('')}.mp3`, text: character, speakingRate: 1 }))
];
const manifest = { source: 'Google Cloud Text-to-Speech', terms: 'https://cloud.google.com/terms/service-terms', docs: 'https://cloud.google.com/text-to-speech/docs/basics', voice: 'cmn-CN-Standard-A', languageCode: 'cmn-CN', encoding: 'MP3', generatedAt: new Date().toISOString(), clips: {} };
for (const clip of targets) {
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': project }, body: JSON.stringify({ input: { text: clip.text }, voice: { languageCode: 'cmn-CN', name: manifest.voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: clip.speakingRate } }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`TTS request failed (${response.status}): ${payload.error?.message ?? 'unknown API error'}`);
  const output = resolve(root, clip.path); await mkdir(dirname(output), { recursive: true }); await writeFile(output, Buffer.from(payload.audioContent, 'base64'));
  manifest.clips[clip.key] = { path: clip.path.replaceAll('\\', '/'), text: clip.text, pinyin: clip.key.startsWith('character-') ? pinyin[Number(clip.key.at(-1)) - 1] : pinyin.join(' '), speakingRate: clip.speakingRate, status: 'needs_review' };
  console.log(`generated ${clip.key}: ${clip.path}`);
}
manifest.generationStatus = 'generated';
await mkdir(resolve(root, 'data'), { recursive: true });
await writeFile(resolve(root, 'data/audio-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`generated ${targets.length} sample clips using ${manifest.voice}; no account, project, or billing configuration was created or changed.`);
