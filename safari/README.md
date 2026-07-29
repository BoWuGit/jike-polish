# Safari 版本

这里保存 macOS Safari Web Extension 的 Xcode 容器工程。扩展本身仍直接使用仓库根目录的以下文件，避免维护两份业务代码：

- `manifest.json`
- `content.js`
- `icon.png`
- `jike-twitter-font.user.css`
- `jike-polish-page-bridge.js`

## 环境要求

- macOS 13 或更高版本
- Safari 16 或更高版本
- Xcode
- Node.js/npm

## 图标

`assets/icon-1024.png` 是浏览器和 macOS App 图标的高清母版。修改母版后执行：

```bash
npm run safari:icons
```

该命令会生成根目录的 128×128 扩展图标、容器 App 图片，以及 AppIcon 所需的全部 macOS 尺寸。

## 编译检查

```bash
npm install
npm run safari:build
```

该命令会先重新生成全部图标和根目录的 `content.js`，校验版本、图标尺寸和 Xcode 资源列表，再执行无需签名的 Debug 构建。产物位于 `build/safari`，仅用于编译检查。

## 在 Safari 中运行

1. 执行 `npm run build`。
2. 打开 `safari/JikePolish/JikePolish.xcodeproj`。
3. 在 App 和 Extension 两个 target 的 Signing & Capabilities 中选择自己的 Development Team。团队信息只保存在本地，不提交到仓库。
4. 如果默认 Bundle ID 不属于你的团队，同时修改 App、Extension 的 Bundle ID，以及 `JikePolish/ViewController.swift` 中的 `extensionBundleIdentifier`。
5. 选择 `JikePolish` scheme 并运行。
6. 在容器 App 中打开 Safari 设置，启用“清阅”，并允许访问 `web.okjike.com`。

## 离线功能演示

容器 App 的“打开离线功能演示”无需账号、网络或第三方 App，可独立演示排版优化、转发媒体与链接、用户悬浮卡片以及图片灯箱多级缩放。该模式用于 App Review 和本地功能检查，不会请求任何外部资源。

## 发布

发布前执行：

```bash
npm run check
npm run safari:build
```

然后在 Xcode 中选择 Product → Archive，并通过 Organizer 完成签名和分发。仓库不保存 Development Team、证书、Provisioning Profile 或 App Store Connect 凭据。

版本升级时，`manifest.json`、`package.json`、`package-lock.json` 和 Xcode 工程里的四处 `MARKETING_VERSION` 必须一致；`npm run safari:check` 会验证这些值。
