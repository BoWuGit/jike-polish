# Microsoft Edge Add-ons 提审准备

本目录记录“阅赏”首次提交 Microsoft Edge Add-ons 所需材料和操作。调研与材料更新日期：2026-08-09。

## 当前状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| Chromium/MV3 兼容性 | 已验证 | 已用 Microsoft Edge Stable 151.0.4129.59 加载最终 Edge zip：扩展状态为 Enabled，权限仅限 `https://web.okjike.com/*`，内容脚本在目标站登录页成功注入。 |
| Edge 上传包 | 已可生成 | 运行 `npm run edge:package`，上传生成的 `jike-polish-edge-v<version>.zip`。zip 被 Git 忽略，不要提交。 |
| 无账号审核路径 | 已完成 | Edge 包带工具栏入口和完整离线演示；排版切换、转发卡片、用户卡片、灯箱打开/3× 缩放/关闭均已在 Edge 自动回归。 |
| 必需 Logo | 已准备 | [`store-assets/logo-300.png`](./store-assets/logo-300.png)，300×300 PNG。 |
| 截图 | 已准备 | 1 张 1280×800 PNG，由 Edge 151 实际运行生成，内容均为本地虚构示例。 |
| 商店文案 | 已准备 | 见 [`store-listing.zh-CN.md`](./store-listing.zh-CN.md)。 |
| 审核说明 | 已准备 | 见 [`review-notes.md`](./review-notes.md)。 |
| 隐私政策 | 已发布 | 公开 URL 已显示新版跨浏览器政策。 |
| Partner Center 草稿 | 已完成 | 已创建“阅赏”1.2.7 草稿；程序包、可用性、属性、隐私和简体中文 Store 一览均为 Complete。 |
| 开发者验证与发布 | 待账号所有者 | Partner Center 当前返回 `NotAuthorizedDeveloper`；需要账号所有者在“帐户设置”完成开发者身份验证，最终检查后再点击 Publish。 |

## Edge 包与通用包的区别

Microsoft Edge 基于 Chromium。官方迁移文档说明 Chrome 扩展 API 与 Edge 代码兼容，迁移时主要检查 API 支持、移除 `update_url`、避免在名称/描述中使用“Chrome”，并在 Edge 中侧载测试。[官方迁移文档](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension)

仓库的实际网页增强代码无需 Edge 专属改动。`npm run edge:package` 会基于根 `manifest.json` 生成只用于 Edge 的 manifest：

- 保留 Manifest V3、名称、版本、内容脚本和最小站点权限；
- 把名称、简短说明和工具栏标题放入 `zh_CN` 本地化资源，使 Partner Center 正确识别简体中文商店语言；
- 去掉仅供 Firefox 使用的 `browser_specific_settings.gecko`；
- 增加无权限的工具栏入口，打开内置离线功能演示；
- 把所有可执行 JavaScript 和 CSS 打进 zip。

网络请求只读取目标网站返回的 JSON 数据和媒体地址，不下载或执行远程 JavaScript、WebAssembly 或其他代码。不要把通用的 `jike-polish-v<version>.zip` 当作 Edge 首次审核包；Edge 应上传带离线演示的 `jike-polish-edge-v<version>.zip`。

## 生成和检查上传包

```bash
npm ci
npm run edge:package
EDGE_ZIP="jike-polish-edge-v$(node -p "require('./manifest.json').version").zip"
unzip -t "$EDGE_ZIP"
unzip -l "$EDGE_ZIP"
```

预期 zip 根目录只包含运行所需文件：

- `manifest.json`
- `content.js`
- `icon.png`
- `jike-twitter-font.user.css`
- `jike-polish-page-bridge.js`
- `_locales/zh_CN/messages.json`
- `edge-demo/launcher.html`
- `edge-demo/launcher.css`
- `edge-demo/index.html`
- `edge-demo/platform.css`
- `edge-demo/style.css`
- `edge-demo/script.js`

