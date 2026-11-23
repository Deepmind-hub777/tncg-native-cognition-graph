export function buildAudioTargets(lessons, { start = 2, end = lessons.length } = {}) {
  if (!Array.isArray(lessons) || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lessons.length) {
    throw new RangeError('invalid lesson range');
  }
  const targets = [];
  const characters = new Map();
  for (const lesson of lessons.filter((entry) => entry.sequence >= start && entry.sequence <= end)) {
    const groupCode = String(lesson.sequence).padStart(3, '0');
    targets.push({
      key: `qzw-${groupCode}-slow`,
      path: `assets/audio/qzw-${groupCode}-slow.mp3`,
      text: lesson.traditionalText.value,
      pinyin: lesson.pinyin.value.join(' '),
      speakingRate: 0.72,
    });
    [...lesson.traditionalText.value].forEach((character, index) => {
      const code = [...character].map((item) => item.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('');
      if (!characters.has(code)) characters.set(code, { key: `char-${code}`, path: `assets/audio/chars/${code}.mp3`, text: character, pinyin: lesson.pinyin.value[index], speakingRate: 1 });
    });
  }
  return [...targets, ...characters.values()];
}

const pinyinOverrides = new Set([10, 37, 188]);
const toneMarks = new Map(Object.entries({
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
}));

function numberedPinyin(syllable) {
  let tone = 5;
  const base = [...syllable.toLowerCase()].map((letter) => {
    const marked = toneMarks.get(letter);
    if (!marked) return letter === 'ü' ? 'v' : letter;
    tone = marked[1];
    return marked[0] === 'ü' ? 'v' : marked[0];
  }).join('');
  if (!/^[a-zv]+$/i.test(base)) throw new TypeError(`invalid pinyin syllable: ${syllable}`);
  return `${base}${tone}`;
}

function pronunciationMarkup(lesson) {
  if (!pinyinOverrides.has(lesson.sequence)) return undefined;
  const characters = [...lesson.traditionalText.value];
  if (characters.length !== 4 || lesson.pinyin.value.length !== 4 || lesson.pinyin.value.some((syllable) => !syllable)) {
    throw new TypeError(`lesson ${lesson.sequence} has incomplete character-aligned pinyin overrides`);
  }
  const phonemes = characters.map((character, index) => {
    const escaped = character.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<phoneme alphabet="pinyin" ph="${numberedPinyin(lesson.pinyin.value[index])}">${escaped}</phoneme>`;
  }).join('');
  return `<speak>${phonemes}</speak>`;
}

export function buildNormalAudioTargets(lessons, { start = 1, end = lessons.length } = {}) {
  if (!Array.isArray(lessons) || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lessons.length) {
    throw new RangeError('invalid lesson range');
  }
  return lessons.filter((lesson) => lesson.sequence >= start && lesson.sequence <= end).map((lesson) => {
    const groupCode = String(lesson.sequence).padStart(3, '0');
    return {
      key: lesson.sequence === 1 ? 'normal' : `qzw-${groupCode}-normal`,
      path: `assets/audio/qzw-${groupCode}-normal.mp3`,
      text: lesson.traditionalText.value,
      pinyin: lesson.pinyin.value.join(' '),
      speakingRate: 1,
      ssml: pronunciationMarkup(lesson),
    };
  });
}
