export function detectAudioEnvironment({ userAgent = '', protocol = '', speechApi = null } = {}) {
  const ua = userAgent.toLowerCase(); const android = ua.includes('android');
  const webView = android && (/; wv\)/.test(ua) || ua.includes('webview'));
  return { androidChrome: android && ua.includes('chrome') && !webView, webView, filePreview: protocol === 'file:', ttsAvailable: Boolean(speechApi && typeof speechApi.speak === 'function') };
}

export function resolveAudioClip(sequence, mode = 'normal', characterIndex = null, codePoints = ['5929','5730','7384','9EC3']) {
  const id = `qzw-${String(sequence).padStart(3, '0')}`;
  if (mode === 'normal' || mode === 'slow') return `assets/audio/${id}-${mode}.mp3`;
  if (mode === 'character' && Number.isInteger(characterIndex) && codePoints[characterIndex]) return `assets/audio/chars/${String(codePoints[characterIndex]).toUpperCase()}.mp3`;
  throw new RangeError('Unknown audio clip mode or character index');
}

const emit = (onState, state) => onState?.(state);
async function waitForChineseVoice(speechApi, timeout = 900) {
  if (speechApi.getVoices?.().some((voice) => voice.lang?.toLowerCase().startsWith('zh'))) return true;
  if (typeof speechApi.addEventListener !== 'function' && !('onvoiceschanged' in speechApi)) return false;
  return new Promise((resolve) => {
    let finished = false;
    const done = (available) => { if (finished) return; finished = true; clearTimeout(timer); resolve(available); };
    const prior = speechApi.onvoiceschanged;
    speechApi.onvoiceschanged = (...args) => { prior?.(...args); done(Boolean(speechApi.getVoices?.().some((voice) => voice.lang?.toLowerCase().startsWith('zh')))); };
    const timer = setTimeout(() => done(Boolean(speechApi.getVoices?.().some((voice) => voice.lang?.toLowerCase().startsWith('zh')))), timeout);
    if (typeof speechApi.addEventListener === 'function') speechApi.addEventListener('voiceschanged', () => done(Boolean(speechApi.getVoices?.().some((voice) => voice.lang?.toLowerCase().startsWith('zh')))), { once: true });
  });
}

export async function playClip({ audioElement, assetUrl, fallbackText, speechApi = globalThis.speechSynthesis, onState = () => {} }) {
  emit(onState, 'loading'); speechApi?.cancel?.();
  let fallbackPromise = null;
  const useTtsFallback = () => {
    if (fallbackPromise) return fallbackPromise;
    fallbackPromise = (async () => {
      if (!speechApi || typeof speechApi.speak !== 'function' || !(await waitForChineseVoice(speechApi))) {
        emit(onState, 'error');
        throw new Error('音频无法播放，且此浏览器没有可用的普通话语音。请检查音量或重试。');
      }
      try {
        const utterance = typeof globalThis.SpeechSynthesisUtterance === 'function' ? new globalThis.SpeechSynthesisUtterance(fallbackText) : { text: fallbackText };
        utterance.lang = 'zh-CN';
        utterance.onstart = () => emit(onState, 'playing');
        utterance.onend = () => emit(onState, 'ended');
        utterance.onerror = () => emit(onState, 'error');
        speechApi.speak(utterance); emit(onState, 'playing');
      } catch (error) {
        emit(onState, 'error');
        throw new Error(`普通话备用语音启动失败：${error?.message ?? '未知错误'}`);
      }
    })();
    return fallbackPromise;
  };
  if (assetUrl && audioElement) {
    try {
      audioElement.onerror = () => { void useTtsFallback().catch(() => {}); };
      audioElement.onended = () => { if (!fallbackPromise) emit(onState, 'ended'); };
      audioElement.src = assetUrl; audioElement.currentTime = 0;
      await audioElement.play(); emit(onState, 'playing');
      return;
    } catch { /* Fall through to TTS when the static asset cannot play. */ }
  }
  await useTtsFallback();
}

export function pauseClip(audioElement, speechApi = globalThis.speechSynthesis, onState) {
  if (!audioElement?.paused && audioElement?.src) audioElement.pause();
  speechApi?.pause?.(); emit(onState, 'paused');
}

export function resumeClip(audioElement, speechApi = globalThis.speechSynthesis, onState) {
  if (audioElement?.src && audioElement.paused) Promise.resolve(audioElement.play()).catch(() => emit(onState, 'error'));
  speechApi?.resume?.(); emit(onState, 'playing');
}
