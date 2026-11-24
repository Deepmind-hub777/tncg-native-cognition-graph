export function detectAudioEnvironment({ userAgent = '', protocol = '', speechApi = null } = {}) {
  const ua = userAgent.toLowerCase(), android = ua.includes('android');
  const voices = speechApi?.getVoices?.() ?? [];
  const mandarinVoiceAvailable = voices.some((voice) => voice.lang?.replace('_','-').toLowerCase().startsWith('zh'));
  const webView = android && (/; wv\)/.test(ua) || ua.includes('webview'));
  return { androidChrome: android && ua.includes('chrome') && !webView, webView, filePreview: protocol === 'file:', ttsAvailable: Boolean(speechApi && typeof speechApi.speak === 'function'), mandarinVoiceAvailable };
}

export function resolveAudioClip(sequence, mode = 'normal', characterIndex = null, codePoints = ['5929','5730','7384','9EC3']) {
  const id = `qzw-${String(sequence).padStart(3, '0')}`;
  if (mode === 'normal' || mode === 'slow') return `assets/audio/${id}-slow.mp3`;
  if (mode === 'character' && Number.isInteger(characterIndex) && codePoints[characterIndex]) return `assets/audio/chars/${String(codePoints[characterIndex]).toUpperCase()}.mp3`;
  throw new RangeError('Unknown audio clip mode or character index');
}

export function selectAudioAsset(manifest, mode, characterIndex = null) {
  if (manifest?.generationStatus !== 'generated') return null;
  const key = mode === 'character' || mode === 'quiz' ? `character-${characterIndex + 1}` : mode;
  return manifest.clips?.[key]?.path ?? null;
}

const emit = (onState, state, details) => onState?.(state, details);
const normalizeLang = (lang = '') => lang.replace('_','-').toLowerCase();
function selectMandarinVoice(speechApi) {
  const voices = speechApi?.getVoices?.() ?? [];
  return voices.find((voice) => normalizeLang(voice.lang) === 'zh-cn') ?? voices.find((voice) => normalizeLang(voice.lang).startsWith('zh')) ?? null;
}

function waitForChineseVoice(speechApi, timeout = 1800) {
  const existing = selectMandarinVoice(speechApi);
  if (existing) return Promise.resolve(existing);
  if (typeof speechApi?.addEventListener !== 'function' && !('onvoiceschanged' in (speechApi ?? {}))) return Promise.resolve(null);
  return new Promise((resolve) => {
    let finished = false;
    const prior = speechApi.onvoiceschanged;
    let timer;
    const finish = (voice) => {
      if (finished) return; finished = true; clearTimeout(timer);
      if (typeof speechApi.removeEventListener === 'function') speechApi.removeEventListener('voiceschanged', changed);
      if (speechApi.onvoiceschanged === changed) speechApi.onvoiceschanged = prior ?? null;
      resolve(voice);
    };
    const changed = (...args) => { prior?.(...args); const voice = selectMandarinVoice(speechApi); if (voice) finish(voice); };
    speechApi.onvoiceschanged = changed;
    if (typeof speechApi.addEventListener === 'function') speechApi.addEventListener('voiceschanged', changed);
    timer = setTimeout(() => finish(selectMandarinVoice(speechApi)), timeout);
  });
}

export async function playClip({ audioElement, assetUrl, fallbackText, speakingRate = 1, speechApi = globalThis.speechSynthesis, onState = () => {} }) {
  emit(onState, 'loading'); speechApi?.cancel?.();
  let fallbackPromise = null;
  const startTts = (voice) => {
    if (!voice || !speechApi || typeof speechApi.speak !== 'function') {
      const error = new Error('此設備沒有可用的普通話語音，且預錄音頻不可用。請檢查音頻資源或安裝普通話語音服務。');
      emit(onState, 'error', { message: error.message }); throw error;
    }
    try {
      const utterance = typeof globalThis.SpeechSynthesisUtterance === 'function' ? new globalThis.SpeechSynthesisUtterance(fallbackText) : { text: fallbackText };
      utterance.lang = 'zh-CN'; utterance.voice = voice; utterance.volume = 1; utterance.rate = speakingRate;
      utterance.onstart = () => emit(onState, 'playing', { source: 'browser-tts' });
      utterance.onend = () => emit(onState, 'ended', { source: 'browser-tts' });
      utterance.onerror = (event) => emit(onState, 'error', { message: event?.error ?? 'Android/浏览器语音服务播放失败。', source: 'browser-tts' });
      speechApi.speak(utterance); emit(onState, 'playing', { source: 'browser-tts' });
    } catch (cause) {
      const error = new Error(`普通話備用語音啟動失敗：${cause?.message ?? '未知錯誤'}`);
      emit(onState, 'error', { message: error.message, source: 'browser-tts' }); throw error;
    }
  };
  const useTtsFallback = () => {
    if (fallbackPromise) return fallbackPromise;
    const voice = selectMandarinVoice(speechApi);
    if (voice) {
      try { startTts(voice); fallbackPromise = Promise.resolve(); }
      catch (error) { fallbackPromise = Promise.reject(error); }
      return fallbackPromise;
    }
    fallbackPromise = waitForChineseVoice(speechApi).then((loadedVoice) => startTts(loadedVoice));
    return fallbackPromise;
  };
  if (assetUrl && audioElement) {
    try {
      audioElement.onerror = () => { void useTtsFallback().catch(() => {}); };
      audioElement.onended = () => { if (!fallbackPromise) emit(onState, 'ended', { source: 'recorded-audio' }); };
      audioElement.src = assetUrl; audioElement.currentTime = 0;
      await audioElement.play(); emit(onState, 'playing', { source: 'recorded-audio' });
      return;
    } catch { /* Use speech fallback when an expected recording cannot play. */ }
  }
  await useTtsFallback();
}
