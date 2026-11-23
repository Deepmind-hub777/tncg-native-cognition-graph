import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAudioEnvironment, resolveAudioClip, selectAudioAsset, playClip } from '../src/audio.js';
import { buildAudioTargets, buildNormalAudioTargets } from '../tools/audio-targets.mjs';

class SpeechStub {
  constructor() { this.spoken = []; this.paused = false; this.onvoiceschanged = null; }
  getVoices() { return [{ lang: 'zh-CN', name: 'Mandarin' }]; }
  speak(utterance) { this.spoken.push(utterance); }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  cancel() {}
}
test('audio environment recognizes Android Chrome and fallback limitations', () => {
  assert.deepEqual(detectAudioEnvironment({ userAgent: 'Mozilla/5.0 Android Chrome/120', protocol: 'https:', speechApi: { speak() {}, getVoices: () => [{ lang: 'zh-CN' }] } }), { androidChrome: true, webView: false, filePreview: false, ttsAvailable: true, mandarinVoiceAvailable: true });
  assert.equal(detectAudioEnvironment({ userAgent: 'Android WebView', protocol: 'file:', speechApi: null }).filePreview, true);
  assert.equal(detectAudioEnvironment({ userAgent: 'Android Chrome', speechApi: { speak(){}, getVoices(){return []} } }).mandarinVoiceAvailable, false);
});
test('clip paths resolve normal, slow and each character independently', () => {
  assert.equal(resolveAudioClip(1, 'normal'), 'assets/audio/qzw-001-normal.mp3');
  assert.equal(resolveAudioClip(1, 'slow'), 'assets/audio/qzw-001-slow.mp3');
  assert.equal(resolveAudioClip(1, 'character', 2), 'assets/audio/chars/7384.mp3');
});
test('missing or rejected MP3 uses Mandarin TTS, and exposes playback state', async () => {
  const speech = new SpeechStub(); const states = [];
  const audio = { src: '', play: async () => { throw new Error('decode failed'); }, pause() {} };
  await playClip({ audioElement: audio, assetUrl: null, fallbackText: '天地玄黃', speechApi: speech, onState: (s) => states.push(s) });
  assert.equal(speech.spoken[0].text, '天地玄黃');
  assert.ok(states.includes('loading') && states.includes('playing'));
});
test('TTS unavailable produces an actionable error', async () => {
  const states = []; const audio = { src: '', play: async () => {}, pause() {} };
  await assert.rejects(playClip({ audioElement: audio, assetUrl: null, fallbackText: '天', speechApi: null, onState: (s) => states.push(s) }));
  assert.equal(states.at(-1), 'error');
});
test('an initially decodable clip that fails asynchronously falls back to Mandarin TTS', async () => {
  const speech = new SpeechStub(); const states = [];
  const audio = { src:'', play: async()=>{}, pause(){} };
  await playClip({ audioElement:audio, assetUrl:'clip.mp3', fallbackText:'玄', speechApi:speech, onState:(s)=>states.push(s) });
  audio.onerror(new Error('decode failed'));
  await new Promise((resolve)=>setTimeout(resolve,0));
  assert.equal(speech.spoken.at(-1).text,'玄');
  assert.ok(states.includes('playing'));
});
test('uses an installed Mandarin voice synchronously when no static clip exists', async () => {
  const speech = new SpeechStub(); const states = []; const audio = { src:'', play:async()=>{}, pause(){} };
  const playback = playClip({ audioElement:audio, assetUrl:null, fallbackText:'天地玄黃', speechApi:speech, onState:(...state)=>states.push(state) });
  assert.equal(speech.spoken.length,1,'start TTS synchronously in the tap handler');
  assert.equal(speech.spoken[0].lang,'zh-CN');
  assert.equal(speech.spoken[0].voice.name,'Mandarin');
  await playback;
  assert.ok(states.some(([state, detail]) => state === 'playing' && detail?.source === 'browser-tts'));
});

test('reports a specific error when an Android-like device has no Mandarin voice', async () => {
  const states = []; const audio = { src: '', play: async () => {}, pause() {} };
  const speech = { speak() {}, getVoices: () => [] };
  await assert.rejects(playClip({ audioElement: audio, assetUrl: null, fallbackText: '天地玄黃', speechApi: speech, onState: (state, detail) => states.push([state, detail]) }), /沒有可用的普通話語音/);
  assert.equal(states.at(-1)[0], 'error');
  assert.match(states.at(-1)[1].message, /安裝普通話語音服務/);
});

test('only selects pre-generated clips from a completed asset manifest', () => {
  assert.equal(selectAudioAsset({generationStatus:'blocked',clips:{normal:{path:'clip.mp3'}}},'normal'),null);
  assert.equal(selectAudioAsset({generationStatus:'generated',clips:{normal:{path:'clip.mp3'}}},'normal'),'clip.mp3');
  assert.equal(selectAudioAsset({generationStatus:'generated',clips:{'character-3':{path:'char.mp3'}}},'character',2),'char.mp3');
});

test('batch audio targets create one slow group clip per lesson and deduplicate character clips', async () => {
  const { readFile } = await import('node:fs/promises');
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url), 'utf8'));
  const targets = buildAudioTargets(lessons, { start: 2, end: 250 });
  const groupTargets = targets.filter((target) => target.key.startsWith('qzw-'));
  const characterTargets = targets.filter((target) => target.key.startsWith('char-'));
  assert.equal(groupTargets.length, 249);
  assert.equal(groupTargets[0].key, 'qzw-002-slow');
  assert.equal(groupTargets.at(-1).key, 'qzw-250-slow');
  assert.equal(characterTargets.length, new Set(characterTargets.map((target) => target.key)).size);
  assert.equal(characterTargets.length, 996);
  assert.equal(characterTargets.some((target) => target.path === 'assets/audio/chars/9EC3.mp3'), false);
});

test('normal audio targets create one standard-speed group clip per lesson without character duplicates', async () => {
  const { readFile } = await import('node:fs/promises');
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url), 'utf8'));
  assert.equal(buildNormalAudioTargets(lessons, { start: 1, end: 1 })[0].key, 'normal');
  const targets = buildNormalAudioTargets(lessons, { start: 51, end: 100 });
  assert.equal(targets.length, 50);
  assert.equal(targets[0].key, 'qzw-051-normal');
  assert.equal(targets[0].path, 'assets/audio/qzw-051-normal.mp3');
  assert.equal(targets.at(-1).key, 'qzw-100-normal');
  assert.ok(targets.every((target) => target.speakingRate === 1));
  assert.ok(targets.every((target) => target.text.length === 4));
  assert.ok(targets.every((target) => !target.key.startsWith('char-')));
});

test('normal audio targets encode the three sequence-specific pinyin overrides as Mandarin phonemes', async () => {
  const { readFile } = await import('node:fs/promises');
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url), 'utf8'));
  const targetFor = (sequence) => buildNormalAudioTargets(lessons, { start: sequence, end: sequence })[0];
  assert.match(targetFor(10).ssml, /ph="wei2">爲<\/phoneme>/);
  assert.match(targetFor(37).ssml, /ph="fa4">髮<\/phoneme>/);
  assert.ok(targetFor(188).ssml.includes('<speak>'));
  assert.equal(targetFor(51).ssml, undefined);
});
