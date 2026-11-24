// 千字文学习记录（本机；登录后由 shared/account.js 同步到云端）：看过哪些组、最近一组、听音辨字最好成绩
const KEY = 'hzxy.qianziwen.v1';
export function readProgress() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
}
function write(p) { p.v = 1; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 隐私模式等：忽略 */ } }
export function markSeen(sequence) {
  if (!Number.isInteger(sequence) || sequence < 1) return;
  const p = readProgress(); p.seen = p.seen && typeof p.seen === 'object' ? p.seen : {};
  p.seen[String(sequence)] = 1; p.last = String(sequence); write(p);
}
export function lastSeen() { const n = Number(readProgress().last); return Number.isInteger(n) && n > 0 ? n : null; }
export function recordQuiz(page, score) {
  const p = readProgress(); p.quiz = p.quiz && typeof p.quiz === 'object' ? p.quiz : {};
  const k = String(page); p.quiz[k] = Math.max(Number(p.quiz[k]) || 0, Number(score) || 0); write(p);
}
