// 汉字学园 · 跨模块联动：千字文的字 → 天天拼词园千字文园（#qz=N，每字一关）/ 主园关卡（#lv=N）/ 后花园部首与结构（#bs=N）。
// 数据：data/pinci-links.json（由拼词园数据生成，繁→简用 OpenCC）。模块单独运行时若没有拼词园，只显示部首信息。
let linksPromise;
const loadLinks = () => (linksPromise ??= fetch('data/pinci-links.json?v=3').then((r) => (r.ok ? r.json() : { chars: {} })).catch(() => ({ chars: {} })));
const PINCI = 'https://deepmind-hub777.github.io/hanzi-xueyuan/modules/pinci/';
export const LINKS_ANCHOR = 'zi-jiazu';
// 带上回程：拼词园顶栏会显示「‹ 返回千字文 第N页」，点了回到这一页这一组的「字的家族」
function returnUrl() { const u = new URL(location.href); u.hash = LINKS_ANCHOR; return u.pathname + u.search + u.hash; }
function pinciHref(kind, n, ctx) {
  const q = new URLSearchParams({ from: 'qzw', p: String(ctx.page ?? ''), g: String(ctx.group ?? ''), ret: returnUrl() });
  return `${PINCI}?${q}#${kind}=${n}`;
}
let clickBound = false;

export async function renderHubLinks(root, characters, pinyins, ctx = {}) {
  const { chars } = await loadLinks();
  root.replaceChildren();
  if (!clickBound) {
    clickBound = true;
    root.addEventListener('click', (event) => {
      const a = event.target.closest('a[data-kind]'); if (!a) return;
      a.href = pinciHref(a.dataset.kind, a.dataset.n, { page: a.dataset.p, group: a.dataset.g });
      // 当前历史记录也记下「字的家族」锚点：安卓返回键回来时（若页面被重新载入）也能直接回到这里
      try { const u = new URL(location.href); u.hash = LINKS_ANCHOR; history.replaceState(history.state, '', u); } catch { /* 忽略 */ }
    });
  }
  characters.forEach((character, index) => {
    const info = chars[character];
    const card = document.createElement('article'); card.className = 'hub-link-card';
    const head = document.createElement('p'); head.className = 'hub-link-head';
    const big = document.createElement('span'); big.className = 'hub-link-char'; big.textContent = character;
    head.append(big);
    if (info?.s && info.s !== character) { const s = document.createElement('span'); s.className = 'hub-link-simp'; s.textContent = `简 ${info.s}`; head.append(s); }
    const py = document.createElement('span'); py.className = 'hub-link-py'; py.textContent = pinyins[index] ?? ''; head.append(py);
    card.append(head);
    const facts = document.createElement('p'); facts.className = 'hub-link-facts';
    if (info?.radical) {
      const struct = info.sub ? `${info.structure}（${info.sub}）` : info.structure;
      facts.textContent = `部首「${info.radical}」${info.radicalName} · ${struct}结构`;
      if (info.radicalHand || info.structureHand) {
        const m = document.createElement('small'); m.className = 'hub-link-hand';
        m.textContent = info.radicalHand ? '（部首为人工判定）' : '（结构为人工判定）';
        m.title = '各资料来源不一致，按《GB 13000.1 字符集汉字部首归部规范》(GF 0012-2009) 规则人工判定';
        facts.append(' ', m);
      }
    } else facts.textContent = '部首与结构资料暂缺';
    card.append(facts);
    const row = document.createElement('p'); row.className = 'hub-link-row';
    if (info?.qz) { const a = document.createElement('a'); a.dataset.kind = 'qz'; a.dataset.n = String(info.qz); a.dataset.p = String(ctx.page ?? ''); a.dataset.g = String(ctx.group ?? ''); a.href = pinciHref('qz', info.qz, ctx); a.textContent = `千字文园 第 ${info.qz} 关`; a.title = `去天天拼词园·千字文园，在「${info.s}」里找字`; row.append(a); }
    if (info?.lv) { const a = document.createElement('a'); a.dataset.kind = 'lv'; a.dataset.n = String(info.lv); a.dataset.p = String(ctx.page ?? ''); a.dataset.g = String(ctx.group ?? ''); a.href = pinciHref('lv', info.lv, ctx); a.textContent = `主园 第 ${info.lv} 关`; a.title = `去天天拼词园，看「${info.s}」里藏着哪些字`; row.append(a); }
    if (info?.bs) { const a = document.createElement('a'); a.dataset.kind = 'bs'; a.dataset.n = String(info.bs); a.dataset.p = String(ctx.page ?? ''); a.dataset.g = String(ctx.group ?? ''); a.href = pinciHref('bs', info.bs, ctx); a.textContent = `后花园 第 ${info.bs} 关`; a.title = '去后花园练部首与结构'; row.append(a); }
    if (row.childElementCount) card.append(row);
    root.append(card);
  });
}
