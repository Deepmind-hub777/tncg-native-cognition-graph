import { createWritingSurface } from './writing.js';
import { detectAudioEnvironment, playClip } from './audio.js';
import { createQuiz, answerQuiz } from './quiz.js';
import { getPageCount, getPageEntries } from './pagination.js';

const $ = (selector) => document.querySelector(selector);
const audio = $('#audio-player');
const MAX_QUIZ_QUESTIONS = 10;
let lessons = []; let lesson; let activePage = 1;
let score = 0; let quizAttempts = 0; let quizAnswered = false; let quizRound;
const writers = new Map();

const setAudioState = (state, details = {}) => {
  const messages = { idle: '點擊按鈕播放', loading: '正在啟動語音…', playing: '正在播放', ended: '播放完成；再次點擊普通話語音可重播', error: '播放失敗，請檢查音量或重試。' };
  const source = details.source === 'browser-tts' ? '（設備普通話語音）' : details.source === 'recorded-audio' ? '（標準錄音）' : '';
  $('#audio-status').textContent = state === 'error' ? `語音錯誤：${details.message ?? messages.error}` : `${messages[state] ?? state}${state === 'playing' ? source : ''}`;
};

function speak(text, mode, index = null) {
  const value = lesson.audio.value;
  const url = mode === 'character' || mode === 'quiz' ? value.characters?.[index] : value.slow;
  void playClip({ audioElement: audio, assetUrl: url, fallbackText: text, speakingRate: 0.72, speechApi: window.speechSynthesis, onState: setAudioState })
    .catch((error) => { $('#audio-status').textContent = error.message; });
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

function drawMeaningReading() {
  const target = $('#meaning-reading'); target.replaceChildren();
  [...lesson.simplifiedMeaning.value].forEach((character, index) => {
    const pinyin = lesson.simplifiedMeaningPinyin.value[index];
    if (!pinyin) { target.append(document.createTextNode(character)); return; }
    const ruby = document.createElement('ruby'); ruby.append(document.createTextNode(character));
    const annotation = document.createElement('rt'); annotation.textContent = pinyin; ruby.append(annotation); target.append(ruby);
  });
}

function renderLessonTabs() {
  const tabs = $('#page-groups'); tabs.replaceChildren();
  const pageLessons = getPageEntries(lessons, activePage);
  pageLessons.forEach((entry, index) => {
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-current', String(entry.id === lesson.id)); button.setAttribute('aria-controls', 'lesson');
    button.textContent = `${entry.sequence} · ${entry.traditionalText.value}`;
    button.title = `${entry.sequence} · ${entry.traditionalText.value}`;
    button.addEventListener('click', () => { lesson = entry; updateLocation(); void renderLesson(); }); tabs.append(button);
  });
  const pageCount = getPageCount(lessons.length);
  $('#page-indicator').textContent = `第 ${activePage} / ${pageCount} 頁`;
  $('#page-eyebrow').textContent = `古典文字 · 第 ${activePage} 頁`;
  $('#page-select').value = String(activePage);
  $('#page-prev').disabled = activePage <= 1; $('#page-first').disabled = activePage <= 1;
  $('#page-next').disabled = activePage >= pageCount; $('#page-last').disabled = activePage >= pageCount;
}

function renderPageSelect() {
  const select = $('#page-select'); select.replaceChildren();
  const pageCount = getPageCount(lessons.length);
  for (let page = 1; page <= pageCount; page++) {
    const option = document.createElement('option'); option.value = String(page); option.textContent = `第 ${page} 頁`; select.append(option);
  }
}

async function buildWriting() {
  writers.forEach((writer) => writer.destroy()); writers.clear();
  const grid = $('#writing-grid'); grid.replaceChildren();
  const characters = [...lesson.traditionalText.value]; const missing = [];
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i], code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    const response = await fetch(`data/strokes/${code}.json`);
    if (!response.ok) { missing.push(character); continue; }
    const strokeData = await response.json();
    const card = document.createElement('article'); card.className = 'writing-card';
    const label = document.createElement('h3'); label.textContent = `${character} · ${lesson.pinyin.value[i]}`;
    const stage = document.createElement('div'); stage.className = 'writing-stage'; stage.setAttribute('aria-label', `${character}描紅區`);
    const guide = document.createElement('div'); guide.className = 'stroke-guide';
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `${character}手寫畫布`); canvas.setAttribute('role', 'img');
    stage.append(guide, canvas);
    const animate = document.createElement('button'); animate.className = 'animate-stroke'; animate.type = 'button'; animate.textContent = '播放筆順';
    animate.addEventListener('click', () => writers.get(character)?.animate());
    card.append(label, stage, animate); grid.append(card);
    writers.set(character, createWritingSurface({ root: stage, character, strokeData }));
  }
  const hasWriting = writers.size > 0;
  $('.writing-toolbar').hidden = !hasWriting;
  $('#writing-status').textContent = missing.length
    ? `標準筆順資料待補，本組暫有 ${writers.size} 個字可描寫；尚未啟用：${missing.join('、')}`
    : '標準筆順資料待校訂';
}

