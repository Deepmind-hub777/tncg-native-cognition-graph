# 内容与资源来源记录

本文件记录来源与核验状态；任何 `needs_review` 项不得视作正式校订结果。

| 内容 | 来源 / 方法 | 状态 |
|---|---|---|
| 繁體原文 | [维基文库《千字文》固定版本](https://zh.wikisource.org/w/index.php?title=千字文&oldid=13033228)，主文转录为 `data/corpus-source.txt`，经 OpenCC S2T 并按繁简合并处手工区分字形；[维基百科《千字文》字数说明](https://zh.wikipedia.org/wiki/千字文#字数)记录这些合并示例。版本异文尚未逐组复核 | 全部 `needs_review` |
| 拼音 | 第 1 组保留已录入值；第 2–250 组为 pypinyin 0.55.0 草稿，少量常见语境读音有显式覆盖；仍须按《新华字典》第13版逐字核对 | 全部 `needs_review` |
| 简体解释 | 第 1 组保留已录入解释；第 2–250 组明确显示「释义待校订」，尚未编写可靠释义 | 全部 `needs_review` |
| 释义拼音 | 第 1 组逐字对齐；其他组只给占位词「释义待校订」配置对齐读音，正式释义完成后必须重新生成/复核 | 全部 `needs_review` |
| 英语注解 | 第 1 组保留已录入短注；其余为 “Meaning pending review.” 占位，不是正式注解 | 全部 `needs_review` |
| 意境插画 | 第 1 组本地无字插画；第 2–250 组只有待创作的提示词，没有图片资产 | 全部 `needs_review` |
| 普通话音频 | Google Cloud Text-to-Speech `cmn-CN-Standard-A`，MP3，服务条款见 [Google TTS 使用说明](https://cloud.google.com/text-to-speech/docs/basics)；第 1 组样音用户已试听并报告安卓播放正常，自动生成资产仍待逐项听审 | 全部 `needs_review` |
| 标准笔顺 | `hanzi-writer-data` 2.0.1（Make Me a Hanzi / Arphic 数据），按 Arphic Public License；1000 个不同字中 990 个有本地数据，10 个缺字列于模块 README。尚未逐字与正式规范来源核验 | 全部 `needs_review` |
| 笔顺动画运行时 | Hanzi Writer 3.7.3，MIT License；本地 vendored | 源码版本已记录 |
维基文库主文含有编者列出的异文。源文本文件暂按常见通行字形整理，并转换为繁体；此整理没有被视为版本审定。截图不用于确定原文、拼音或笔顺。所有尚未逐项核实的教学字段维持 `needs_review`。
