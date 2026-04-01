# jike-polish

即刻 Web 的个人增强插件，提升阅读与交互体验。支持 Chrome（MV3）和 Firefox。

## 功能

### 界面与字体优化

基于 `jike-twitter-font.user.css`，将字体、字重、行高改为类 Twitter（Chirp）风格，并附带桌面端居中布局等体验优化。

### 用户信息悬浮卡片

鼠标悬停在正文 `@用户` 链接上时，弹出资料卡片，展示头像、昵称、简介、性别、地区、行业标签以及关注/被关注数，支持一键关注/取消关注。

- 骨架屏加载态 & 错误提示
- 深色模式自适应
- 滚动穿透：卡片上滚轮事件自动转发给页面滚动容器，同时兼容即刻原生 HoverCard

### 图片灯箱缩放

在即刻自带的图片灯箱中增加缩放控制：

- 双击放大/还原
- 滚轮缩放（1×–6×）
- 拖拽平移
- 键盘快捷键：`+`/`-` 缩放、方向键与 `Space`/`Shift+Space` 平移、`0` 还原
- 工具栏缩小/放大按钮
- 切换图片时自动重置缩放状态

## 本地开发

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目目录
5. Firefox 调试：打开 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择项目里的 `manifest.json`

## 调试说明

- 开启调试日志：在控制台执行 `localStorage.setItem("JIKE_POLISH_DEBUG", "1")`
- 关闭调试日志：`localStorage.removeItem("JIKE_POLISH_DEBUG")`

## 版本与发布建议

- 当前建议先发布到 private 仓库做迭代测试，确认稳定后再公开。
- 若后续要沿用旧扩展的 Chrome Web Store 上架项继续升级，需保证使用同一开发者账号与同一扩展私钥（即保持扩展 ID 不变）。
