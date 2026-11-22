function pickIndex(length, random) { return Math.min(length - 1, Math.floor(random() * length)); }
function shuffled(items, random) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = pickIndex(i + 1, random); [result[i], result[j]] = [result[j], result[i]]; } return result; }

export function createQuiz(entries, scope = 'page', random = Math.random) {
  const records = scope === 'page' ? entries : entries;
  const chars = [...new Set(records.flatMap((entry) => [...entry.traditionalText.value]))];
  if (chars.length < 4) throw new RangeError('At least four unique characters are required for a listening quiz.');
  const answerChar = chars[pickIndex(chars.length, random)];
  const wrong = shuffled(chars.filter((character) => character !== answerChar), random).slice(0, 3);
  const options = shuffled([answerChar, ...wrong], random).map((character, i) => ({ id: `option-${i + 1}`, character }));
  return { answer: options.find((option) => option.character === answerChar), options, score: 0 };
}

export function answerQuiz(round, selectedId, score = 0) {
  const correct = selectedId === round.answer.id;
  const delta = correct ? 10 : -2;
  return { correct, delta, score: score + delta, feedback: correct ? '答对了，继续闯关！' : `再听一次，正确答案是「${round.answer.character}」。` };
}
