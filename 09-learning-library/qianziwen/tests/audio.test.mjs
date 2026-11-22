import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAudioEnvironment, resolveAudioClip, playClip, pauseClip, resumeClip } from '../src/audio.js';

class SpeechStub {
  constructor() { this.spoken = []; this.paused = false; this.onvoiceschanged = null; }
  getVoices() { return [{ lang: 'zh-CN', name: 'Mandarin' }]; }
  speak(utterance) { this.spoken.push(utterance); }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  cancel() {}
}
test('audio environment recognizes Android Chrome and fallback limitations', () => {
  assert.deepEqual(detectAudioEnvironment({ userAgent: 'Mozilla/5.0 Android Chrome/120', protocol: 'https:', speechApi: { speak() {} } }), { androidChrome: true, webView: false, filePreview: false, ttsAvailable: true });
  assert.equal(detectAudioEnvironment({ userAgent: 'Android WebView', protocol: 'file:', speechApi: null }).filePreview, true);
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
test('TTS unavailable produces an actionable error and pause/resume/replay are supported', async () => {
  const states = []; const audio = { src: '', play: async () => {}, pause() {} };
  await assert.rejects(playClip({ audioElement: audio, assetUrl: null, fallbackText: '天', speechApi: null, onState: (s) => states.push(s) }));
  assert.equal(states.at(-1), 'error');
  const speech = new SpeechStub();
  await playClip({ audioElement: audio, assetUrl: null, fallbackText: '地', speechApi: speech, onState: () => {} });
  pauseClip(audio, speech); assert.equal(speech.paused, true);
  resumeClip(audio, speech); assert.equal(speech.paused, false);
});
