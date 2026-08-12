# Firefox / AMO 发布准备

本目录记录“阅赏”Firefox 桌面版的兼容性、打包、审核材料和 addons.mozilla.org（AMO）提交流程。调研与材料更新日期：2026-08-12。

## 当前状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| Firefox MV3 兼容代码 | 已验证 | 已用 Firefox 153.0.3 通过 `web-ext` 临时安装并稳定启动；业务代码不依赖 Chromium 专属 API。 |
| 最低版本与数据同意 | 已完成 | Firefox 142+；使用 Firefox 内置安装时数据同意机制，并与 Mozilla 校验器对桌面/Android manifest 能力的统一版本判断保持一致。 |
| 稳定扩展 ID | 已固定 | `jike-polish@bowugit.github.io`。首次签名后不得修改，否则 Firefox 会视为另一个扩展。 |
| Firefox 上传包 | 已可生成 | `npm run firefox:package` 生成 `jike-polish-firefox-v<version>.zip`。 |
| AMO 源码包 | 已验证 | 同一命令生成源码包；已从全新解压目录执行 `npm ci` 并逐字节复现 Firefox 上传包。 |
| Mozilla 静态校验 | 已通过 | 官方 `web-ext lint`：0 errors、0 notices、0 warnings。 |
| 无账号审核路径 | 已完成 | 工具栏入口可打开完全本地、使用虚构内容的功能演示。 |
| 商店文案和审核说明 | 已准备 | [`amo-metadata.json`](./amo-metadata.json) 可供 API 提交，人工字段见 [`store-listing.md`](./store-listing.md)。 |
| 截图 | 已准备 | 1280×800、本地虚构内容，见 [`store-assets/screenshots/firefox-offline-demo.png`](./store-assets/screenshots/firefox-offline-demo.png)。 |
| 真实站点登录回归 | 待账号所有者 | 需要用自己的目标网站扫码登录，按本页清单复测资料卡、转发媒体和灯箱。 |
| AMO 首次提交 | 待账号所有者 | 需要 Mozilla Account，并确认许可证、隐私政策字段和最终文案。 |
| 后续版本自动提交 | 已接入 | `npm run release:firefox -- --mode submit --confirm`；需要 AMO JWT issuer/secret。 |

## 为什么要求 Firefox 142+

Mozilla 从 2025-11-03 起要求新扩展在 manifest 中声明其收集或传输的数据。Firefox 桌面版从 140 起提供内置数据同意提示；如果继续支持 139 及更早版本，扩展还必须自行实现一个安装后不可错过的同意页面和禁用数据传输的控制。

Mozilla 的静态校验器会同时校验桌面与 Android manifest 能力，而 `data_collection_permissions` 在其 Android 兼容数据中从 Firefox 142 起可用。虽然本项目不声明 `gecko_android`、也不面向 Android 发布，为保持上传包零静态警告，仍选择 `strict_min_version: 142.0`。当前 manifest 保守声明以下必需类别：

- `authenticationInfo`：向目标服务刷新或携带其现有登录令牌；
- `personallyIdentifyingInfo`：请求用户资料时使用用户名或用户 ID；
- `locationInfo`：资料卡可能处理目标服务返回的地区字段；
- `personalCommunications`：转发详情可能处理目标服务返回的公开动态内容；
- `websiteActivity`：发送用户明确触发的关注/取消关注操作；
- `websiteContent`：请求动态、图片、视频、链接及资料元数据。

这些数据只在用户设备与目标网站/API/其指定的媒体主机之间传输，开发者不接收。详细口径必须与根目录 [`PRIVACY.md`](../PRIVACY.md) 保持一致。

## Firefox 包与通用包的区别

Firefox 包基于根 `manifest.json`，但由 [`scripts/package-firefox.mjs`](../scripts/package-firefox.mjs) 在 `build/firefox/` 生成专用运行目录：

- 保留 MV3、稳定 Gecko ID、Firefox 142+ 和内置数据声明；
- 使用真实的 16×16、48×48、128×128 图标，避免 AMO 图标尺寸警告；
- 增加无额外权限的工具栏入口和离线功能演示；
- 只包含运行所需文件，不包含仓库、凭据、截图、测试或 `node_modules`；
- 同时生成可复现构建所需的 AMO 源码包。

Firefox 桌面 MV3 内容脚本的跨域请求遵循页面 CORS。目标 API 当前明确允许 `Origin: https://web.okjike.com` 及扩展使用的请求头，因此无需增加 `api.ruguoapp.com` 主机权限或后台代理。若目标服务未来改变 CORS，需改为扩展后台请求并重新评估权限和数据声明。

本次不声明 `gecko_android`：目标是桌面网站，布局、鼠标悬浮和灯箱交互也按桌面端设计，因此不在 Firefox for Android 上架。

## 生成和检查上传包

```bash
npm ci
npm run firefox:package

VERSION=$(node -p "require('./manifest.json').version")
unzip -t "jike-polish-firefox-v${VERSION}.zip"
unzip -l "jike-polish-firefox-v${VERSION}.zip"
unzip -t "jike-polish-firefox-source-v${VERSION}.zip"
```

Firefox 上传包预期只包含：

