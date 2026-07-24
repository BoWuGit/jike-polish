# App Review Notes

## 中文

这是一个用于 `web.okjike.com` 的开源、非官方 Safari Web Extension。扩展本身不提供或控制即刻账号登录。

重要说明：即刻网页版在未登录时无法访问内容。即刻官方目前只支持使用手机“即刻”App 扫描网页上的短期二维码登录，不提供可复用的用户名和密码，因此我们无法在“登录信息”中提供传统演示账号。

测试步骤：

1. 在 iPhone 上安装官方“即刻”App，并注册或登录即刻账号。
2. 在 Mac 上启动本扩展的容器 App。
3. 打开 Safari 设置，选择“扩展”，启用“即刻 Web 美化”，并允许访问 `web.okjike.com`。
4. 访问 <https://web.okjike.com>，使用手机“即刻”App 扫描网页二维码。
5. 登录后，可使用以下页面测试转发媒体、用户悬浮卡片和图片灯箱缩放：
   - <https://web.okjike.com/u/34953782-20EA-4675-9108-FD005F127C53/repost/6a3c111c3d621d7862d5f30c>
   - <https://web.okjike.com/u/28e960ee-9e3a-45bb-bee3-d859b34416c1/repost/69c14cecc5a1d4e6497efb7d>

提交的 App Store 截图展示了登录后的用户悬浮卡片和灯箱缩放效果。如果审核环境无法使用“即刻”移动 App 扫码，请通过 App Review 消息联系我们，我们可以立即提供录屏或配合验证。

扩展不会向开发者发送任何数据，且与即刻官方不存在隶属、授权或合作关系。

## English

This is an open-source, unofficial Safari Web Extension for `web.okjike.com`. The extension does not provide or control Jike account authentication.

Important: Jike Web does not expose content while signed out. The official service supports web sign-in only through a short-lived QR code scanned with the mobile Jike app; it does not provide reusable username/password credentials. We therefore cannot supply a traditional demo account in the Sign-In Information fields.

To test:

1. Install the official Jike app on an iPhone and create or sign in to a Jike account.
2. Launch this extension's containing app on the Mac.
3. In Safari Settings, select Extensions, enable “即刻 Web 美化”, and allow access to `web.okjike.com`.
4. Visit <https://web.okjike.com> and scan its QR code with the mobile Jike app.
5. After signing in, use the two URLs above to test repost media, user hover cards, and image-lightbox zoom controls.

The submitted App Store screenshots show the authenticated hover card and lightbox controls. If the review environment cannot use the mobile Jike app, please contact us through App Review messages; we can promptly provide a screen recording or assist with verification.

The extension sends no data to the developer and is not affiliated with Jike.
