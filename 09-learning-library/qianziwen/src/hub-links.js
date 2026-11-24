// 汉字学园 · 跨模块联动：千字文的字 → 天天拼词园千字文园（#qz=N，每字一关）/ 主园关卡（#lv=N）/ 后花园部首与结构（#bs=N）。
// 数据：data/pinci-links.json（由拼词园数据生成，繁→简用 OpenCC）。模块单独运行时若没有拼词园，只显示部首信息。
let linksPromise;
const loadLinks = () => (linksPromise ??= fetch('data/pinci-links.json?v=3').then((r) => (r.ok ? r.json() : { chars: {} })).catch(() => ({ chars: {} })));
const PINCI = 'https://deepmind-hub777.github.io/hanzi-xueyuan/modules/pinci/';

export async function renderHubLinks(root, characters, pinyins) {
  const { chars } = await loadLinks();
  root.replaceChildren();
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
    if (info?.qz) { const a = document.createElement('a'); a.href = `${PINCI}#qz=${info.qz}`; a.textContent = `千字文园 第 ${info.qz} 关`; a.title = `去天天拼词园·千字文园，在「${info.s}」里找字`; row.append(a); }
    if (info?.lv) { const a = document.createElement('a'); a.href = `${PINCI}#lv=${info.lv}`; a.textContent = `主园 第 ${info.lv} 关`; a.title = `去天天拼词园，看「${info.s}」里藏着哪些字`; row.append(a); }
    if (info?.bs) { const a = document.createElement('a'); a.href = `${PINCI}#bs=${info.bs}`; a.textContent = `后花园 第 ${info.bs} 关`; a.title = '去后花园练部首与结构'; row.append(a); }
    if (row.childElementCount) card.append(row);
    root.append(card);
  });
}
