# Safari 版本

公开版本已在 [Mac App Store](https://apps.apple.com/cn/app/%E9%98%85%E8%B5%8F/id6794301352?mt=12) 上架，要求 macOS 13+ 和 Safari 16+。安装后启动“阅赏”，再按提示前往 Safari 的“扩展”设置启用即可。

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

该命令会生成根目录的 128×128 扩展图标、Firefox 所需的 16×16/48×48 图标、容器 App 图片，以及 AppIcon 所需的全部 macOS 尺寸。

## 编译检查

```bash
npm install
npm run safari:build
```

该命令会先重新生成全部图标和根目录的 `content.js`，校验版本、图标尺寸和 Xcode 资源列表，再执行无需签名的 Debug 构建。产物位于 `build/safari`，仅用于编译检查。

## 从源码在 Safari 中运行

1. 执行 `npm run build`。
2. 打开 `safari/JikePolish/JikePolish.xcodeproj`。
3. 在 App 和 Extension 两个 target 的 Signing & Capabilities 中选择自己的 Development Team。团队信息只保存在本地，不提交到仓库。
4. 如果默认 Bundle ID 不属于你的团队，同时修改 App、Extension 的 Bundle ID，以及 `JikePolish/ViewController.swift` 中的 `extensionBundleIdentifier`。
5. 选择 `JikePolish` scheme 并运行。
6. 在容器 App 中打开 Safari 设置，启用“阅赏”，并允许访问 `web.okjike.com`。

## 离线功能演示

容器 App 的“打开离线功能演示”无需账号、网络或第三方 App，可独立演示排版优化、转发媒体与链接、用户悬浮卡片以及图片灯箱多级缩放。该模式用于 App Review 和本地功能检查，不会请求任何外部资源。

## 发布

2026-10-09 已通过 App Store Connect CLI 提交 1.2.11（构建号 8），并确认状态为 `WAITING_FOR_REVIEW`。更新记录见 [`submission-1.2.11.json`](../app-store/submission-1.2.11.json)。

发布前执行：

```bash
npm run check
npm run safari:build
```

然后在 Xcode 中选择 Product → Archive，并通过 Organizer 完成签名和分发；也可使用本机已配置的 `asc` CLI 上传签名包并提审。仓库不保存 Development Team、证书、Provisioning Profile 或 App Store Connect 凭据。

版本升级时，`manifest.json`、`package.json`、`package-lock.json` 和 Xcode 工程里的四处 `MARKETING_VERSION` 必须一致；`npm run safari:check` 会验证这些值。

### 本机 App Store Connect 认证

`asc` 使用自己保存在 System Keychain 的认证。2026-10-09 已验证默认 profile `BriefFeedRelease` 能发布“阅赏”；该名称来自另一个项目，认证可以共享，发布目标仍须显式指定“阅赏”的 App ID `6794301352` 和平台 `MAC_OS`。

发布前先检查认证来源和目标应用（以下命令只读）：

```bash
asc auth status
asc versions list --app 6794301352 --platform MAC_OS --output table
```

环境中没有 App Store Connect 凭据并不代表未配置认证。优先复用 `asc auth status` 显示的可用 profile，无需从钥匙串导出私钥。App Store Connect API 认证与本机签名证书、Provisioning Profile 分别配置；认证成功后仍须确认签名归档和导出成功。

构建号需同步修改 Xcode 工程的四处 `CURRENT_PROJECT_VERSION` 与 `scripts/safari.mjs` 的 `SAFARI_BUILD_NUMBER`。商店归档使用已安装的正式版 Xcode，通过命令的 `DEVELOPER_DIR` 指定，避免随系统默认路径选中 beta。当前机器的正式版路径为 `/Applications/Xcode-26.6.0.app/Contents/Developer`，升级 Xcode 后重新核实。
