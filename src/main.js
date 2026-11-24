import { createWritingSurface } from './writing.js';
import { detectAudioEnvironment, playClip } from './audio.js';
import { createQuiz, answerQuiz } from './quiz.js';
import { getPageCount, getPageEntries } from './pagination.js';
import { renderHubLinks, LINKS_ANCHOR } from './hub-links.js?v=4';
import { markSeen, recordQuiz, lastSeen } from './progress.js?v=1';

const $ = (selector) => document.querySelector(selector);
const audio = $('#audio-player');
const MAX_QUIZ_QUESTIONS = 10;
let lessons = []; let lesson; let activePage = 1;
let score = 0; let quizAttempts = 0; let quizAnswered = false; let quizRound;
const writers = new Map();
let strokeGaps = new Set();
const strokeGapsReady = fetch('data/stroke-gaps.json').then((r) => (r.ok ? r.json() : {})).then((d) => { strokeGaps = new Set(d.codepoints ?? []); }).catch(() => {});

const setAudioState = (state, details = {}) => {
  const messages = { idle: '點擊按鈕播放', loading: '正在啟動語音…', playing: '正在播放', ended: '播放完成；再次點擊慢速朗讀可重播', error: '播放失敗，請檢查音量或重試。' };
  const source = details.source === 'browser-tts' ? '（設備普通話語音）' : details.source === 'recorded-audio' ? '（標準錄音）' : '';
  $('#audio-status').textContent = state === 'error' ? `語音錯誤：${details.message ?? messages.error}` : `${messages[state] ?? state}${state === 'playing' ? source : ''}`;
};

function speak(text, mode, index = null) {
  chainToken += 1;
  const value = lesson.audio.value;
  const url = mode === 'character' || mode === 'quiz' ? value.characters?.[index] : value.slow;
  void playClip({ audioElement: audio, assetUrl: url, fallbackText: text, speakingRate: 0.6, speechApi: window.speechSynthesis, onState: setAudioState })
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
    await strokeGapsReady;
    const response = strokeGaps.has(code) ? { ok: false } : await fetch(`data/strokes/${code}.json`);
    if (!response.ok) {
      missing.push(character);
      const card = document.createElement('article'); card.className = 'writing-card writing-placeholder';
      const label = document.createElement('h3'); label.textContent = `${character} · ${lesson.pinyin.value[i]}`;
      const stage = document.createElement('div'); stage.className = 'writing-stage writing-placeholder-stage';
      stage.setAttribute('aria-label', `${character}字形展示，筆順資料待補`);
      const glyph = document.createElement('span'); glyph.className = 'placeholder-glyph'; glyph.textContent = character;
      stage.append(glyph);
      const note = document.createElement('p'); note.className = 'placeholder-note'; note.textContent = '異體字形 · 筆順資料待補，可對照課本臨寫';
      card.append(label, stage, note); grid.append(card);
      continue;
    }
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
    ? `本組 ${writers.size} 字可描寫；異體字形筆順資料待補：${missing.join('、')}`
    : '標準筆順資料待校訂';
}

/* 聽音辨字的聲音提示（汉字学园）：所有聲音都由點擊觸發，並與朗讀共用同一個 <audio>，手機上不會被自動播放策略擋住。 */
const CUE = (name) => `assets/audio/cues/${name}.mp3`;
let chainToken = 0; let quizHeard = false; let promptPlayed = false;
function playChain(urls, then) {
  const token = ++chainToken; window.speechSynthesis?.cancel?.();
  let i = 0;
  const next = () => {
    if (token !== chainToken) return;
    if (i >= urls.length) { audio.onended = null; audio.onerror = null; then?.(); return; }
    audio.onended = next; audio.onerror = next;
    audio.src = urls[i++]; audio.currentTime = 0;
    audio.play().catch(() => { if (token === chainToken) next(); });
  };
  next();
}
function playQuizAnswer() {
  const index = [...lesson.traditionalText.value].indexOf(quizRound.answer.character);
  quizHeard = true; speak(quizRound.answer.character, 'quiz', index);
}
function cueButton(id) {
  ['#quiz-play', '#quiz-next'].forEach((sel) => $(sel).classList.toggle('cue-pulse', sel === id));
}
function quizHint(text) { $('#quiz-hint').textContent = text; }

