# Microsoft Edge Certification Notes

## English — detailed reference

“阅赏” (Yueshang) is an open-source, unofficial extension with an original name and icon. It has no extension-owned account, subscription, payment, advertising, analytics, telemetry, or tracking. Its live website integration runs only on `https://web.okjike.com/*`.

### Offline review — no account or network required

The submitted Edge package includes a complete offline feature demo so every primary feature can be reviewed without credentials, network access, or another app:

1. Click the “阅赏” toolbar icon.
2. Click `打开离线功能演示` (Open offline feature demo). A full-page extension tab opens.
3. In `排版优化` (Typography and layout), switch between `原始布局` (Original) and `优化后` (Polished).
4. Open `转发与用户卡片` (Repost and profile card). Inspect the embedded repost image/link and hover over or click `@清禾` to show the profile card.
5. Open `图片灯箱` (Image lightbox), click the sample image, and test the `−`/`+` buttons, mouse wheel, double-click, drag, arrow keys, and `0`. Zoom is limited to 1×–6×.

The demo uses fictional content and local files packaged with the extension. Its Content Security Policy is `default-src 'self'`, and it makes no network requests.

### Optional live integration test

The third-party target website currently redirects signed-out visitors to its QR-code sign-in page. The extension itself never requests credentials, but testing the live integration requires an existing target-site session controlled by that service. We cannot provide or redistribute a third-party account or authentication token for security and account-policy reasons. This does not block certification because the offline demo above reproduces all primary extension interactions.

After signing in to the target website with its mobile app, these pages can be used:

1. Repost/quote expansion and original-post image preview:  
   https://web.okjike.com/u/34953782-20EA-4675-9108-FD005F127C53/repost/6a3c111c3d621d7862d5f30c
2. Original-post link preview:  
   https://web.okjike.com/u/1656C862-60ED-4CC7-895B-6EE776B46C9A/post/6a4b6d1fae0108c0411560ea
3. @mention/profile hover-card trigger:  
   https://web.okjike.com/u/28e960ee-9e3a-45bb-bee3-d859b34416c1/repost/69c14cecc5a1d4e6497efb7d

All executable JavaScript and CSS is included in the submitted Manifest V3 package. The extension does not download or execute remote code. During live use, HTTPS requests to `https://api.ruguoapp.com/` retrieve target-site JSON profile/post/media metadata, refresh the target-site session, or perform a follow/unfollow action explicitly requested by the user. Authentication data is sent only back to the target service that issued it and never to the developer. Media URLs returned by that service are used only as image/video resources, not executable code.

Privacy policy: https://github.com/BoWuGit/jike-polish/blob/main/PRIVACY.md  
Source code and documentation: https://github.com/BoWuGit/jike-polish  
Support: https://github.com/BoWuGit/jike-polish/issues

The extension is not affiliated with, authorized by, endorsed by, or sponsored by the operator of the supported website.

## Exact text submitted — under 2,000 characters

```text
Yueshang (阅赏) is an open-source, unofficial extension. Version 1.2.10 only fixes repost card background and text colors in dark mode. It has no extension-owned account, payment, advertising, analytics, telemetry, or tracking. Live integration runs only on https://web.okjike.com/*.

OFFLINE REVIEW — NO ACCOUNT OR NETWORK REQUIRED
1. Click the 阅赏 toolbar icon.
2. Click 打开离线功能演示 (Open offline feature demo).
3. In 排版优化, switch between 原始布局 and 优化后.
4. Open 转发与用户卡片; inspect the repost image/link and hover or click @清禾 to show the profile card.
5. Open 图片灯箱, click the sample image, and test −/+, wheel, double-click, drag, arrow keys, and 0. Zoom range is 1×–6×.

The demo uses only fictional, packaged local content, has CSP default-src 'self', and makes no network requests. It covers every primary interaction.

OPTIONAL LIVE TEST
The third-party website requires QR sign-in through its mobile app. We cannot provide or redistribute a third-party account/token. After signing in, test:
Repost/profile card: https://web.okjike.com/u/34953782-20EA-4675-9108-FD005F127C53/repost/6a3c111c3d621d7862d5f30c
Link preview: https://web.okjike.com/u/1656C862-60ED-4CC7-895B-6EE776B46C9A/post/6a4b6d1fae0108c0411560ea

All executable JS/CSS is packaged; no remote code is downloaded or executed. Live HTTPS requests only retrieve target-site data or perform an explicit user-requested action. Authentication data goes only to the service that issued it, never to the developer.

Privacy: https://bowugit.github.io/jike-polish/privacy/
Source/support: https://github.com/BoWuGit/jike-polish

Not affiliated with or endorsed by the supported website operator.
```

## 中文备份

“阅赏”是一款采用原创名称和图标的开源、非官方扩展。扩展没有自有账号、订阅、付款、广告、分析、遥测或追踪；实际网站集成只在 `https://web.okjike.com/*` 上运行。

### 离线审核（无需账号或网络）

1. 点击工具栏中的“阅赏”图标。
2. 点击“打开离线功能演示”，在完整页面中打开本地演示。
3. 在“排版优化”中切换“原始布局”和“优化后”。
4. 打开“转发与用户卡片”，检查内嵌图片和链接，并悬停或点击 `@清禾` 显示资料卡片。
5. 打开“图片灯箱”，点击示例图，使用按钮、滚轮、双击、拖拽、方向键和 `0` 测试 1×–6× 缩放。

演示只使用扩展包内的虚构内容和本地文件，CSP 为 `default-src 'self'`，不会发起网络请求。

### 可选的实际网站测试

第三方目标网站目前会把未登录访问者重定向到 App 扫码登录页。扩展本身不索取凭据，但实际网站集成需要该第三方服务控制的已有会话。出于账号安全和第三方账号政策，开发者不能提供或转交第三方账号或 Token。完整离线演示已覆盖全部主要交互，因此无需第三方账号也可以完成审核。

所有可执行 JavaScript 和 CSS 都包含在 MV3 上传包内，不下载或执行远程代码。扩展不会向开发者发送或保存用户数据。本项目与目标网站运营方不存在隶属、授权、认可或合作关系。
