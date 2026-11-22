# CODEX_TASK_ILLUSTRATIONS：补齐 246 张插图

用户已**通过**试稿画风（qzw-002 / 025 / 121）。三张已复制进 `assets/illustrations/`，不再重画。

## 目标

按下面的风格锁，为第 2–250 组中**尚未出图**的 246 组各生成 1 张，最终 `assets/illustrations/` 里 002–250 齐全（第 1 组仍是 `qzw-001.png`，不许改）。

## 风格锁（逐字照用，不要改写、不要精简）

```
Style lock: Chinese ink-wash on warm rice-paper ground (#F3EAD7); about 60% empty space; soft ink gradients; palette limited to ink black, pale ochre, and at most one faint mineral-blue accent; calm, quiet, contemplative mood; distant silhouettes only, no identifiable faces; composition places the subject in the lower third off-centre, leaving the upper area open for text overlay; flat matte paper texture.
Hard bans: no text, no calligraphy strokes forming words, no Chinese characters, no Latin letters, no numbers, no seal, no signature, no watermark, no border, no frame; no modern objects, no photo realism, no glossy plastic 3D, no neon, no anime.
Output: 1536x1024 JPG, sRGB, file size <= 300 KB.
```

## 每张提示的结构

风格锁 + 一段本组专属：

```
For lesson NNN, <四字>. <一句画面说明：只表现一个核心意象>.
<该组的克制要求，如涉及战争/祭祀/书写>。
Vary from the previous frames: <本轮轮换的季节、天光、视角>.
The original qzw-001 reference image is a style reference only; match its restrained hand-painted ink-wash atmosphere and warm paper texture.
```

画面依据三处：`data/lessons.json` 的 `englishNote`（语义）、该组原有 `illustration.prompt`（意象）、以及正文四字本身。一图一核心意象，**不许把一个四字拆成四格或四件物平均铺开**。

相邻两张不得同构：轮流用 晨雾 / 暮色 / 月夜 / 雪意 / 雨后 / 静水 / 器物近景 / 远山剪影，避免连续两张同一山形同一天光。

## 题材克制（硬规则）

- 战争、征伐、刑罚、捕盗（26、149–152、227、228）：兵器陈列、空场、远旗、剪影；不画血、不画尸、不画囚徒受刑、不画交战动作。
- 祭祀、丧仪（217–220）：礼器、供桌、香烟；不画神像、不画可识别宗教造像。
- 书写、典籍（21、119–122、197、198、221）：书卷、简牍、砚、笔可作主体，**卷面必须全白**，不得出现任何笔画、符号、字迹。
- 人物典故（19、20、24、26、133–140、147–149、169、170、181、229–232 等）：只给远景剪影或背影，无正脸、无儿童、无现代服饰。
- 器物类：不要出现可辨认的商标、纹样文字、器物铭文。

## 硬参数

- 尺寸 1536×1024，JPG，sRGB，**单张 ≤ 300KB**。
- 文件名严格 `qzw-0NN.jpg`（三位补零），直接写入 `09-learning-library/qianziwen/assets/illustrations/`。
- 不覆盖 `qzw-001.png`，不覆盖已存在的 `qzw-002.jpg`、`qzw-025.jpg`、`qzw-121.jpg`。
- 不许用同一张图改色、裁剪、镜像、加雾来凑数；不许出拼图；一次只交单张文件。

## 记录

- 每张把完整提示词追加到 `assets/illustrations/prompts.log`（格式照 `pilot-prompts.log`）。
- 维护 `assets/illustrations/manifest.csv`：`sequence,filename,four_chars,one_line_brief`，一行一张。
- 本轮开始前先读已有 manifest 与目录，跳过已存在的序号。

## 本轮批次

**只做 40 张**：从 `003` 起按序号递增，跳过已存在的 025、121。做完即停，不要一口气跑完 246 张。

## 禁止

- 不得修改 `data/lessons.json` 的任何字段（包括 `illustration.path` 与所有 `status`）——写回路径由 `tools/import-illustrations.mjs` 统一做。
- 不得 `git add/commit/push`（该 worktree 的 `.git` 对你只读，提交由豆包代做）。
- 不得调用任何付费外部图像 API；只用你自带的图像生成能力。

## 验收（本轮结束必须汇报）

1. 本轮实际产出张数与序号范围；
2. 每张 1536×1024 且 ≤300KB（给最大/最小体积）；
3. `manifest.csv` 本轮新增行数与总行数；
4. `assets/illustrations/` 目录当前总大小；
5. 自检结论：抽 3 张说明"无文字/无正脸/留白达标"，若发现违规必须重画而不是放过；
6. 下一批应从哪个序号开始。
