# 千字文互动教学模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task after approval. Work in an isolated feature worktree; do not modify `main` directly.

**Goal:** 在现有仓库实现 Android 优先的静态《千字文》教学模块，先完成“天地玄黃”黄金样板、音频试听和 Android 真机验收，再扩展其余 249 组。

**Architecture:** 原生 HTML/CSS/JavaScript 模块放在 `09-learning-library/qianziwen/`，教学内容和资源清单与 UI 分离。用本地 Hanzi Writer 运行时代码及逐字数据提供标准笔顺动画，用独立的 Pointer Events 书写层处理描红和独立书写；正常语音优先使用本地 MP3，浏览器 TTS 仅作备用。

**Tech Stack:** HTML5、CSS、ES modules、Node.js 20+ 内置 `node:test`、Playwright 浏览器集成测试、Hanzi Writer（本地 vendored、版本写入 lockfile）、Google Cloud Text-to-Speech REST API（仅生成并保存静态 MP3，不在客户端联网调用）。

**Spec:** `docs/superpowers/specs/2026-11-22-qianziwen-learning-module-design.md`

## Global Constraints

- 全部 250 组，每页四组，末页两组，共 63 页。
- 每组按：繁体原文 → 拼音 → 语音 → 简体解释 → 极简英语注解 → 意境插画/图像提示 → 标准笔顺描红 → 听音辨字。
- 所有拼音、释义、英语、音频及笔顺状态按字段记录；未经逐项核验的字段保持 `needs_review`。
- 页面不自动播放音频；播放按钮显示状态、暂停/重播控制及失败原因。
- 预生成的普通话 MP3 为主要语音；浏览器 TTS 仅作备用。
- 用户截图只作视觉与布局参考，不作文字、拼音、笔顺或音频来源。
- 繁体正文以维基文库《千字文》繁體頁面的主文作为初始转录底本；异文不静默合并，逐条进入 variant notes 并用另一公开文本版本交叉核对。该经典文本页面标注公有领域；正文仍以来源记录及审阅状态管理。[维基文库《千字文》繁體頁](https://zh.wikisource.org/wiki/千字文)
- 拼音以《新华字典》第13版普通话字典条目为核验来源，语境多音字按句义核对；商务印书馆将第13版列为当前修订版。[商务印书馆第13版信息](https://www.cp.com.cn/book/491f612a-1.html) 简释使用词典/古文注释来源作参考后用自己的简洁语言撰写，英语注解为原创短句。
- 首先完成“天地玄黃”六个 MP3 并交用户试听确认；未确认前不批量生成其余音频。
- 第一组 Android Chrome 真机验收未通过前，不扩展其余 249 组；桌面模拟/浏览器测试不能替代真机验收。
- 页面不得出现 `TNCG` 或其他内部项目名称/缩写；移除原“声调与跟读”四宫格。
- 笔顺使用本地数据，并遵守 `hanzi-writer-data`/Make Me a Hanzi 的 Arphic Public License；Hanzi Writer 代码按 MIT 要求保留许可。
- Google Cloud TTS 生成音频只在可用的现有凭证及无额外计费额度下生成；不创建账号/项目/密钥、不启用付费资源，也不产生超出免费额度的费用，除非用户之后明确批准。Google 官方文档说明生成音频可用于应用（遵守服务条款），MP3 可作为输出格式，Standard voice 当前列出 `cmn-CN-Standard-A`；服务仍要求有效项目/账单配置。[音频使用说明](https://docs.cloud.google.com/text-to-speech/docs/basics) · [普通话声线列表](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types) · [计费说明](https://cloud.google.com/text-to-speech/pricing)
- 真机测试必须留下 Android 设备、Android/Chrome 版本、连接方式和逐项结果；不能取得设备操作或测试记录时，报告为未通过/待完成。

## Review Focus

- Android 播放缺失/损坏的 MP3：应进入 TTS 备用，失败时展示可理解的错误；由 Task 2 测试缺失资源和 `play()` rejection。
- Web Speech voices 延迟加载或不存在：应等待 `voiceschanged` 并显式结束/报错；由 Task 2 测试无 voice 与 speech error。
- 手指抬起、快速多笔、pointercancel：应生成互相独立的笔迹且无跨笔连线；由 Task 3 绘图逻辑测试和 Task 5 真机测试覆盖。
- DPR、视口改变、竖横屏旋转：笔迹比例应保持或显示清空提示；由 Task 3 几何/重绘测试和 Task 5 真机旋转检查覆盖。
- 内容不足/字段未校订/末页两项：分页、抽题应避免重复或越界，待核内容须有标记；由 Task 1 与 Task 6 内容验证覆盖。

---

## 文件结构

### 创建

- `09-learning-library/qianziwen/index.html` — 学员页面骨架与无障碍区域。
- `09-learning-library/qianziwen/styles.css` — 移动端布局、写字格、叠层和响应式方向样式。
- `09-learning-library/qianziwen/src/main.js` — 加载数据并编排页面交互。
- `09-learning-library/qianziwen/src/pagination.js` — 63 页切分、页码跳转与进度。
- `09-learning-library/qianziwen/src/quiz.js` — 随机题、四选项去重、计分和反馈。
- `09-learning-library/qianziwen/src/audio.js` — MP3/TTS 播放状态机、环境提示、暂停和重播。
- `09-learning-library/qianziwen/src/writing.js` — 标准笔顺动画、描红/独立书写、pointer、撤销/清除和尺寸适配。
- `09-learning-library/qianziwen/data/lessons.json` — 250 组结构化内容及逐项校订状态。
- `09-learning-library/qianziwen/data/audio-manifest.json` — 音频路径、模式、声线与授权/生成来源。
- `09-learning-library/qianziwen/data/strokes/` — 本地按 Unicode 码点拆分的笔顺数据。
- `09-learning-library/qianziwen/data/strokes/ARPHICPL.TXT`、`THIRD_PARTY_NOTICES.md` — 笔顺及运行时代码许可与来源。
- `09-learning-library/qianziwen/assets/audio/` — 第一组六个 MP3，后续按组编号存放。
- `09-learning-library/qianziwen/assets/illustrations/` — 已提供的无文字插画；未生成项仅保留图像提示及状态。
- `09-learning-library/qianziwen/README.md` — 运行、内容校订、音频/笔顺资源格式和 Android 测试步骤。
- `09-learning-library/qianziwen/tools/validate-content.mjs` — 内容结构、数量、校订字段及页数检查。
- `09-learning-library/qianziwen/tools/generate-audio.mjs` — 使用已有 Google Cloud 凭证生成 MP3 的一次性/批量生成器；不写入凭证或在客户端调用 API。
- `09-learning-library/qianziwen/tools/serve.mjs` — 本机开发服务器，允许 Android 手机在同一网络访问样板。
- `09-learning-library/qianziwen/tests/` — Node 内置单元测试及 Playwright 浏览器集成测试。
- 根目录 `package.json`、`package-lock.json` — 测试、校验、服务脚本及锁定的测试/运行时依赖。

### 修改

- `09-learning-library/README.md` — 增加千字文模块入口。
- 根 `README.md` — 只修正已过期项目状态，并链接新模块；不重写无关研究介绍。

## 实施阶段与任务

### 阶段 A：黄金样板（未过两道人审门槛前，不进入阶段 B）

### Task 1：数据契约、分页和校验器

**Files:** `package.json`、`package-lock.json`、`data/lessons.json`、`src/pagination.js`、`tools/validate-content.mjs`、`tests/pagination.test.mjs`、`tests/content.test.mjs`

**Interfaces:** `getPageEntries(entries, page, pageSize=4) -> Entry[]`、`getPageCount(entryCount, pageSize=4) -> number`；数据记录每组含 `id`、`sequence`、`traditionalText`、`pinyin[]`、`simplifiedMeaning`、`englishNote`、`illustration`、`audio`、`strokeData[]` 及按字段命名的 `status/source`。

- [ ] **Step 1: 先写失败测试** — 用仅含样板与 fixtures 的临时样本测试空数组、边界页、末页两项、越界页、重复 ID、非四字原文、拼音字符数不等、缺少状态字段。
- [ ] **Step 2: 运行 `npm test`，确认这些测试因接口/数据缺失而失败。**
- [ ] **Step 3: 实现最小 ES module 数据契约与纯分页函数。**
- [ ] **Step 4: 实现 `npm run validate:data:sample`（样板阶段允许 1 组）和最终 `npm run validate:data`（严格 250 组/63 页）。**
- [ ] **Step 5: 运行 `npm test` 与两种校验命令；样板模式通过，完整模式在未录入 250 组时明确失败并报告数量差。**
- [ ] **Step 6: 提交 `feat: add qianziwen lesson data contract`。**

### Task 2：语音资产与播放状态

**Files:** `src/audio.js`、`data/audio-manifest.json`、`assets/audio/qzw-001-normal.mp3`、`assets/audio/qzw-001-slow.mp3`、`assets/audio/chars/{5929,5730,7384,9EC3}.mp3`、`tools/generate-audio.mjs`、`tests/audio.test.mjs`、README 音频章节。

**Interfaces:** `detectAudioEnvironment({userAgent, protocol, speechApi}) -> {androidChrome, webView, filePreview, ttsAvailable}`；`playClip({audioElement, assetUrl, fallbackText, speechApi, onState}) -> Promise<void>`；`pauseClip(audioElement, speechApi, onState) -> void`；`resumeClip(audioElement, speechApi, onState) -> void`；语音状态 `idle | loading | playing | paused | ended | error`。

- [ ] **Step 1: 写失败测试** — Android Chrome/WebView/file-preview 环境识别；正常/慢速/逐字路径映射；缺失 MP3 时 TTS 备用；`play()` rejection；无 SpeechSynthesis；voices 延迟加载/`voiceschanged`；暂停/恢复/重复播放及状态回调。
- [ ] **Step 2: `npm test -- --test-name-pattern=audio`，确认测试先失败。**
- [ ] **Step 3: 实现环境检测与播放器状态机。** 静态 MP3 是主路径；失败时才触发 zh-CN 浏览器 TTS；既有 API 不支持或报错时显式显示错误及重试。TTS 路径分别接入 `pause()`/`resume()`，重播从头开始。
- [ ] **Step 4: 生成器采用 Google Cloud TTS REST API、`cmn-CN-Standard-A` 和 MP3 输出；整组慢速采用 `speakingRate: 0.72`。** 使用 gcloud 当前已配置的访问令牌，避免打印令牌；检查现有项目/额度，缺少配置或需要额外计费即停止并告知用户。保存生成配置、声线、日期、文本及授权出处至 manifest。不得创建项目、开启账单或付费。
- [ ] **Step 5: 生成第一组六个 MP3**：`天地玄黃` 正常、`天地玄黃` 慢速、天、地、玄、黃。检查文件类型、非零长度、可解码和时长；把可播放音频嵌进交付说明供用户试听。此处暂停，等待用户确认声线/速度后才许可批量生成其余音频。
- [ ] **Step 6: 运行音频单测并在桌面浏览器做开发检查。** 这不是 Android 验收。
- [ ] **Step 7: 提交 `feat: add qianziwen audio sample and fallback`。**

### Task 3：标准笔顺及 Android 书写层

**Files:** `src/writing.js`、`data/strokes/{5929,5730,7384,9EC3}.json`、`data/strokes/ARPHICPL.TXT`、`THIRD_PARTY_NOTICES.md`、`tests/writing.test.mjs`。

**Interfaces:** `clientToViewBox(clientX, clientY, rect, viewBox) -> {x:number,y:number}`；`redrawStrokes(context, strokes, dpr, viewport) -> void`；`createWritingSurface({root, character, strokeData, mode}) -> WritingController`，控制器提供 `animate()`, `setMode('trace'|'free')`, `setGuideVisible(boolean)`, `undo()`, `clear()` 和 `destroy()`。

- [ ] **Step 1: 写失败测试** — 叠层共用写字格矩形、client 坐标映射、鼠标/手指 pointer down-move-up、pointercancel 分段、undo/clear、DPR resize 后笔迹重绘。
- [ ] **Step 2: 运行书写单测，确认坐标和状态用例先失败。**
- [ ] **Step 3: 本地 vendoring Hanzi Writer 运行时代码及第一组四字的官方项目数据；将数据、MIT 代码及 Arphic 授权分别保留。** 核对是否覆盖繁体“黃”，并把数据笔画数与项目采用的 PRC 标准笔顺资料逐字核对；未通过即不显示已校订状态。
- [ ] **Step 4: 用同一方形逻辑 viewBox 绘制字帖与动画；书写 canvas 用绝对定位覆盖写字格。** `touch-action:none`、pointer capture、视口/DPR 坐标变换；使用向量笔迹记录支持旋转重绘、撤销和清除；隐藏范字及独立书写不应阻断用户输入。
- [ ] **Step 5: 运行书写单测和桌面 Chrome 集成测试，检查多段笔迹、清除/撤销和重尺寸。**
- [ ] **Step 6: 提交 `fix: align tracing layers and support pointer writing`。**

### Task 4：第一组完整教学页和浏览器集成测试

**Files:** `index.html`、`styles.css`、`src/main.js`、`src/quiz.js`、`assets/illustrations/qzw-001.webp`、`tests/page.spec.mjs`、README。

**Interfaces:** `createQuiz(entries, scope, random=Math.random) -> QuizRound`（`options` 恰为四项且唯一、包含正确答案）；`answerQuiz(round, selectedId) -> {correct, delta, score, feedback}`。

- [ ] **Step 1: 写失败用例** — 页面包含且顺序正确的八个教学区域、移除声调四宫格、没有内部术语、测验选项唯一、答对 +10/答错 -2、重播和积分反馈、窄屏与横屏布局、按钮无障碍标签。
- [ ] **Step 2: 运行 Playwright，确认缺页面/行为使测试失败。**
- [ ] **Step 3: 实现第一组单页样板。** 使用复用原型的暖纸色与书法气质；繁体原文/逐字拼音、普通/慢速/逐字播放、简体释义、单句英语、无字意境插画、笔顺/描红/独立写、听音辨字依用户指定顺序呈现。第一组未核验字段标“待校订”。
- [ ] **Step 4: 启动 `npm run serve -- --host 0.0.0.0`，确认手机可访问的局域网 URL；不部署公开站点，不更改防火墙/安全设置。**
- [ ] **Step 5: 运行全部 Playwright 和 Node 测试，审查横/竖屏桌面布局与所有学员可见文案。**
- [ ] **Step 6: 提交 `feat: build the first qianziwen lesson page`。**

### Gate A：第一组音频与真机验收

- [ ] 把六个 MP3 提供用户试听；等待用户明确确认后，记录获准声线和语速。
- [ ] 从真实 Android Chrome 通过连接的 OnePlus 12 访问本地测试地址。当前环境未检测到 `adb` 命令；先使用现有 O+ Connect 投屏/控制路径确认页面可见，若设备控制不可用再请用户启用/授权适当的设备访问方式。不得读取或暴露连接密码、账号或配对码。
- [ ] 用户在真实设备上完成整组/慢速/逐字点击、暂停与重播；手指连续多笔、抬笔再写；清除、重写、隐藏范字、独立书写；竖屏转横屏再返回。记录实际 Android 与 Chrome 版本及每项结果。
- [ ] 失败项修复并再次实机验证；只有全部通过，Gate A 才通过。不得用桌面/Playwright 模拟覆盖任何真机项。
- [ ] 若无法直接控制手机，则把测试页置于已存在的局域网连接，用户用真实手指操作；Codex观察投屏并收集设备/版本/结果。若同样无法取得真实观测，停在 Gate A，不推广 249 组。

### 阶段 B：试听及真机通过后扩展 249 组

### Task 5：确定并录入全文结构化内容

**Files:** `data/lessons.json`、`data/sources.md`、`tools/validate-content.mjs`、`tests/content.test.mjs`、页面导航代码。

- [ ] 以[维基文库《千字文》繁體頁](https://zh.wikisource.org/wiki/千字文)的正文主读作为初始转录底本；逐组和另一公开全文版本核对，记录页面版本/链接及异文；有疑问时保持 `needs_review`。用户截图只做视觉参考。对每组核对恰好四字、序号及唯一性。
- [ ] 逐字校核标准普通话带调拼音；逐字对照《新华字典》第13版普通话条目，确认语境多音字。每组简体释义先按字面义与必要典故/古义写短说明，再独立编辑一句极简英语注解。记录每项来源和 `verified`/`needs_review` 状态。
- [ ] 生成 250 组数据后执行 `npm run validate:data`；断言 250 项、唯一 ID/序号、每项四字、63 页、末页两项、状态/source 完整。未审核字段可以待审，但不得冒充已校订。
- [ ] 补足数据源在 UI 中的待审标记与页码跳转/前后页/进度；测验从当前页/复习范围抽四个互不重复答案。
- [ ] 跑内容与 UI 回归测试，人工重读 JSON 并核对第一组、最后一组、边界分页及待审核状态。
- [ ] 提交 `feat: add verified qianziwen lesson records`。

### Task 6：批量生成其余音频并完成文档

**Files:** `tools/generate-audio.mjs`、`data/audio-manifest.json`、`assets/audio/`、`README.md`、根 README、`09-learning-library/README.md`。

- [ ] 只有 Gate A 试听确认后，使用同一获批声线及设置，为其余 249 组生成整组正常、整组慢速、四个独立字音频；不改变第一组已获批声线。
- [ ] 对 250 组核验每组普通/慢速/逐字文件路径、格式/解码/非零时长，检查每个音频的来源、声线、生成设置、日期、授权记录；失败资源不得标 `verified`。
- [ ] 更新 README 运行步骤、静态音频路径与许可、笔顺数据格式/授权、内容状态工作流、Android 真机测试步骤、测试结果模板。
- [ ] 修订根 README 过期的项目状态文字并链接此模块；学员页面文案扫描确保没有 `TNCG` 或其他内部缩写。
- [ ] 运行 `npm test`、`npm run validate:data`、浏览器集成测试；重新读取首尾数据、资产 manifest、音频文件列表和 README。以真实 Android Chrome 记录作为验收结论的唯一依据。
- [ ] 提交 `feat: complete 250-set qianziwen module`；不推送、不公开部署，除非后续用户明确要求。

## 验收输出

- 250 组、63 页的统计与首尾组核验记录。
- 第一组 6 个 MP3 可试听的交付和获批的声线/速度记录。
- 笔顺资源/音频资源许可与来源清单。
- 自动化测试/校验输出。
- Android 真机型号、Android/Chrome 版本及音频、描红、多笔、隐藏字、旋转测试逐项记录；未通过时列出未通过项且不得报告功能已修复。
- 所有仍为 `needs_review` 的文本、拼音、释义、英语、图像、音频或笔顺字段列表。
