import { createWritingSurface } from './writing.js';
import { detectAudioEnvironment, playClip, selectAudioAsset } from './audio.js';
import { createQuiz, answerQuiz } from './quiz.js';

const $ = (selector) => document.querySelector(selector);
const audio = $('#audio-player');
const MAX_QUIZ_QUESTIONS = 10;
let lesson; let audioManifest = null; let score = 0; let quizAttempts = 0; let quizAnswered = false; let quizRound; const writers = new Map();
const setAudioState = (state, details = {}) => {
  const messages = { idle: '點擊按鈕播放', loading: '正在啟動語音…', playing: '正在播放', ended: '播放完成；再次點擊普通話語音可重播', error: '播放失敗，請檢查音量或重試。' };
  const source = details.source === 'browser-tts' ? '（設備普通話語音）' : details.source === 'recorded-audio' ? '（標準錄音）' : '';
  $('#audio-status').textContent = state === 'error' ? `語音錯誤：${details.message ?? messages.error}` : `${messages[state] ?? state}${state === 'playing' ? source : ''}`;
};
async function speak(text, mode, index = null) {
  const assetMode = mode === 'quiz' ? 'character' : mode;
  const url = selectAudioAsset(audioManifest, assetMode, index);
  try { await playClip({ audioElement: audio, assetUrl: url, fallbackText: text, speakingRate: mode === 'slow' ? 0.72 : 1, speechApi: window.speechSynthesis, onState: setAudioState }); }
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
  if (quizAttempts >= MAX_QUIZ_QUESTIONS) {
    $('#quiz-progress').textContent = `已完成 ${MAX_QUIZ_QUESTIONS} / ${MAX_QUIZ_QUESTIONS} 題`;
    $('#quiz-play').disabled = true;
    $('#quiz-next').disabled = true;
    return;
  }
  quizRound = createQuiz([lesson], 'page');
  quizAnswered = false;
  $('#quiz-progress').textContent = `第 ${quizAttempts + 1} / ${MAX_QUIZ_QUESTIONS} 題`;
  $('#quiz-feedback').textContent = '';
  $('#quiz-play').disabled = false;
  $('#quiz-next').disabled = true;
  const options = $('#quiz-options'); options.replaceChildren();
  quizRound.options.forEach((option) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = option.character;
    button.setAttribute('aria-label', `选择${option.character}`);
    button.addEventListener('click', () => {
      if (quizAnswered || quizAttempts >= MAX_QUIZ_QUESTIONS) return;
      quizAnswered = true;
      quizAttempts += 1;
      const result = answerQuiz(quizRound, option.id, score); score = result.score;
      const finished = quizAttempts >= MAX_QUIZ_QUESTIONS;
      $('#score').textContent = String(score);
      const finalFeedback = result.correct ? '答對了。' : `答錯了，正確答案是「${quizRound.answer.character}」。`;
      $('#quiz-feedback').textContent = finished ? `${finalFeedback}本局 ${MAX_QUIZ_QUESTIONS} 題已完成，最終積分：${score}。` : result.feedback;
      if (finished) $('#quiz-progress').textContent = `已完成 ${MAX_QUIZ_QUESTIONS} / ${MAX_QUIZ_QUESTIONS} 題`;
      [...options.children].forEach((item) => { item.disabled = true; });
      $('#quiz-next').disabled = finished;
      $('#quiz-play').disabled = finished;
    });
    options.append(button);
  });
}

try {
  try { const manifestResponse = await fetch('data/audio-manifest.json'); if (manifestResponse.ok) audioManifest = await manifestResponse.json(); } catch { audioManifest = null; }
  const response = await fetch('data/lessons.json'); if (!response.ok) throw new Error('教學內容無法載入。');
  lesson = (await response.json())[0];
  $('#traditional-text').textContent = lesson.traditionalText.value;
  $('#meaning').textContent = lesson.simplifiedMeaning.value;
  $('#meaning-pinyin').textContent = lesson.simplifiedMeaningPinyin.value;
  $('#english-note').textContent = lesson.englishNote.value;
  $('#illustration').src = lesson.illustration.value.path;
  drawPinyin();
  lesson.traditionalText.value.split('').forEach((character, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = character;
    button.setAttribute('aria-label', `播放${character}`); button.addEventListener('click', () => speak(character, 'character', index)); $('#char-audio').append(button);
  });
  $('#play-slow').addEventListener('click', () => speak(lesson.traditionalText.value, 'slow'));
  $('#mode-trace').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('trace')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-free').setAttribute('aria-pressed','false'); });
  $('#mode-free').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('free')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-trace').setAttribute('aria-pressed','false'); });
  $('#clear-writing').addEventListener('click', () => writers.forEach((writer) => writer.clear()));
  $('#quiz-play').addEventListener('click', () => { const index = [...lesson.traditionalText.value].indexOf(quizRound.answer.character); speak(quizRound.answer.character, 'quiz', index); });
  $('#quiz-next').addEventListener('click', renderQuiz);
  await buildWriting(); renderQuiz();
  const env = detectAudioEnvironment({ userAgent: navigator.userAgent, protocol: location.protocol, speechApi: window.speechSynthesis });
  if (env.androidChrome && audioManifest?.generationStatus !== 'generated') {
    $('#audio-status').textContent = env.mandarinVoiceAvailable
      ? '目前使用手機內建普通話語音；點擊播放。'
      : '未檢測到手機普通話語音。點擊播放後會顯示備用音訊錯誤。';
  }
  $('#lesson').setAttribute('aria-busy', 'false');
} catch (error) {
  $('#lesson').setAttribute('aria-busy', 'false');
  $('#audio-status').textContent = error.message;
  $('#writing-status').textContent = '描紅資料載入失敗，請重新整理頁面。';
  console.error(error);
}
