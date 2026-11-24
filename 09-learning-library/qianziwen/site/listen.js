import { playClip } from '../src/audio.js';

const $ = (selector) => document.querySelector(selector);
const TOTAL = 250;
const card = $('#lesson-card');
const audio = $('#audio-player');
let lessons = [];
let sequence = 1;
let activeLesson;

function setAudioState(state, details = {}) {
  const labels = {
    idle: '点按按钮收听',
    loading: '正在准备语音…',
    playing: '正在播放',
    ended: '播放完成；再次点按可重听',
    error: '语音播放失败。',
  };
  const source = details.source === 'browser-tts' ? '（设备普通话语音）' : details.source === 'recorded-audio' ? '（标准录音）' : '';
  $('#audio-state').textContent = state === 'error'
    ? `播放失败：${details.message ?? labels.error}`
    : `${labels[state] ?? state}${state === 'playing' ? source : ''}`;
}

function resolveAsset(path) {
  return path ? new URL(`../${path}`, import.meta.url).href : '';
}

function appendMeaningWithPinyin(target, meaning, pinyin) {
  target.replaceChildren();
  [...meaning].forEach((character, index) => {
    const syllable = pinyin?.[index];
    if (!syllable) {
      target.append(document.createTextNode(character));
      return;
    }
    const ruby = document.createElement('ruby');
    ruby.append(document.createTextNode(character));
    const reading = document.createElement('rt');
    reading.textContent = syllable;
    ruby.append(reading);
    target.append(ruby);
  });
}

function updateAddress() {
  const url = new URL(location.href);
  url.searchParams.set('group', String(sequence));
  history.pushState({ sequence }, '', url);
}

function render() {
  activeLesson = lessons[sequence - 1];
  if (!activeLesson) return;
  card.setAttribute('aria-busy', 'true');
  const text = activeLesson.traditionalText.value;
  const characters = [...text];
  $('#lesson-index').textContent = `第 ${sequence} 组`;
  $('#traditional-text').textContent = text;
  $('#character-pinyin').replaceChildren();
  characters.forEach((character, index) => {
    const pair = document.createElement('span'); pair.className = 'pinyin-pair';
    const hanzi = document.createElement('span'); hanzi.className = 'pinyin-hanzi'; hanzi.textContent = character;
    const syllable = document.createElement('span'); syllable.className = 'pinyin-syllable'; syllable.textContent = activeLesson.pinyin.value[index] ?? '';
    pair.append(hanzi, syllable); $('#character-pinyin').append(pair);
  });
  appendMeaningWithPinyin($('#meaning-reading'), activeLesson.simplifiedMeaning.value, activeLesson.simplifiedMeaningPinyin.value);
  $('#english-note').textContent = activeLesson.englishNote.value;

  const image = $('#lesson-art');
  const imagePath = activeLesson.illustration.value.path;
  const resolvedImagePath = resolveAsset(imagePath);
  image.alt = imagePath ? `${text}的水墨意境插画` : '';
  image.hidden = !imagePath;
  image.onerror = () => {
    if (image.src !== resolvedImagePath) return;
    image.hidden = true;
    $('#art-caption').textContent = '本组插画暂不可用';
  };
  if (imagePath) {
    image.src = resolvedImagePath;
    $('#art-caption').textContent = '千字文意境插画';
  } else {
    image.removeAttribute('src');
    $('#art-caption').textContent = '本组插画待补';
  }

  const progress = $('#lesson-progress');
  progress.value = sequence;
  progress.setAttribute('aria-valuetext', `第 ${sequence} 组，共 ${TOTAL} 组`);
  $('#progress-label').textContent = `第 ${sequence} / ${TOTAL} 组`;
  $('#control-counter').textContent = `${sequence} / ${TOTAL}`;
  $('#lesson-jump').value = String(sequence);
  $('#jump-message').textContent = '';
  $('#previous-lesson').disabled = sequence <= 1;
  $('#next-lesson').disabled = sequence >= TOTAL;
  $('#play-audio').disabled = !activeLesson.audio.value.slow;
  $('#audio-state').textContent = activeLesson.audio.value.slow ? '点按按钮收听' : '本组录音暂不可用';
  document.title = `第 ${sequence} 组 · 千字文听读`;
  card.setAttribute('aria-busy', 'false');
}

function navigateTo(nextSequence, { focusCard = true, push = true } = {}) {
  const parsed = Number(nextSequence);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > TOTAL) return false;
  sequence = parsed;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  window.speechSynthesis?.cancel?.();
  if (push) updateAddress();
  render();
  if (focusCard) card.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return true;
}

$('#previous-lesson').addEventListener('click', () => navigateTo(sequence - 1));
$('#next-lesson').addEventListener('click', () => navigateTo(sequence + 1));
$('#jump-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const requested = Number($('#lesson-jump').value);
  if (!Number.isInteger(requested) || requested < 1 || requested > TOTAL) {
    $('#jump-message').textContent = `请输入 1 到 ${TOTAL} 之间的组号。`;
    $('#lesson-jump').setAttribute('aria-invalid', 'true');
    return;
  }
  $('#lesson-jump').removeAttribute('aria-invalid');
  navigateTo(requested);
});
$('#lesson-jump').addEventListener('input', (event) => event.currentTarget.removeAttribute('aria-invalid'));
$('#play-audio').addEventListener('click', () => {
  if (!activeLesson) return;
  void playClip({
    audioElement: audio,
    assetUrl: resolveAsset(activeLesson.audio.value.slow),
    fallbackText: activeLesson.traditionalText.value,
    speakingRate: 0.6,
    speechApi: window.speechSynthesis,
    onState: setAudioState,
  }).catch((error) => setAudioState('error', { message: error.message }));
});
window.addEventListener('popstate', () => {
  const requested = Number(new URL(location.href).searchParams.get('group'));
  navigateTo(Number.isInteger(requested) ? requested : 1, { focusCard: false, push: false });
});

try {
  const response = await fetch('../data/lessons.json');
  if (!response.ok) throw new Error('课程内容暂时无法载入，请刷新页面重试。');
  lessons = await response.json();
  if (lessons.length !== TOTAL) throw new Error(`课程数据数量不正确：当前载入 ${lessons.length} 组。`);
  const pageUrl = new URL(location.href);
  const initial = Number(pageUrl.searchParams.get('group'));
  sequence = Number.isInteger(initial) && initial >= 1 && initial <= TOTAL ? initial : 1;
  if (pageUrl.searchParams.get('group') !== String(sequence)) {
    pageUrl.searchParams.set('group', String(sequence)); history.replaceState({ sequence }, '', pageUrl);
  }
  render();
} catch (error) {
  card.setAttribute('aria-busy', 'false');
  $('#traditional-text').textContent = '暂时无法载入课程';
  $('#audio-state').textContent = error.message;
  $('#play-audio').disabled = true;
  console.error(error);
}
