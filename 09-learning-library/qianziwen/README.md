# 千字文互动学习

> 用一千个不重复的字，串起天文、地理、器物与人事。本课程以繁体字形教学：
> 繁体保留造字的构件与语义线索，是 AI 时代仍然稀缺的那种纵深。
> 记忆交给韵文，判断留给自己。——详见 [`docs/teaching-purpose.md`](docs/teaching-purpose.md)

## 本地预览

在本目录运行：

```powershell
node tools/serve.mjs
```

默认启动 `http://localhost:4173/`。互动课程位于根路径，顺序听读页位于 [`site/`](site/)。同一局域网内的手机也可访问电脑的局域网地址。需要自选端口时，可先设置 `PORT` 环境变量。

## 当前内容

- 正文共 250 组（1000 字），按每页四组排列，共 63 页；最后一页有两组。第 1 组「天地玄黃」是已确认的样板。
- 第 2–250 组正文拼音、简体释义及逐字释义拼音、英文短注均为待校订稿；字段状态保持 `needs_review`。
- 第 2–250 组插画已生成并登记在 `lessons.json`；仍是待教学审核的视觉草稿，状态为 `needs_review`。
- 250 组均有普通话常速整组 MP3；音频来源为 Google Cloud Text-to-Speech `cmn-CN-Standard-A`。`data/audio-manifest.json` 记录资产与生成状态，音频本身仍待抽样试听及读音复核。
- 笔顺数据覆盖 990 个字。缺少标准笔顺资源的 10 个字列于 [`data/stroke-gaps.json`](data/stroke-gaps.json)；界面应显示“暂无笔顺”，不可绘制伪造笔画。

## 顺序听读页

打开 `site/` 可按组查看插画、繁体原文、逐字拼音、带拼音的简体解释和英文短注，并播放常速普通话音频。可用上一组/下一组顺序浏览、输入组号跳转，进度会显示当前组在全篇的位置。页面读取现有 `data/lessons.json`，不改变课程数据结构。

## 数据与复核

- `data/corpus-source.txt` 是固定版本维基文库主文的转录底稿；底本与字形异文仍待逐项核对，来源说明见 `data/sources.md`。
- 第 2–250 组释义草稿及留痕见 `data/meaning-drafts.part1..3.json`；对齐脚本为 `tools/align-pinyin.py`，合并脚本为 `tools/apply-meaning-drafts.mjs`。
- 拼音风险与 sequence-specific override 说明见 `data/pinyin-review.md`；不要在未核订时将字段状态改为 `verified`。
- 笔顺来源与授权说明见 `THIRD_PARTY_NOTICES.md`。

## 音频生成凭据

`tools/generate-audio.mjs` 支持 `TTS_ACCESS_TOKEN`、gcloud 用户凭据和 ADC 的显式凭据顺序。ADC 可能属于不同 Google 身份；未配置有效凭据时先停止并检查身份与项目，不要把 access token 写入仓库或日志。完整生成记录见 `HANDOFF.md` 与 `handoff/review-qzw-round1.md`。

## Android 真机

用户已报告第一组样板在 Android 手机上声音与描红通过。扩展到全篇后的页面和音频资产仍需在目标 Android Chrome 设备复核；桌面浏览器结果不替代真机验收。
