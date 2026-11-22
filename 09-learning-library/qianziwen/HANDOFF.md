# 交接说明：千字文模块（豆包 → Codex 终审）

日期：2026-11-22 ｜ 分支：`feature/qianziwen-module` ｜ 目录：`09-learning-library/qianziwen`

## 我这轮做完的事

1. **补齐 249 组释义与英文短注**（第 2–250 组，第 1 组沿用已验收样板）
   - 草稿源文件：`data/meaning-drafts.part1.json`、`part2.json`、`part3.json`（每组含 `sequence`、`meaning`、`en`）
   - 合并脚本：`tools/apply-meaning-drafts.mjs`（读三份草稿 → 调用 `tools/align-pinyin.py` 生成逐字拼音 → 写回 `data/lessons.json`）
   - 拼音对齐器：`tools/align-pinyin.py`（`pypinyin==0.55.0`，`Style.TONE`，汉字槽位给拼音，标点槽位留空，一对一）
2. **状态一律保持 `needs_review`**：释义/拼音/英文注的 `source` 字段改写为“豆包起草，待终审”，没有把任何条目谎报成 `verified`。
3. **校验与测试**
   - `node tools/validate-content.mjs` → `Content validation passed: 250 lessons, 63 pages.`
   - 6 个测试文件逐个跑全绿：`audio` / `content` / `page.spec` / `pagination` / `quiz` / `writing`
   - 注意：`node --test tests` 在 Windows 上会把目录当模块路径报 `MODULE_NOT_FOUND`，要逐个文件跑或 `node --test tests/*.mjs`
4. README「全篇扩展状态」已同步真实状态（释义/插画到底做到哪一步）。

## 现在的真实状态

| 项目 | 数量 | 状态 |
| --- | --- | --- |
| 正文四字组 | 250 组 / 1000 字 | 已录入，底本待逐项校订 |
| 拼音（正文） | 250 组 | 自动草稿 + 序列覆盖，待校订 |
| 简体释义 | 250 组 | 第 1 组样板 + 249 组豆包起草，待终审 |
| 释义逐字拼音 | 250 组 | 与释义字符严格对齐，待终审（多音字需人核） |
| 英文短注 | 250 组 | 豆包起草，待终审 |
| 插画 | 1 / 250 | 仅第 1 组有图，其余只有提示词 |
| 慢速音频 | 250 / 250 | 已生成，未试听 |
| 常速整句音频 | 1 / 250 | 仅第 1 组 |
| 单字音频 | 1000 / 1000 | 已生成 |
| 笔顺数据 | 990 / 1000 字 | 缺 爲、凊、羣、磻、寔、俶、輶、煒、牀、絃 |

## 交给 Codex 的待办（建议顺序）

1. **释义终审**：逐组对照 `data/corpus-source.txt` 与所引底本，改订后把 `simplifiedMeaning.status` 升为 `verified`，并在 `source` 写明出处与校订人。豆包稿件只作初稿，不作依据。
2. **释义拼音终审**：重点看多音字与文白异读（如 爲、長、行、重、與、說、數、樂、好）。`tools/align-pinyin.py` 是按字查默认读音，不辨语境。
3. **正文拼音终审**：`tools/build-corpus.py` 里的 sequence-specific override 需与《新华字典》第 13 版逐条比对。
4. **补 10 个缺笔顺字**：缺字一律不画假笔画（现有约定）；要么补数据，要么在 UI 明确提示“该字暂无笔顺”。
5. **音频**：先抽样试听 250 条慢速音频；常速整句仍缺 249 条。任何新生成都要先确认 gcloud TTS 授权条款。
6. **插画**：249 组只有提示词；若要出图，先定统一画风与无字规范（第 1 组 `ink-wash` 为基准）。
7. **Android 真机复测**：分页、单字音频、触控多笔、清除、自由书写显隐范字、旋转适配。桌面测试不能替代真机结论。
8. **第 1 组状态**：它是用户已验收样板，但 8 个字段仍是 `needs_review`；是否升 `verified` 由你与用户确认后决定。
9. **分页与徽标**：页面徽标仍显示“部分內容待校訂”，与数据一致。全部字段升级后需同步改 `src/main.js` 的判定与文案。

## 复现命令

```bash
cd 09-learning-library/qianziwen
node tools/apply-meaning-drafts.mjs     # 需要 python + pypinyin==0.55.0
node tools/validate-content.mjs
node --test tests/*.mjs
npm run serve                            # 默认 4173；局域网访问用电脑内网地址
```

## 边界声明

- 本轮没有生成图片、没有调用 TTS、没有做真机测试，也没有把任何 `needs_review` 改成 `verified`。
- 释义是**教学初稿**，凡与底本冲突，以底本与用户判定为准。

## 本轮进展 / 遗留 / 风险（2026-11-23）

### 进展

- 已按顺序从释义终审开始，先核第 2 组「宇宙洪荒」；第 1 组样板未改动。
- 对照交接文件发现来源表仍误写成“释义占位词”；已将 `data/sources.md` 修正为 249 组已有豆包释义、逐字拼音及英文草稿、但全部仍待底本终审。草稿文件没有改动或删除。
- 维基文库《千字文》正文可核到「天地玄黄　宇宙洪荒」，但该固定版本页面没有白话释义。
- 商务印书馆官网可确认《千字文（普及版）》，冯国超译注，2017 年版，ISBN 978-7-100-12521-5；官网页面说明该书含注释和译文，但未公开「宇宙洪荒」对应页内容。
- 本轮没有修改教学内容，也没有将任何字段改为 `verified`。

### 遗留

