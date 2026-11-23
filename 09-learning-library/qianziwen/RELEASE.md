# 千字文互动学习 · 交付版本记录

- 版本：`qzw-v0.1-base`
- 冻结日期：2026-11-23
- 对应分支：`feature/qianziwen-module`，标签 `qzw-v0.1-base`（具体提交用 `git show qzw-v0.1-base` 查看）
- 定位：可运行、可审计、内容待终审的基线交付；**不属于**内容已定稿版本

## 一、交付包

| 项目 | 值 |
| --- | --- |
| 文件 | `outputs/qzw-v0.1-base.zip`（仓库外，未入库） |
| ZIP 字节 | 64,783,122 |
| ZIP SHA-256 | `bc39aa9b67087d40c06e8f4e03437bdec35671518bbb3ba4dc65b58d3b67298f` |
| 内容字节 | 68,038,391 |
| 打包条目 | 2,788 个文件 + 1 份清单 |
| 复现命令 | `python tools/package_release.py`（默认输出 `../outputs/qzw-v0.1-base.zip`） |
| 复现性 | 同一输入连跑两次，ZIP SHA-256 完全相同 |

包内自带 `RELEASE-MANIFEST.sha256`：逐文件 sha256 + 字节数，共 2788 行；本轮已逐条回读校验，异常 0。

包内结构：`index.html`、`styles.css`、`src/`、`site/`、`vendor/`、`data/`、`assets/`、`tools/`、`tests/`、README 与任务文档。版本记录 `RELEASE.md` 不入包（它记录包哈希，进包会自指）。`outputs/`、`node_modules/`、`test-results/` 不入包。

## 二、资产口径（与磁盘一致）

| 资产 | 数量 | 说明 |
| --- | --- | --- |
| 课程组 | 250 | 63 页；第 1 组为样板，第 2–250 组仍 `needs_review` |
| 插画 | 250 | `qzw-001.png` 样板 + `qzw-002..250.jpg`，1536×1024 |
| 常速整句音频 | 250 | 其中 24 组按校正读音重合成 |
| 慢速整句音频 | 250 | 同上 |
| 单字音频 | 1000 | 未随组内读音变更重造（见遗留） |
| 笔顺数据 | 990 | 缺 10 个异体字（见遗留） |
| 释义/英文注 | 249 组 | 本轮修 7 处释义、5 处英文注、24 处拼音 |

## 三、本轮校验结果

- `node tools/validate-content.mjs`：250 组 / 63 页通过
- Node 单测：22/22（content 6、audio 11、pagination 1、quiz 1、writing 3）
- Playwright 端到端：12/12（主页面 7、试听页 5）
- 线上抽查：`/`、`/site/index.html`、`/data/lessons.json`、音频与插画均为 200
- 字段状态：全量 `needs_review`，无 `verified`

## 四、遗留与边界（交付时必须交代）

1. **内容未终审**：250 组释义、英文注、拼音均 `needs_review`。本轮只修“明显错漏”，不构成专家审校。
2. **笔顺缺 10 字**：爲 U+7232、凊 U+51CA、羣 U+7FA3、磻 U+78FB、寔 U+5BD4、俶 U+4FF6、輶 U+8F36、煒 U+7152、牀 U+7240、絃 U+7D43。三个开源数据源均无收录，页面以占位卡降级。要闭合需覆盖繁体异体的笔画中轴数据（付费字库或教育部原始资料）。
3. **单字音频未重造**：`assets/audio/chars/` 1000 条按字的常用读音录制，与组内校正读音（如 說 yuè、稽 qǐ）不一致；组级整句音频已按校正读音重合成。
4. **真机未验收**：分页、音频、多笔触控、清除、显隐范字、旋转适配只做过桌面与模拟视口，未做 Android Chrome 真机验收。
5. **两处异读已按定案处理**：013 巨阙 jù què、051 景行 jǐng xíng，依据见 `data/annotation-wiki-base.md` 第八节；`háng` 作异读保留在注记。

## 五、变更日志（本轮三段）

1. **释义基线核对**：按维基文库 `oldid=13033228` 比对 249 组，修 24 处拼音、7 处释义、5 处英文注；产出 `data/annotation-wiki-base.md`；24 组读音变更连带重合成 48 个音频，读音覆写集合由 3 组扩至 27 组。
2. **两处存疑定案**：013 定 `què`、051 定 `jǐng xíng`，数据不变，依据入档。
3. **试听页与笔顺段**：试听页补 5 条端到端用例并修两个真 bug（跳转表单缺 `novalidate`、`img[hidden]` 被 `display:block` 覆盖）；首页加试听入口；`serve.mjs` 补 JPG MIME 与目录索引；笔顺缺字改为占位卡并列出待补清单。

## 六、复现与核验命令

```powershell
# 数据与内容
node tools/validate-content.mjs
foreach ($t in 'content','audio','pagination','quiz','writing') { node --test "tests/$t.test.mjs" }

# 端到端（在 worktree 根目录）
npx playwright test --reporter=line

# 交付包
python tools/package_release.py
Get-FileHash outputs/qzw-v0.1-base.zip -Algorithm SHA256
```