function renderQuiz() {
  if (quizAttempts >= MAX_QUIZ_QUESTIONS) {
    $('#quiz-progress').textContent = `已完成 ${MAX_QUIZ_QUESTIONS} / ${MAX_QUIZ_QUESTIONS} 題`;
    $('#quiz-play').disabled = true; $('#quiz-next').disabled = true; return;
  }
  quizRound = createQuiz([lesson], 'page'); quizAnswered = false;
  $('#quiz-progress').textContent = `第 ${quizAttempts + 1} / ${MAX_QUIZ_QUESTIONS} 題`;
  $('#quiz-feedback').textContent = ''; $('#quiz-play').disabled = false; $('#quiz-next').disabled = true;
  const options = $('#quiz-options'); options.replaceChildren();
  quizRound.options.forEach((option) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = option.character;
    button.setAttribute('aria-label', `選擇${option.character}`);
    button.addEventListener('click', () => {
      if (quizAnswered || quizAttempts >= MAX_QUIZ_QUESTIONS) return;
      quizAnswered = true; quizAttempts += 1;
      const result = answerQuiz(quizRound, option.id, score); score = result.score;
      const finished = quizAttempts >= MAX_QUIZ_QUESTIONS; $('#score').textContent = String(score);
      const finalFeedback = result.correct ? '答對了。' : `答錯了，正確答案是「${quizRound.answer.character}」。`;
      $('#quiz-feedback').textContent = finished ? `${finalFeedback}本局 ${MAX_QUIZ_QUESTIONS} 題已完成，最終積分：${score}。` : result.feedback;
      if (finished) $('#quiz-progress').textContent = `已完成 ${MAX_QUIZ_QUESTIONS} / ${MAX_QUIZ_QUESTIONS} 題`;
      [...options.children].forEach((item) => { item.disabled = true; });
      $('#quiz-next').disabled = finished; $('#quiz-play').disabled = finished;
    });
    options.append(button);
  });
}

async function renderLesson() {
  $('#lesson').setAttribute('aria-busy', 'true');
  renderLessonTabs();
  $('#traditional-text').textContent = lesson.traditionalText.value;
  document.title = `千字文 · 第 ${lesson.sequence} 組`;
  $('#review-badge').textContent = `第 ${lesson.sequence} 組內容待校訂`;
  drawMeaningReading(); drawPinyin();
  $('#pinyin-status').textContent = lesson.pinyin.status === 'needs_review' ? '拼音待校訂' : '';
  $('#meaning-status').textContent = lesson.simplifiedMeaning.status === 'needs_review' ? '釋義待校訂' : '';
  $('#english-note').textContent = lesson.englishNote.value;
  $('#english-status').textContent = lesson.englishNote.status === 'needs_review' ? '英文注解待校訂' : '';
  const illustration = lesson.illustration.value;
  const image = $('#illustration'); const caption = $('#illustration-caption');
  if (illustration.path) { image.hidden = false; image.src = illustration.path; image.alt = `${lesson.traditionalText.value}意境插畫`; caption.textContent = illustration.prompt; }
  else { image.hidden = true; image.removeAttribute('src'); caption.textContent = '意境插畫待製作。'; }
  const characters = [...lesson.traditionalText.value]; const audioButtons = $('#char-audio'); audioButtons.replaceChildren();
  characters.forEach((character, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = character;
    button.setAttribute('aria-label', `播放${character}`); button.addEventListener('click', () => speak(character, 'character', index)); audioButtons.append(button);
  });
  $('#play-slow').onclick = () => speak(lesson.traditionalText.value, 'slow');
  const tabs = $('#page-groups'); [...tabs.children].forEach((button, index) => { button.setAttribute('aria-current', String(getPageEntries(lessons, activePage)[index].id === lesson.id)); });
  await buildWriting(); renderQuiz(); $('#lesson').setAttribute('aria-busy', 'false');
}

