# 千字文互动学习

## 本地运行

- `npm test` — 内容、分页、音频、测验与描红单测。
- `npm run test:e2e` — 浏览器集成检查。
- `npm run validate:data` — 校验 250 组及 63 页结构。
- `npm run serve` — 在本机启动静态页面（默认端口 4173）。手机与电脑连接同一局域网后，可使用电脑局域网地址访问。

学员页面按每页四组组织，可在组间切换；第 63 页有最后两组。已审核的四字教学界面沿用第一组样板。

## 全篇扩展状态

- 正文已录入 250 组（1000 字），底本及版本仍待逐项校订。
- 第 1 组「天地玄黃」保留为已接受的黄金样板。第 2–250 组拼音是自动生成草稿，所有条目都标记为待校订。
- 第 2–250 组简体释义与英文短注已由豆包起草（`data/meaning-drafts.part1..3.json`），逐字拼音由 `tools/align-pinyin.py` 对齐，合并脚本为 `tools/apply-meaning-drafts.mjs`；249 组仍全部标记 `needs_review`，须对照底本终审后才能升级状态。
- 插画仍是提示词草稿，只有第 1 组有图；第 2–250 组尚未生成图片，不代表正式教学内容。
- 本地笔顺数据覆盖 1000 个不同字中的 990 个；缺字及码位见 [`data/stroke-gaps.json`](data/stroke-gaps.json)，可用 `node tools/stroke-gaps.mjs` 重新生成。UI 对缺字应显示“暂无笔顺”，不得绘制伪造笔画。
- 已登记的录音来源为 Google Cloud Text-to-Speech `cmn-CN-Standard-A`。生成音频仍为待试听状态；缺少录音时应用浏览器普通话语音备用，无法播放时应显示错误。
- 第 1 组四字已由用户在安卓手机验证声音和描红可用。当前代码修改后尚无新一轮 Android Chrome 真机记录；桌面测试不能替代真机结论。

## 内容生成和复核

`data/corpus-source.txt` 是从固定版本维基文库主文整理的转录底稿。繁体字形由 OpenCC 简繁转换生成；通行字形与底本异文尚未最终判定。原始来源与校订状态见 `data/sources.md`。

`tools/build-corpus.py` 用于生成结构化草稿。生成依赖（仅用于内容生成，不是网站运行依赖）：

- `pypinyin==0.55.0`
- `opencc-python-reimplemented==0.1.7`

重新生成前，应先备份已由人工审核的字段；当前脚本保留第 1 组，但会重新生成第 2–250 组的草稿值。

音频由 `tools/generate-audio.mjs` 调用本机现有的 gcloud CLI 凭证生成，无凭证不会写出资产。可先运行 `node 09-learning-library/qianziwen/tools/generate-audio.mjs --start 2 --end 250 --dry-run` 查看目标数；执行正式生成会产生 Google Cloud TTS API 请求。录音仍须抽样试听并核验授权条款、读音及文件。

标准笔顺数据和许可说明见 `THIRD_PARTY_NOTICES.md`。笔顺数据需要逐字复核后才能将字段状态从 `needs_review` 改为 `verified`。

## Android 真机记录

- 先前的第一组样板：用户报告 Android 手机上声音、描红通过。
- 本轮全篇分页/资产扩展后的重新验证：待进行；本机没有代替用户手机执行测试。
- 待核项：音频点击/重播、单字音频、触控多笔、清除、自由书写显隐范字、旋转画布适配。