- 释义终审目前为 **0/249 组已核订**；第 2 组仍 `needs_review`，原因是尚未取得上述商务印书馆版本的实际释文/注释页，无法按指定底本完成交叉校订。
- 本轮字段状态表（第 1 组样板不在 249 组统计内，且未改动）：

  | 字段 | 第 2–250 组已核订 | 第 2–250 组待核订 | 状态/原因 |
  | --- | ---: | ---: | --- |
  | 简体释义 | 0 | 249 | 全部 `needs_review`；缺指定商务印书馆版本的逐句译注正文 |
  | 释义逐字拼音 | 0 | 249 | 全部 `needs_review`；释义尚未终审，不能开始多音字复核 |
- 本轮校验原始结果：`Content validation passed: 250 lessons, 63 pages.`；Node 单测汇总：`tests 20 / pass 20 / fail 0`；Playwright 汇总：`7 passed (8.4s)`。
- Windows 下须分开运行测试器：在模块目录运行 `node --test tests/audio.test.mjs tests/content.test.mjs tests/pagination.test.mjs tests/quiz.test.mjs tests/writing.test.mjs`；在仓库根目录运行 `npx playwright test tests/page.spec.mjs`。直接用 Node glob 会把 Playwright 的 `page.spec.mjs` 当作 `node:test` 加载并报 runner 冲突，不代表浏览器用例失败。
- 后续释义逐字拼音、多音字读音、正文拼音、笔顺缺字、音频、插画和安卓复测均未开始，按用户指定顺序等待释义阶段完成。
- 可用于定位的来源：维基文库 [《千字文》固定文本](https://zh.wikisource.org/w/index.php?title=%E5%8D%83%E5%AD%97%E6%96%87&oldid=13033228)；商务印书馆 [《千字文（普及版）》书目页](https://www.cp.com.cn/book/e19d8c0f-2.html)。后者目前只提供书目与简介，不含所需逐句译注预览。

### 风险 / 需要的资料

- 继续依据豆包草稿或通用二手释文升 `verified` 会违反底本核对要求。请提供《千字文（普及版）》ISBN 978-7-100-12521-5 中「天地玄黄，宇宙洪荒」及后续段落的译注页照片/扫描，或提供可访问的正版电子版页面；收到后按顺序逐组审校。
- 在实际释文可核对前，不提交、不推送任何内容状态变更；所有相关字段维持 `needs_review`。

## 插画试稿（2026-11-23）

- 按用户指定仅生成 3 张风格试稿：002「宇宙洪荒」、025「弔民伐罪」、121「杜稿鍾隸」。第 1 组 `qzw-001.png` 只作为风格参考，没有修改。
- 文件与完整提示词在 Codex 输出目录 `C:\Users\User\Documents\Codex\2026-11-22\github-codex-250-1-2-3\outputs\qianziwen-illustration-pilot\`：`qzw-002.jpg`、`qzw-025.jpg`、`qzw-121.jpg`、`pilot-manifest.csv`、`pilot-prompts.log`。三张输出均为 1536×1024，JPEG 文件均小于 300 KB。
- 这三张仅供用户检查画风与题材克制度，不代表教学审核通过；尚未复制进正式 assets，也未改写任何 lessons 字段。等待用户确认后再开始 246 张余稿。
- 本轮没有创建 249 行正式 `manifest.csv`，也没有创建或声称完成 `qianziwen-illustrations-002-250.zip`。

## 本轮进展 / 验收（2026-11-23）

| 做了什么 | 文件路径 | 验证命令与结果 | 没做什么及原因 |
| --- | --- | --- | --- |
| 新增插图导入器：默认 dry-run，核查补零、范围、重复与缺号；`--write` 写相对图片路径并强制保留 `needs_review` 与指定来源；统计总大小并在超过 75 MB 时警告。 | `tools/import-illustrations.mjs` | `node tools/import-illustrations.mjs --dry-run` 正常运行；扫描仓库内 1 张图片，合计 2,823,849 bytes（2.69 MB），缺少 002–250 共 249 张。 | 没有导入试稿或运行 `--write`：任务给出的 pilot 目录不在当前工作区可读范围内；现有资产计量低于 75 MB，未改 `.gitignore` 或采用 Git LFS。 |
| 新增拼音复核说明，逐组列出 250 组正文、当前读音和候选风险，解释 sequence-specific override。 | `data/pinyin-review.md` | 人工结构检查：正文表 250 行；脚本 override 实际仅第 10、37、188 组，其余组没有拼音 override；第 1 组由构建脚本保留。 | 没有改 `lessons.json` 的拼音或任何数据状态，读音裁定留待人工核对。 |
| 新增缺笔顺生成器，并在 README 链接清单、说明缺字 UI 应显示“暂无笔顺”，不得绘制伪造笔画。 | `tools/stroke-gaps.mjs`、`data/stroke-gaps.json`、`README.md` | `node tools/stroke-gaps.mjs` → 10 字：爲、凊、羣、磻、寔、俶、輶、煒、牀、絃；`node tools/validate-content.mjs` → 通过（250 lessons、63 pages）。 | 没有补造笔画数据。 |
| 完成回归自检。 | 本模块 `tests/` | Node 单测 20/20 通过；Playwright 浏览器用例单独运行 7/7 通过。按字面运行 `node --test tests/*.mjs` 会把 `page.spec.mjs` 交给错误 runner，出现 Playwright runner 冲突（20 pass、1 fail）；因此 Node 与 Playwright 分开运行。 | 没有做安卓真机复测。 |

本轮未改任何字段 `status`，未改第 1 组内容，未生成图片/TTS，也未执行 git push。验收要求的本地提交未能完成：当前执行环境将 `.git` 元数据目录设为只读，Git 创建 `index.lock` 时收到 `Permission denied`；工作区改动仍未提交。
