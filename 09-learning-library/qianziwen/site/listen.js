import { playClip } from '../src/audio.js';
import { markSeen, lastSeen } from '../src/progress.js?v=1';

const $ = (selector) => document.querySelector(selector);
const TOTAL = 250;
const card = $('#lesson-card');
const audio = $('#audio-player');
let lessons = [];
let sequence = 1;
let activeLesson;

// 状态只在出错或改用设备语音时显示一行小字
function setAudioState(state, details = {}) {
  const el = $('#audio-state');
  if (state === 'error') { el.textContent = `播放失败：${details.message ?? '语音播放失败。'}`; stopReading(); return; }
  if (state === 'ended') { el.textContent = ''; stopReading(); return; }
  el.textContent = state === 'playing' && details.source === 'browser-tts' ? '（使用设备普通话语音）' : '';
}

// 慢速朗读时逐字高亮（每字起始秒数见 data/slow-timing.json；缺资料时平均分）
let slowTiming = {};
fetch(new URL('../data/slow-timing.json?v=1', import.meta.url)).then((r) => (r.ok ? r.json() : {})).then((d) => { slowTiming = d; }).catch(() => {});
let readingRaf = 0;
function markReading(index) {
  document.querySelectorAll('#character-pinyin [data-ci]').forEach((el) => el.classList.toggle('is-reading', Number(el.dataset.ci) === index));
}
function stopReading() { cancelAnimationFrame(readingRaf); readingRaf = 0; markReading(-1); $('#play-audio').classList.remove('is-playing'); }
function followLine(url) {
  const marks = slowTiming[String(sequence)]; const count = [...activeLesson.traditionalText.value].length;
  const tick = () => {
    if (audio.src !== url) { stopReading(); return; }
    const t = audio.currentTime; let index = 0;
    if (Array.isArray(marks) && marks.length === count + 1) { for (let k = 0; k < count; k += 1) if (t >= marks[k] - 0.04) index = k; }
    else if (audio.duration > 0) index = Math.min(count - 1, Math.floor((t / audio.duration) * count));
    markReading(index); readingRaf = requestAnimationFrame(tick);
  };
  tick();
}
function play(mode, index = null) {
  if (!activeLesson) return;
  stopReading();
  const value = activeLesson.audio.value;
  const url = resolveAsset(mode === 'slow' ? value.slow : value.characters?.[index]);
  const text = mode === 'slow' ? activeLesson.traditionalText.value : [...activeLesson.traditionalText.value][index];
  const playing = playClip({ audioElement: audio, assetUrl: url, fallbackText: text, speakingRate: 0.6, speechApi: window.speechSynthesis, onState: setAudioState });
  if (mode === 'slow') { $('#play-audio').classList.add('is-playing'); if (url) followLine(url); }
  else markReading(index);
  void playing.catch((error) => setAudioState('error', { message: error.message }));
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
  $('#lesson-index').textContent = `第 ${sequence} 组`; markSeen(sequence);
  $('#traditional-text').textContent = text;
  $('#character-pinyin').replaceChildren(); stopReading();
  characters.forEach((character, index) => {
    const pair = document.createElement('button'); pair.type = 'button'; pair.className = 'pinyin-pair'; pair.dataset.ci = String(index);
    pair.setAttribute('aria-label', `朗读「${character}」${activeLesson.pinyin.value[index] ?? ''}`);
    pair.addEventListener('click', () => play('character', index));
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
  $('#control-counter').setAttribute('aria-label', `第 ${sequence} 组，共 ${TOTAL} 组；点按跳至其他组`);
  $('#control-counter').textContent = `${sequence} / ${TOTAL}`;
  $('#lesson-jump').value = String(sequence);
  $('#jump-message').textContent = '';
  $('#previous-lesson').disabled = sequence <= 1;
  $('#next-lesson').disabled = sequence >= TOTAL;
  $('#play-audio').disabled = !activeLesson.audio.value.slow;
  $('#audio-state').textContent = activeLesson.audio.value.slow ? '' : '本组录音暂不可用';
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
  window.scrollTo({ top: 0 });
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
  closeJump(); navigateTo(requested);
});
$('#lesson-jump').addEventListener('input', (event) => event.currentTarget.removeAttribute('aria-invalid'));
$('#play-audio').addEventListener('click', () => play('slow'));
// 点底栏「N / 250」打开跳组小窗
const jumpDialog = $('#jump-dialog');
function closeJump() { if (jumpDialog.open) jumpDialog.close(); }
$('#control-counter').addEventListener('click', () => {
  $('#lesson-jump').value = String(sequence); $('#jump-message').textContent = '';
  if (typeof jumpDialog.showModal === 'function') jumpDialog.showModal(); else jumpDialog.setAttribute('open', '');
  $('#lesson-jump').focus(); $('#lesson-jump').select();
});
$('#jump-close').addEventListener('click', closeJump);
jumpDialog.addEventListener('click', (event) => { if (event.target === jumpDialog) closeJump(); });
window.addEventListener('popstate', () => {
  const requested = Number(new URL(location.href).searchParams.get('group'));
  navigateTo(Number.isInteger(requested) ? requested : 1, { focusCard: false, push: false });
});

try {
  const response = await fetch('../data/lessons.json?v=2');
  if (!response.ok) throw new Error('课程内容暂时无法载入，请刷新页面重试。');
  lessons = await response.json();
  if (lessons.length !== TOTAL) throw new Error(`课程数据数量不正确：当前载入 ${lessons.length} 组。`);
  const pageUrl = new URL(location.href);
  const initial = pageUrl.searchParams.has('group') ? Number(pageUrl.searchParams.get('group')) : (lastSeen() ?? 1);
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
