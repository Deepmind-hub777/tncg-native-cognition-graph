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
