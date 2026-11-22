# CODEX_TASK：千字文模块下一轮

接手人：Codex ｜ 分支：`feature/qianziwen-module` ｜ 目录：`09-learning-library/qianziwen`

先读同目录 `HANDOFF.md`，再读本文件。已完成的部分不要重做。

## 本轮范围（只做这三项，做完即停）

> 本轮三项都与释义底本无关，**不要等商务印书馆的译注扫描件**。释义终审留在后续轮次，等用户提供资料或明确授权。

试稿输入：`C:\Users\User\Documents\Codex\2026-11-22\github-codex-250-1-2-3\outputs\qianziwen-illustration-pilot\`（002/025/121 三张 1536×1024 JPG，各 <300KB），可用它来测导入器。

### 1. 插图导入器 `tools/import-illustrations.mjs`

豆包已把 249 张插图交给 ChatGPT 生成（第 2–250 组，命名 `qzw-002.jpg … qzw-250.jpg`，1536×1024，≤300KB）。你需要：

- 扫描 `assets/illustrations/` 下 `qzw-NNN.{jpg,jpeg,png}`；
- 按 `sequence` 校验：文件名补零是否正确、序号是否落在 2–250、是否有重复、是否缺号；
- 支持 `--dry-run`（只报告，不写文件），默认 dry-run，`--write` 才落盘；
- `--write` 时把 `illustration.value.path` 写为相对路径 `assets/illustrations/qzw-NNN.jpg`；
- **`illustration.status` 保持 `needs_review`**，`source` 写为“ChatGPT 生成草稿，待教学审核”；
- 输出缺失清单与总大小统计，超过 75MB 时警告。

注意：图片文件本身不进仓库由你决定，但必须先算总量再决定是否加入 `.gitignore` 或改用 Git LFS；做决定前把数字报给用户。

### 2. 说明书 `data/pinyin-review.md`（只读产出，不改数据）

- 从 `data/lessons.json` 提取 250 组正文拼音，标出所有多音字候选（至少覆盖：爲、長、行、重、與、說、數、樂、好、從、少、分、中、處、相、為）；
- 逐条列出 `tools/build-corpus.py` 里 sequence-specific override 的实际覆盖范围，指出哪些组有 override、哪些没有；
- 用表格给出“组号 / 四字 / 当前拼音 / 风险点 / 建议”，供人工核对。不要自行改 `lessons.json`。

### 3. 笔顺缺口清单 `tools/stroke-gaps.mjs`

- 复用 `tests/content.test.mjs` 里的缺字判定逻辑，输出 `data/stroke-gaps.json`：`{ missing: [...10 字...], codepoints: [...] }`；
- 在 README 的笔顺段落引用该文件，说明 UI 对缺字应显示“暂无笔顺”，不得绘制伪造笔画。

## 硬约束

- 不得把任何字段的 `status` 从 `needs_review` 改为 `verified`；`tests/content.test.mjs` 会挂，且这是用户保留给人工终审的。
- 不得改动第 1 组「天地玄黃」的任何内容。
- 不得删除 `data/meaning-drafts.part1..3.json`。
- 不得调用任何 TTS / 图像生成 API（会产生费用与授权问题）。
- 不得 `git push`；本轮只提交到本地分支。
- Windows 上 `node --test tests` 会把目录当模块路径报 `MODULE_NOT_FOUND`，请用 `node --test tests/*.mjs`。

## 验收（交给用户前必须全部满足）

1. `node tools/validate-content.mjs` → 通过；
2. `node --test tests/*.mjs` → 全绿；
3. `node tools/import-illustrations.mjs --dry-run` 能跑，输出缺号情况；
4. `node tools/stroke-gaps.mjs` 产出 10 个缺字；
5. `git log -1` 显示一次提交，作者 `Codex Agent`；
6. 汇报里给出一张表：做了什么 / 文件路径 / 验证命令与结果 / 没做什么及原因。

## 本轮不做（等用户明确授权）

- 释义终审（249 组要逐条对照底本，必须人工过一遍）
- 正文拼音 override 的修改（先出说明书，用户确认后再改）
- 常速音频生成（TTS 有费用）
- 安卓真机复测（需要用户手机）
- 任何 `verified` 状态升级
