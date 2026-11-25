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
      ssml: pronunciationMarkup(lesson),
    });
    [...lesson.traditionalText.value].forEach((character, index) => {
      const code = [...character].map((item) => item.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('');
      if (!characters.has(code)) {
        const characterPinyin = characterPinyinOverrides.get(code) ?? lesson.pinyin.value[index];
        characters.set(code, {
          key: `char-${code}`,
          path: `assets/audio/chars/${code}.mp3`,
          text: character,
          pinyin: characterPinyin,
          speakingRate: 1,
          ...(characterPinyinOverrides.has(code) ? { ssml: characterPronunciationMarkup(character, characterPinyin) } : {}),
        });
      }
    });
  }
  return [...targets, ...characters.values()];
}

// 需要按校正读音合成 SSML 的组：原三组上下文多音字 + 2026-11-23 维基文库基线核对修正的 24 组。
// 明细见 data/annotation-wiki-base.md；新增修正组必须同步加入此集合，否则音频会按默认读音朗读。
const pinyinOverrides = new Set([
  10, 37, 188, // 露結爲霜 / 蓋此身髮 / 慼謝歡招：早期上下文多音字
  4, // 辰宿列張：宿=星宿，讀 xiù（2026-11-25 外部評測修訂）
  8, 22, 32, 46, 65, 67, 81, 88, 91, 92, 103, 108, // 2026-11-23 基线核对
  132, 140, 143, 156, 157, 171, 177, 187, 189, 200, 219, 232,
  242, // 永綏吉劭：綏 讀 suí（pypinyin 默認 suī；經 Milo 確認 2026-11-25）
]);
const characterPinyinOverrides = new Map([
  ['9577', 'cháng'], // 長 in qzw-046, meaning “strength/merit”.
]);
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

function characterPronunciationMarkup(character, syllable) {
  const escaped = character.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<speak><phoneme alphabet="pinyin" ph="${numberedPinyin(syllable)}">${escaped}</phoneme></speak>`;
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
