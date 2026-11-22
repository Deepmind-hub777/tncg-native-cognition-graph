# 千字文样板模块

## 本地运行

- `npm test` — 数据、分页、音频状态、测验与描红单测。
- `npm run test:e2e` — 使用本机 Chrome 的浏览器集成检查。
- `npm run validate:data:sample` — 验证首组数据结构。
- `npm run validate:data` — 全文模式；完整录入前预期失败并报告 1/250。
- `npm run serve` — 在本机启动静态页面（默认监听 `0.0.0.0:4173`）。与手机处于同一局域网时，可在浏览器输入电脑的局域网 IPv4 地址和端口。

不要把此开发服务器公开部署；不需要调整防火墙设置。学员界面只呈现经典文本与学习功能。

## 当前样板状态

第一组 `天地玄黃` 已搭建八段式页面。内容、拼音、解释、英语、插画与笔顺状态仍按记录显示 `needs_review`；截图不作内容来源。只有完成字典/原文/笔顺逐项复核后才能改为 `verified`。

Google Cloud Text-to-Speech 样板请求使用 `cmn-CN-Standard-A` 与 MP3 输出，慢读设为 `0.72`。当前已配置的应用凭证对项目缺少 `serviceusage.services.use` 权限，API 返回 403；六个试听 MP3 尚未生成。不要新建项目、修改账单或引入费用。补足现有项目权限后执行 `GCLOUD_CMD=<gcloud executable> node 09-learning-library/qianziwen/tools/generate-audio.mjs`。试听确认之前，不得生成剩余音频。

## Android 真机验收记录

正式测试时填写以下信息，并逐项记录实际结果：

- 手机型号 / Android 版本：
- Chrome 版本：
- 访问方式 / 局域网：
- 整组播放、暂停、重播：待实测
- 慢读及逐字播放：待实测
- 手指描红、多笔、抬笔再写：待实测
- 清除、撤回、重写、隐藏范字、自由书写：待实测
- 竖屏转横屏及返回后的画布适配：待实测

桌面浏览器自动化不替代任何一项 Android 真机结果。

参阅 `data/sources.md` 与 `THIRD_PARTY_NOTICES.md`，了解内容来源及授权。