离线演示复用 Safari 容器演示中已审核的交互脚本和主样式，但生成到独立 Edge 包中，不改变 Chrome/Firefox/Safari 的通用 manifest。不要把仓库、源码目录、截图、凭据或 `node_modules` 放进上传包。版本变化时，zip 文件名会随 `manifest.json` 自动变化。

## Edge 侧载回归

```bash
EDGE_ZIP="jike-polish-edge-v$(node -p "require('./manifest.json').version").zip"
rm -rf /tmp/jike-polish-edge
mkdir -p /tmp/jike-polish-edge
unzip -q "$EDGE_ZIP" -d /tmp/jike-polish-edge
```

1. 打开 `edge://extensions/`，开启“开发人员模式”。
2. 点击“加载解压缩的扩展”，选择 `/tmp/jike-polish-edge`（或你解压到的目录）。
3. 确认扩展只请求访问 `web.okjike.com`。
4. 点击工具栏“阅赏”图标，再点“打开离线功能演示”：
   - 切换原始/优化排版；
   - 查看转发媒体和链接；
   - 悬停或点击 `@清禾` 查看用户卡片；
   - 打开灯箱，测试按钮、滚轮、双击、键盘和拖拽，范围 1×–6×。
5. 如有自己的即刻账号，可用手机 App 扫码登录 `web.okjike.com`，再按 [`review-notes.md`](./review-notes.md) 中的链接测试实际网站集成。
6. 在 DevTools Console 和 `edge://extensions/` 中确认无扩展错误。

目标网站当前会把未登录用户重定向到扫码页，因此不能把公开 URL 当作免登录审核路径；内置离线演示正是为解决这个审核阻塞而加入。

## Partner Center 首次提交流程