function updateLocation(push = true) {
  const url = new URL(location.href); url.searchParams.set('page', String(activePage)); url.searchParams.set('group', String(lesson.sequence));
  if (push) history.pushState({ page: activePage, group: lesson.sequence }, '', url);
  else history.replaceState({ page: activePage, group: lesson.sequence }, '', url);
}

function changePage(page, push = true) {
  const pageCount = getPageCount(lessons.length); activePage = Math.max(1, Math.min(pageCount, page));
  lesson = getPageEntries(lessons, activePage)[0]; updateLocation(push); void renderLesson();
}

function restoreLocation() {
  const requestedPage = Number(new URL(location.href).searchParams.get('page'));
  const requestedSequence = Number(new URL(location.href).searchParams.get('group'));
  const pageCount = getPageCount(lessons.length);
  activePage = Math.max(1, Math.min(pageCount, Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1));
  const pageLessons = getPageEntries(lessons, activePage);
  lesson = pageLessons.find((entry) => entry.sequence === requestedSequence) ?? pageLessons[0];
  void renderLesson();
}

try {
  const response = await fetch('data/lessons.json'); if (!response.ok) throw new Error('教學內容無法載入。');
  lessons = await response.json(); lesson = lessons[0];
  const initialUrl = new URL(location.href); const requestedPage = Number(initialUrl.searchParams.get('page')); const requestedGroup = Number(initialUrl.searchParams.get('group'));
  if (Number.isInteger(requestedPage) && requestedPage > 0) {
    activePage = Math.min(getPageCount(lessons.length), requestedPage);
    lesson = getPageEntries(lessons, activePage).find((entry) => entry.sequence === requestedGroup) ?? getPageEntries(lessons, activePage)[0];
  } else updateLocation(false);
  renderPageSelect(); window.addEventListener('popstate', restoreLocation);
  $('#page-first').addEventListener('click', () => changePage(1)); $('#page-prev').addEventListener('click', () => changePage(activePage - 1));
  $('#page-next').addEventListener('click', () => changePage(activePage + 1)); $('#page-last').addEventListener('click', () => changePage(getPageCount(lessons.length)));
  $('#page-select').addEventListener('change', (event) => changePage(Number(event.currentTarget.value)));
  $('#mode-trace').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('trace')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-free').setAttribute('aria-pressed','false'); });
  $('#mode-free').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('free')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-free').setAttribute('aria-pressed','true'); $('#mode-trace').setAttribute('aria-pressed','false'); });
  $('#clear-writing').addEventListener('click', () => writers.forEach((writer) => writer.clear()));
  $('#quiz-play').addEventListener('click', () => { const index = [...lesson.traditionalText.value].indexOf(quizRound.answer.character); speak(quizRound.answer.character, 'quiz', index); });
  $('#quiz-next').addEventListener('click', renderQuiz);
  await renderLesson();
  const env = detectAudioEnvironment({ userAgent: navigator.userAgent, protocol: location.protocol, speechApi: window.speechSynthesis });
  if (env.androidChrome && lessons.length > 1) $('#audio-status').textContent = '點擊普通話語音播放；尚未製作的錄音會使用手機普通話語音。';
} catch (error) {
  $('#lesson').setAttribute('aria-busy', 'false'); $('#audio-status').textContent = error.message;
  $('#writing-status').textContent = '描紅資料載入失敗，請重新整理頁面。'; console.error(error);
}