- `manifest.json`
- `content.js`
- `jike-polish-page-bridge.js`
- `jike-twitter-font.user.css`
- `icon.png`
- `icons/icon-16.png`
- `icons/icon-48.png`
- `firefox-demo/launcher.html`
- `firefox-demo/launcher.css`
- `firefox-demo/index.html`
- `firefox-demo/platform.css`
- `firefox-demo/style.css`
- `firefox-demo/script.js`

源码包内的 [`BUILD.md`](./BUILD.md) 是给 AMO 审核者的英文复现说明。因为运行文件由 esbuild 合并模块，即使没有压缩或混淆，也必须为每个 AMO 版本上传源码包。

## 本地侧载与回归

### 临时载入最终 Firefox 目录

```bash
npm run firefox:package
```

1. 打开 `about:debugging#/runtime/this-firefox`。
2. 点击 **临时载入附加组件**。
3. 选择 `build/firefox/manifest.json`，不要选择仓库根目录。
4. 点击工具栏“阅赏”图标，打开离线演示并检查：
   - 原始/优化排版切换；
   - 转发图片与链接；
   - `@清禾` 资料卡；
   - 灯箱 1×–6×、滚轮、双击、键盘和拖拽。
5. 如有自己的目标网站账号，再打开 `https://web.okjike.com/` 回归真实页面。
6. 在页面 Console、Browser Console 和 `about:debugging` 中确认没有扩展错误。

也可以让 `web-ext` 启动独立临时 Firefox profile：

```bash
npm run firefox:run
```

## AMO 首次提交（账号所有者）

首次提交建议在 [AMO Developer Hub](https://addons.mozilla.org/developers/addon/submit/) 人工完成，这样可在最终提交前完整确认隐私政策、许可证、支持链接和截图：

1. 使用 `<MOZILLA_ACCOUNT_EMAIL>` 注册或登录 Mozilla Account，并验证邮箱。
2. 选择 **On this site**（公开列在 AMO）。
3. 上传 `jike-polish-firefox-v<version>.zip`。
4. 平台只选择 **Firefox**，不要选择 Firefox for Android。
5. 选择需要提供源码，上传同版本的 `jike-polish-firefox-source-v<version>.zip`。
6. 按 [`store-listing.md`](./store-listing.md) 填写中英文文案、分类、支持链接和隐私政策。
7. 上传 [`store-assets/screenshots/firefox-offline-demo.png`](./store-assets/screenshots/firefox-offline-demo.png)。
8. 粘贴 [`review-notes.md`](./review-notes.md) 的英文审核说明。
9. 确认 manifest 展示的数据类别和隐私政策一致后提交审核。
10. 提交后把公开 AMO URL 补到根目录 `README.md`。

### 提交前必须确认的许可证

仓库当前没有 `LICENSE` 文件，因此 [`amo-metadata.json`](./amo-metadata.json) 保守使用 `all-rights-reserved`。如果产品应以 MIT、MPL-2.0 等开源许可证发布，账号所有者必须先确认版权和许可证，添加相应 `LICENSE`，再同步修改 AMO metadata。不要在未确认的情况下把 AMO 许可证改成开源许可证。

## 后续版本自动提交

AMO 列表创建后，到 [AMO API Keys](https://addons.mozilla.org/developers/addon/api/key/) 创建个人 JWT 凭据，只通过进程环境注入：

```bash
export WEB_EXT_API_KEY="<AMO_JWT_ISSUER>"
export WEB_EXT_API_SECRET="<AMO_JWT_SECRET>"
npm run release:firefox -- --mode submit --confirm
```

默认命令只检查和打包：

```bash
npm run release:firefox
npm run release:firefox -- --mode submit --dry-run
```

提交模式要求 Git 工作区干净，会自动执行 lint、测试、跨平台版本/图标校验、构建、Mozilla lint，并把源码包一起上传。首次提交仍应走上方人工流程，确保隐私政策、许可证、支持链接和截图在提交审核前一起确认；脚本不依赖公开商店可见性判断，因此也不会误挡尚未公开或仍在审核中的已有 listing。

凭据不得写入仓库、`.env`、命令输出或文档。AMO API 提交只表示进入签名/审核流程，不保证立即公开；最终状态在 [Developer Hub](https://addons.mozilla.org/developers/addons) 查看。

## Mozilla 静态校验结果

最终 Firefox 目录运行 `web-ext lint` 的结果为 0 个错误、0 个警告。最低版本采用 Firefox 142，原因见上方“为什么要求 Firefox 142+”；本项目仍不声明或发布 Firefox for Android。

## 官方来源

- [Firefox built-in consent for data collection and transmission](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)：Firefox 140+、2025-11-03 新扩展要求、数据分类和旧版兼容要求。
- [browser_specific_settings](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)：MV3 签名所需 ID、数据声明和 Gecko 版本范围。
- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)：首次提交、公开分发、源码和隐私政策字段。
- [Source code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)：模块打包器产物必须附源码及可复现说明。
- [web-ext command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)：lint、listed channel、JWT 环境变量、metadata 和源码上传。
- [Manifest V3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)：Firefox MV3 权限、CORS、WAR 和 CSP 差异。
- [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)：最小权限、禁止远程代码、数据披露与用户控制。