function renderQuiz() {
  const finishedAll = quizAttempts >= MAX_QUIZ_QUESTIONS;
  const nextButton = $('#quiz-next');
  if (finishedAll) {
    $('#quiz-progress').textContent = `已完成 ${MAX_QUIZ_QUESTIONS} / ${MAX_QUIZ_QUESTIONS} 題`;
    $('#quiz-play').disabled = true; nextButton.disabled = false; nextButton.textContent = '再來一局'; cueButton('#quiz-next');
    return;
  }
  nextButton.textContent = '下一題';
  quizRound = createQuiz([lesson], 'page'); quizAnswered = false; quizHeard = false;
  $('#quiz-progress').textContent = `第 ${quizAttempts + 1} / ${MAX_QUIZ_QUESTIONS} 題`;
  $('#quiz-feedback').textContent = ''; $('#quiz-play').disabled = false; nextButton.disabled = true;
  cueButton('#quiz-play'); quizHint('點「播放題目」，聽一聽，再選出你聽到的字。');
  const options = $('#quiz-options'); options.replaceChildren();
  quizRound.options.forEach((option) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = option.character;
    button.setAttribute('aria-label', `選擇${option.character}`); button.dataset.id = option.id;
    button.addEventListener('click', () => {
      if (quizAnswered || quizAttempts >= MAX_QUIZ_QUESTIONS) return;
      if (!quizHeard) { cueButton('#quiz-play'); quizHint('先點「播放題目」聽一聽。'); playChain([CUE('vo-play')]); return; }
      quizAnswered = true; quizAttempts += 1;
      const result = answerQuiz(quizRound, option.id, score); score = result.score;
      const finished = quizAttempts >= MAX_QUIZ_QUESTIONS; $('#score').textContent = String(score);
      const finalFeedback = result.correct ? '答對了。' : `答錯了，正確答案是「${quizRound.answer.character}」。`;
      $('#quiz-feedback').textContent = finished ? `${finalFeedback}本局 ${MAX_QUIZ_QUESTIONS} 題已完成，最終積分：${score}。` : result.feedback;
      [...options.children].forEach((item) => {
        item.disabled = true;
        if (item.dataset.id === quizRound.answer.id) item.classList.add('is-correct');
        else if (item === button) item.classList.add('is-wrong');
      });
      $('#quiz-play').disabled = finished;
      if (finished) {
        recordQuiz(activePage, score);
        $('#quiz-progress').textContent = `已完成 ${MAX_QUIZ_QUESTIONS} / ${MAX_QUIZ_QUESTIONS} 題`;
        nextButton.textContent = '再來一局'; nextButton.disabled = false; cueButton('#quiz-next');
        quizHint('全部完成，真棒！點「再來一局」可以重新開始。');
        playChain([CUE(result.correct ? 'correct' : 'wrong'), CUE('vo-done')]);
      } else if (result.correct) {
        nextButton.disabled = false; cueButton('#quiz-next'); quizHint('答對了！點「下一題」繼續。');
        playChain([CUE('correct'), CUE('vo-correct')]);
      } else {
        nextButton.disabled = false; cueButton('#quiz-next'); quizHint(`再聽一次：正確答案是「${quizRound.answer.character}」。記住它，再點「下一題」。`);
        playChain([CUE('wrong'), CUE('vo-wrong')], playQuizAnswer);
      }
    });
    options.append(button);
  });
}

function onQuizPlay() {
  if (!quizRound || $('#quiz-play').disabled) return;
  if (!quizAnswered) { cueButton(null); quizHint('選出你聽到的字；沒聽清楚可以再點「播放題目」。'); }
  if (!promptPlayed) { promptPlayed = true; playChain([CUE('vo-prompt')], playQuizAnswer); }
  else playQuizAnswer();
}

function onQuizNext() {
  if (quizAttempts >= MAX_QUIZ_QUESTIONS) { score = 0; quizAttempts = 0; $('#score').textContent = '0'; renderQuiz(); cueButton(null); playChain([CUE('page'), CUE('vo-prompt')], playQuizAnswer); quizHint('選出你聽到的字；沒聽清楚可以再點「播放題目」。'); return; }
  renderQuiz(); cueButton(null); quizHint('選出你聽到的字；沒聽清楚可以再點「播放題目」。');
  playChain([CUE('page')], playQuizAnswer);
}

