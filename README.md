# jike-polish

即刻 Web 的个人增强插件，包含两部分：

- 界面与字体优化（来自 `jike-twitter-font.user.css`）
- 用户信息悬浮卡片（包含正文 `@用户` 场景的兼容识别）

## 本地开发

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目目录

## 调试说明

- 开启调试日志：在控制台执行 `localStorage.setItem("JIKE_POLISH_DEBUG", "1")`
- 关闭调试日志：`localStorage.removeItem("JIKE_POLISH_DEBUG")`

## 版本与发布建议

- 当前建议先发布到 private 仓库做迭代测试，确认稳定后再公开。
- 若后续要沿用旧扩展的 Chrome Web Store 上架项继续升级，需保证使用同一开发者账号与同一扩展私钥（即保持扩展 ID 不变）。