1. 先把本分支合并/推送到公开仓库，打开 [隐私政策 URL](https://github.com/BoWuGit/jike-polish/blob/main/PRIVACY.md) 确认已显示 2026-08-09 版本。
2. 使用 Microsoft 个人账号（MSA）进入 [Partner Center Edge dashboard](https://partner.microsoft.com/dashboard/microsoftedge/public/login?ref=dd)。工作或学校账号不能直接作为 Edge Program 的 Primary Owner。
3. 注册 Microsoft Edge Program。注册免费。选择 `Individual` 或 `Company`，并确认国家/地区；**账号类型和国家/地区注册后不能更改**。个人账号验证较快，公司账号可能需要企业材料及数天到数周验证。
4. 点击 **Create new extension**，上传 `jike-polish-edge-v<version>.zip`。
5. **Availability**：建议 `Public`、所有市场。目标网站的中文界面及登录限制已在文案中披露。
6. **Properties**：按 [`store-listing.zh-CN.md`](./store-listing.zh-CN.md) 填写。
7. **Privacy**：按下一节填写，并使用公开隐私政策 URL。
8. **Store listings**：完成程序包识别出的简体中文，将文案、Logo 和离线演示截图上传。
9. **Notes for certification**：粘贴 [`review-notes.md`](./review-notes.md) 的英文部分。
10. 检查所有页面为 Complete 后点击 **Publish**。官方说明认证最长可能需要 7 个工作日。

官方首次发布步骤及字段要求见：[Publish a Microsoft Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)。账号要求见：[Register as a Microsoft Edge extension developer](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)。

## Privacy 表单建议值

这些值以“扩展会访问或传输什么”为口径；虽然开发者不会收到或保留数据，也应保守、完整披露。

### Single Purpose

> 在 web.okjike.com 上增强阅读和媒体浏览体验：优化排版，扩展转发/引用卡片和用户资料预览，并为网站原生图片灯箱提供缩放与平移控制；同时提供只使用本地虚构内容的离线功能演示。

### Permission justification

`https://web.okjike.com/*`：

> 扩展必须在目标网站页面中注入已打包的样式和交互脚本，才能优化排版、增强转发/引用卡片、显示用户悬浮卡片并控制图片灯箱。扩展不会在其他网站运行。离线演示属于扩展本地页面，不使用站点权限。

### Remote code

选择 **No, I am not using remote code**。

说明（如果页面仍要求填写）：

> All executable JavaScript and CSS is included in the submitted package. Network requests retrieve JSON profile/post metadata and user-selected media only; no remote JavaScript, WebAssembly, or other executable code is downloaded or executed. The offline demo uses only packaged local resources.

### Data usage

建议勾选实际网站集成可能访问或处理的类别：

- `Personally identifiable information`：用户资料中的昵称、头像、简介和账号标识；
- `Authentication information`：目标网站已保存的登录/刷新令牌和设备标识；
- `Location`：用户资料可能包含地区；
- `User activity`：用户主动发起的关注/取消关注，以及用于触发界面功能的页面交互；
- `Website content`：动态文字、图片、视频、链接和用户标识。

不要勾选健康、财务或个人通信。勾选三项合规声明：

- 不出售用户数据，除获准用途外不向第三方转移；
- 不将数据用于与扩展单一用途无关的目的；
- 不将数据用于信用或借贷判断。

这里的“处理”只发生在设备、目标网站 API 及目标网站指定的媒体主机之间；开发者不接收或保存数据。离线演示不处理真实用户数据，也不发起网络请求。公开政策必须与这些勾选保持一致。

### Privacy policy URL

<https://github.com/BoWuGit/jike-polish/blob/main/PRIVACY.md>

Microsoft 要求，只要扩展访问、收集或传输个人信息就应选择 Yes 并提供隐私政策；政策还必须说明数据收集、使用、披露和用户控制。政策原文见：[Edge Add-ons developer policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)。

## 商店素材

必需：

- Logo：[`store-assets/logo-300.png`](./store-assets/logo-300.png)，300×300；官方最低 128×128，推荐 300×300。
- 描述：[`store-listing.zh-CN.md`](./store-listing.zh-CN.md) 中的正文，满足 250–10,000 字符要求。

建议上传 [`store-assets/screenshots/edge-offline-demo.png`](./store-assets/screenshots/edge-offline-demo.png)：1280×800，来自 Edge 151 离线演示，画面中的姓名、账号、数据、图片和链接均为本地虚构示例。

不要把 `chrome/store-assets/` 中包含目标网站真实用户资料或动态内容的截图复制到 Edge 商店元数据。[Edge 政策 1.5.4](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies#154-sharing-information-of-non-users) 对发布非用户个人信息有额外同意要求；使用虚构离线素材可以避免不必要的隐私与授权风险。截图本身是可选字段，1 张即可完成本次准备。小型推广图（440×280）、大型推广图（1400×560）和 YouTube 视频也均为可选，本次不阻塞提审。

## 首次发布后的自动化

Edge Add-ons REST API 只能更新**已经发布**的产品包，不能创建新产品或更新商店元数据。因此首次提交必须在 Partner Center 完成。首次通过后，可从 Overview 获取 Product ID，在 Publish API 页面创建 Client ID/API key，再为后续版本接入上传与发布脚本。不要把 API key 写入仓库。

官方 API 文档：[Use the REST API to update an extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api)。

## 官方来源

- [Publish a Microsoft Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)：上传流程、字段、图片规格、最多 6 张截图、250 字描述下限及最长 7 个工作日认证时间。
- [Register as a Microsoft Edge extension developer](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)：免费注册、MSA、个人/公司账号及验证要求。
- [Port a Chrome extension to Microsoft Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension)：Chromium 兼容性和迁移检查项。
- [Developer policies for the Microsoft Edge Add-ons store](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)：单一用途、权限、可测试性、隐私、远程代码和元数据规则。
- [Best practices for extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/best-practices)：安全、隐私、性能、截图和跨版本测试建议。
- [Microsoft Edge Add-ons Update REST API](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api)：首次提交与后续自动更新的能力边界。
