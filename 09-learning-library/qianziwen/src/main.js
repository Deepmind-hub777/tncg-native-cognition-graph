import { createWritingSurface } from './writing.js';
import { detectAudioEnvironment, pauseClip, playClip, resolveAudioClip } from './audio.js';
import { createQuiz, answerQuiz } from './quiz.js';

const $ = (selector) => document.querySelector(selector);
const audio = $('#audio-player');
let lesson; let activeClip = null; let score = 0; let quizRound; const writers = new Map();
const setAudioState = (state) => {
  const messages = { idle: '點擊按鈕播放', loading: '正在載入語音…', playing: '正在播放', paused: '已暫停', ended: '播放完成，可重播', error: '播放失敗，請檢查音量或重試。' };
  $('#audio-status').textContent = messages[state] ?? state;
};
async function speak(text, mode, index = null) {
  activeClip = { text, mode, index };
  const url = mode === 'quiz' ? resolveAudioClip(lesson.sequence, 'character', index) : resolveAudioClip(lesson.sequence, mode, index);
  try { await playClip({ audioElement: audio, assetUrl: url, fallbackText: text, speechApi: window.speechSynthesis, onState: setAudioState }); }
  catch (error) { $('#audio-status').textContent = error.message; }
}

function drawPinyin() {
  const list = $('#pinyin-list'); list.replaceChildren();
  [...lesson.traditionalText.value].forEach((character, index) => {
    const item = document.createElement('span'); item.className = 'pinyin-item';
    const hanzi = document.createElement('span'); hanzi.className = 'hanzi'; hanzi.textContent = character;
    const syllable = document.createElement('span'); syllable.className = 'syllable'; syllable.textContent = lesson.pinyin.value[index];
    item.append(hanzi, syllable); list.append(item);
  });
}

async function buildWriting() {
  const grid = $('#writing-grid'); const characters = [...lesson.traditionalText.value];
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i], code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    const response = await fetch(`data/strokes/${code}.json`);
    if (!response.ok) throw new Error(`筆順資料載入失敗：${character}`);
    const strokeData = await response.json();
    const card = document.createElement('article'); card.className = 'writing-card';
    const label = document.createElement('h3'); label.textContent = `${character} · ${lesson.pinyin.value[i]}`;
    const stage = document.createElement('div'); stage.className = 'writing-stage'; stage.setAttribute('aria-label', `${character}描紅區`);
    const guide = document.createElement('div'); guide.className = 'stroke-guide';
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `${character}手寫畫布`); canvas.setAttribute('role', 'img');
    stage.append(guide, canvas);
    const animate = document.createElement('button'); animate.className = 'animate-stroke'; animate.type = 'button'; animate.textContent = '播放筆順'; animate.addEventListener('click', () => writers.get(character)?.animate());
    card.append(label, stage, animate); grid.append(card);
    writers.set(character, createWritingSurface({ root: stage, character, strokeData }));
  }
}

function renderQuiz() {
  quizRound = createQuiz([lesson], 'page');
  $('#quiz-next').disabled = true;
  const options = $('#quiz-options'); options.replaceChildren();
  quizRound.options.forEach((option) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = option.character;
    button.setAttribute('aria-label', `选择${option.character}`);
    button.addEventListener('click', () => {
      const result = answerQuiz(quizRound, option.id, score); score = result.score;
      $('#score').textContent = String(score); $('#quiz-feedback').textContent = result.feedback;
      [...options.children].forEach((item) => { item.disabled = true; });
      $('#quiz-next').disabled = false;
    });
    options.append(button);
  });
}

try {
  const response = await fetch('data/lessons.json'); if (!response.ok) throw new Error('教學內容無法載入。');
  lesson = (await response.json())[0];
  $('#traditional-text').textContent = lesson.traditionalText.value;
  $('#meaning').textContent = lesson.simplifiedMeaning.value;
  $('#english-note').textContent = lesson.englishNote.value;
  $('#illustration').src = lesson.illustration.value.path;
  drawPinyin();
  lesson.traditionalText.value.split('').forEach((character, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = character;
    button.setAttribute('aria-label', `播放${character}`); button.addEventListener('click', () => speak(character, 'character', index)); $('#char-audio').append(button);
  });
  $('#play-normal').addEventListener('click', () => speak(lesson.traditionalText.value, 'normal'));
  $('#play-slow').addEventListener('click', () => speak(lesson.traditionalText.value, 'slow'));
  $('#pause-audio').addEventListener('click', () => pauseClip(audio, window.speechSynthesis, setAudioState));
  $('#repeat-audio').addEventListener('click', () => activeClip && speak(activeClip.text, activeClip.mode, activeClip.index));
  $('#mode-trace').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('trace')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-free').setAttribute('aria-pressed','false'); });
  $('#mode-free').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('free')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-trace').setAttribute('aria-pressed','false'); });
  let guideVisible = true;
  $('#toggle-guide').addEventListener('click', (event) => { guideVisible = !guideVisible; writers.forEach((writer) => writer.setGuideVisible(guideVisible)); event.currentTarget.textContent = guideVisible ? '隱藏范字' : '顯示范字'; event.currentTarget.setAttribute('aria-pressed',String(guideVisible)); });
  $('#clear-writing').addEventListener('click', () => writers.forEach((writer) => writer.clear()));
  $('#undo-writing').addEventListener('click', () => writers.forEach((writer) => writer.undo()));
  $('#quiz-play').addEventListener('click', () => { const index = [...lesson.traditionalText.value].indexOf(quizRound.answer.character); speak(quizRound.answer.character, 'quiz', index); });
  $('#quiz-next').addEventListener('click', renderQuiz);
  await buildWriting(); renderQuiz();
  const env = detectAudioEnvironment({ userAgent: navigator.userAgent, protocol: location.protocol, speechApi: window.speechSynthesis });
  if (env.androidChrome) $('#audio-status').textContent = 'Android Chrome 已就緒，點擊按鈕播放。';
  $('#lesson').setAttribute('aria-busy', 'false');
} catch (error) {
  $('#lesson').setAttribute('aria-busy', 'false');
  $('#audio-status').textContent = error.message;
  $('#writing-status').textContent = '描紅資料載入失敗，請重新整理頁面。';
  console.error(error);
}
