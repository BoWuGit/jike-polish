# 阅赏

适用于即刻 Web 的源码公开美化插件，提升阅读与交互体验。支持 Chrome 和 Microsoft Edge（MV3）、Firefox，并提供 macOS Safari 版本。

## 安装

- [官方网站](https://jikepolish.com)
- [Mac App Store：安装 macOS Safari 版](https://apps.apple.com/cn/app/%E9%98%85%E8%B5%8F/id6794301352?mt=12)
- [Chrome Web Store：安装 Chrome 版](https://chromewebstore.google.com/detail/hnbakdoibeogigpihopfjfjbacfmcfck)
- [Microsoft Edge Add-ons：安装 Edge 版](https://microsoftedge.microsoft.com/addons/detail/%E9%98%85%E8%B5%8F/hlnncldckloekgkkbimpbhlgopjcmbdi)

Microsoft Edge Add-ons 发布材料见 [`edge/README.md`](./edge/README.md)；Firefox/AMO 打包、审核材料与待办见 [`firefox/README.md`](./firefox/README.md)，公开商店版本尚待账号所有者提交。

[隐私政策](./PRIVACY.md) · [Firefox 发布说明](./firefox/README.md) · [Safari 版本说明](./safari/README.md)

## 官方网站

项目 Landing Page 已部署至 <https://jikepolish.com>。源码位于 [`site/`](./site/)，开发与部署说明见 [`site/README.md`](./site/README.md)。

## 布局与字体对比

![开启插件后的即刻 Web](./screenshot.png)

![即刻 Web 原生效果](./screenshot-native.png)

## 功能演示

### 转发详情与用户悬浮卡片

![转发详情与用户悬浮卡片](./chrome/store-assets/screenshots/chrome-user-hover-card.png)

### 图片灯箱缩放

![图片灯箱多级缩放](./chrome/store-assets/screenshots/chrome-lightbox-multi-zoom.png)

## 功能

### 界面与字体优化

将字体、字重、行高改为类 Twitter（Chirp）风格，并附带桌面端居中布局等体验优化。

### 转发/引用卡片增强

信息流和动态详情页里的转发/引用卡片默认保持即刻原生的 2 行折叠，鼠标悬浮或键盘聚焦时自动展开更多正文；原帖带图或链接时，也会在卡片内补充显示图片预览和链接卡片。

- 不需要点进原帖即可快速预览被折叠内容、图片和链接
- 点击图片直接打开灯箱预览，点击链接卡片在新标签页打开链接，点击文字/空白等非附件区域仍进入原帖详情
- 超长内容限制高度，在卡片内滚动，避免撑开整个页面
- 多图最多展示 4 张缩略图，保留原卡片布局、圆角和深色模式样式

### 用户信息悬浮卡片

鼠标悬停在正文 `@用户` 链接上时，弹出资料卡片，展示头像、昵称、简介、性别、地区、行业标签以及关注/被关注数，支持一键关注/取消关注。

- 骨架屏加载态 & 错误提示
- 深色模式自适应
- 滚动穿透：卡片上滚轮事件自动转发给页面滚动容器，同时兼容即刻原生 HoverCard
- 简介完整展示：即刻原生卡片和自定义弹出卡片均移除 2 行截断限制，hover 时可查看完整 bio（类似 Twitter/X 的行为）

### 图片灯箱缩放

在即刻自带的图片灯箱中增加缩放控制：

- 双击放大/还原
- 滚轮缩放（1×–6×）
- 拖拽平移
- 键盘快捷键：`+`/`-` 缩放、方向键与 `Space`/`Shift+Space` 平移、`0` 还原
- 工具栏缩小/放大按钮
- 切换图片时自动重置缩放状态

## 本地开发

内容脚本源码在 `src/content.js`，根目录的 `content.js` 由构建生成（与 `manifest.json` 引用一致）。

1. 安装依赖并构建：`npm install` → `npm run build`
2. 代码检查：`npm run lint`（或 `npm run check`：lint + test + Firefox/Mozilla 构建校验 + Safari 项目校验）
3. Chrome 打开 `chrome://extensions/`；Microsoft Edge 打开 `edge://extensions/`
4. 开启「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择本项目目录
7. Firefox 调试：先运行 `npm run firefox:package`，打开 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择 `build/firefox/manifest.json`

修改 `src/` 下的脚本后请重新执行 `npm run build` 再刷新扩展；修改样式文件后直接刷新扩展即可。Chrome 商店包使用 `npm run release:extension`，带离线审核演示的 Edge 包使用 `npm run edge:package`，Firefox 上传包和 AMO 源码包使用 `npm run firefox:package`。

### Safari（macOS）

Safari 版本要求 macOS 13+、Safari 16+ 和 Xcode：

1. 执行 `npm run safari:build`，完成共享脚本构建、版本校验和 Xcode 编译检查
2. 打开 `safari/JikePolish/JikePolish.xcodeproj`
3. 为 App 和 Extension 两个 target 选择本地 Development Team 后运行
4. 按容器 App 的提示在 Safari 设置中启用扩展，并允许访问 `web.okjike.com`

签名、Bundle ID 修改和 Archive 发布步骤见 [`safari/README.md`](./safari/README.md)。

## 调试说明

- 开启调试日志：在控制台执行 `localStorage.setItem("JIKE_POLISH_DEBUG", "1")`
- 关闭调试日志：`localStorage.removeItem("JIKE_POLISH_DEBUG")`

## 测试页面

- 转发/引用卡片增强（展开 + 原帖图片预览）：<https://web.okjike.com/u/34953782-20EA-4675-9108-FD005F127C53/repost/6a3c111c3d621d7862d5f30c>
- 转发/引用卡片增强（原帖链接卡片预览）：<https://web.okjike.com/u/1656C862-60ED-4CC7-895B-6EE776B46C9A/post/6a4b6d1fae0108c0411560ea>
- 正文 @提及 + 原生 HoverCard：<https://web.okjike.com/u/28e960ee-9e3a-45bb-bee3-d859b34416c1/repost/69c14cecc5a1d4e6497efb7d>
- 长 bio 用户（龙翊Longyi）：<https://web.okjike.com/u/5ca1f20e-e12f-4792-8e1c-bffb2cf1c932>