async function renderLesson() {
  $('#lesson').setAttribute('aria-busy', 'true');
  renderLessonTabs();
  $('#traditional-text').textContent = lesson.traditionalText.value;
  document.title = `千字文 · 第 ${lesson.sequence} 組`; markSeen(lesson.sequence);
  $('#review-badge').textContent = `第 ${lesson.sequence} 組內容待校訂`;
  drawMeaningReading(); drawPinyin();
  void renderHubLinks($('#hub-links'), [...lesson.traditionalText.value], lesson.pinyin.value, { page: activePage, group: lesson.sequence }).then(scrollToLinksIfAsked);
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

// 从拼词园回来（网址带 #zi-jiazu）：内容画好后滚到「字的家族」，只滚一次
let pendingAnchor = location.hash === `#${LINKS_ANCHOR}`;
function scrollToLinksIfAsked() {
  if (!pendingAnchor) return; pendingAnchor = false;
  requestAnimationFrame(() => document.getElementById(LINKS_ANCHOR)?.scrollIntoView({ block: 'start' }));
}

function updateLocation(push = true) {
  const url = new URL(location.href); url.hash = ''; url.searchParams.set('page', String(activePage)); url.searchParams.set('group', String(lesson.sequence));
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
  pendingAnchor = location.hash === `#${LINKS_ANCHOR}`;
  void renderLesson();
}

try {
  const response = await fetch('data/lessons.json'); if (!response.ok) throw new Error('教學內容無法載入。');
  lessons = await response.json(); lesson = lessons[0];
  const initialUrl = new URL(location.href); const requestedPage = Number(initialUrl.searchParams.get('page')); const requestedGroup = Number(initialUrl.searchParams.get('group'));
  if (Number.isInteger(requestedPage) && requestedPage > 0) {
    activePage = Math.min(getPageCount(lessons.length), requestedPage);
    lesson = getPageEntries(lessons, activePage).find((entry) => entry.sequence === requestedGroup) ?? getPageEntries(lessons, activePage)[0];
  } else {
    // 正常进入（没带页码）：回到上次看到的那一组
    const last = lastSeen(); const at = last ? lessons.findIndex((entry) => entry.sequence === last) : -1;
    if (at >= 0) { activePage = Math.floor(at / 4) + 1; lesson = lessons[at]; }
    updateLocation(false);
  }
  renderPageSelect(); window.addEventListener('popstate', restoreLocation);
  $('#page-first').addEventListener('click', () => changePage(1)); $('#page-prev').addEventListener('click', () => changePage(activePage - 1));
  $('#page-next').addEventListener('click', () => changePage(activePage + 1)); $('#page-last').addEventListener('click', () => changePage(getPageCount(lessons.length)));
  $('#page-select').addEventListener('change', (event) => changePage(Number(event.currentTarget.value)));
  $('#mode-trace').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('trace')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-free').setAttribute('aria-pressed','false'); });
  $('#mode-free').addEventListener('click', (event) => { writers.forEach((writer) => writer.setMode('free')); event.currentTarget.setAttribute('aria-pressed','true'); $('#mode-free').setAttribute('aria-pressed','true'); $('#mode-trace').setAttribute('aria-pressed','false'); });
  $('#clear-writing').addEventListener('click', () => writers.forEach((writer) => writer.clear()));
  $('#quiz-play').addEventListener('click', onQuizPlay);
  $('#quiz-next').addEventListener('click', onQuizNext);
  await renderLesson();
  const env = detectAudioEnvironment({ userAgent: navigator.userAgent, protocol: location.protocol, speechApi: window.speechSynthesis });
  if (env.androidChrome && lessons.length > 1) $('#audio-status').textContent = '點擊慢速朗讀播放；尚未製作的錄音會使用手機普通話語音。';
} catch (error) {
  $('#lesson').setAttribute('aria-busy', 'false'); $('#audio-status').textContent = error.message;
  $('#writing-status').textContent = '描紅資料載入失敗，請重新整理頁面。'; console.error(error);
}
