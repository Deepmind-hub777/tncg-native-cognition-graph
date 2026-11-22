import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuiz, answerQuiz } from '../src/quiz.js';

test('quiz creates four unique options containing the correct answer and applies scoring', () => {
  const entries = [{ id:'q1', traditionalText:{value:'天地玄黃'} }];
  const round = createQuiz(entries, 'page', () => 0.25);
  assert.equal(round.options.length, 4);
  assert.equal(new Set(round.options.map((x)=>x.character)).size, 4);
  assert.ok(round.options.some((x)=>x.character===round.answer.character));
  assert.equal(answerQuiz(round, round.answer.id).delta, 10);
  assert.equal(answerQuiz(round, 'wrong').delta, -2);
  assert.equal(answerQuiz(round, 'wrong').score, -2);
});


