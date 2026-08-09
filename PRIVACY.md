# 隐私政策 / Privacy Policy

最后更新：2026 年 8 月 9 日

“阅赏”是一款开源、非官方的浏览器扩展。本政策主要说明 Microsoft Edge 版；相同的数据处理方式也适用于 Chrome、Firefox 和 Safari 版本。扩展的网页功能仅在 `https://web.okjike.com/` 上运行。

## 扩展处理的数据

为提供排版优化、转发/引用卡片、用户资料卡片和图片灯箱功能，扩展可能在用户设备上处理：

- 当前页面中的公开内容和标识符，例如动态、用户、图片、视频及链接信息；
- 目标网站返回的用户资料，例如头像、昵称、简介、性别、地区、行业标签和关注数据；
- 目标网站已保存在其自身站点存储中的登录令牌和设备标识；
- 用户明确发起的关注或取消关注操作。

扩展不会将这些数据发送给开发者或开发者控制的服务器，也不会出售这些数据，或将其用于广告、分析、遥测、信用评估及与扩展功能无关的用途。

## 数据使用与传输

- 扩展仅为上述用户可见功能处理数据。
- 为读取用户资料、补充转发媒体、刷新目标网站会话，以及执行用户主动点击的关注或取消关注操作，扩展会通过 HTTPS 将所需标识符、请求内容、登录令牌或设备标识发送至目标网站的 API（`https://api.ruguoapp.com/`）。登录信息只会发送回提供该登录会话的目标服务，不会发送给开发者。
- 扩展展示目标网站返回的图片、视频或链接预览时，浏览器可能会向目标网站指定的媒体或内容主机请求这些资源；扩展不会在这些资源请求中附加目标网站的登录令牌。
- 内置离线功能演示仅使用随扩展打包的虚构内容和本地资源，不发起网络请求。
- 扩展不包含广告、分析、遥测或用户追踪功能。

## 存储与保留

扩展不在开发者服务器上保存任何用户数据，也不创建独立的扩展账号。页面运行期间，部分资料和媒体信息可能只在内存中短暂缓存，并在页面关闭或重新加载后清除。登录令牌仍保存在目标网站自己的站点存储中；如果目标网站 API 刷新了令牌，扩展可能更新相同的站点存储项，但不会复制到扩展专用存储或其他位置。

## 用户控制与数据权利

用户可以随时通过浏览器的扩展管理页面撤销扩展对 `web.okjike.com` 的访问权限、停用或卸载扩展。退出目标网站账号或清除该网站的站点数据，可以删除浏览器中保存的登录令牌。关注或取消关注仅在用户主动操作时发生，并可通过目标网站再次更改。

由于开发者不接收或保存用户数据，开发者没有可供访问、更正或删除的服务器端用户副本。目标网站账号及其保存的数据应通过目标网站提供的账号和隐私控制进行管理。

## 第三方服务与独立性

用户访问目标网站、其 API 以及其指定的媒体或内容主机时，适用相应服务自身的条款和隐私政策。“阅赏”与目标网站的运营方不存在隶属、授权、认可或合作关系。

## 联系方式

如对本隐私政策有疑问，请通过 GitHub Issues 联系：
https://github.com/BoWuGit/jike-polish/issues

---

# Privacy Policy

Last updated: August 9, 2026

“阅赏” (Yueshang) is an open-source, unofficial browser extension. This policy primarily describes the Microsoft Edge extension; the same data practices also apply to the Chrome, Firefox, and Safari versions. Its webpage features run only on `https://web.okjike.com/`.

## Data processed by the extension

To provide typography and layout improvements, repost/quote cards, profile hover cards, and image lightbox controls, the extension may process on the user's device:

- Public content and identifiers on the current page, such as post, user, image, video, and link information;
- Profile information returned by the target service, such as avatars, display names, biographies, gender, region, industry tags, and follow statistics;
- Authentication tokens and a device identifier already stored in the target website's own site storage; and
- Follow or unfollow actions explicitly initiated by the user.

The extension does not send this data to the developer or any developer-controlled server. It does not sell this data or use it for advertising, analytics, telemetry, credit assessment, or any purpose unrelated to the extension's user-facing features.

## Use and transmission

- Data is processed only to provide the user-facing features described above.
- To retrieve profiles, supplement repost media, refresh the target-service session, and carry out a user-requested follow or unfollow action, the extension sends the required identifiers, request data, authentication token, or device identifier over HTTPS to the target service's API at `https://api.ruguoapp.com/`. Authentication information is sent only back to the target service that issued the session and is never sent to the developer.
- When the extension displays an image, video, or link preview returned by the target service, the browser may request that resource from a media or content host selected by the target service. The extension does not attach the target-service authentication token to those resource requests.
- The built-in offline feature demo uses only fictional content and local resources packaged with the extension and makes no network requests.
- The extension contains no advertising, analytics, telemetry, or user tracking.

## Storage and retention

No user data is stored on developer servers, and the extension creates no separate user account. Some profile and media information may be cached temporarily in memory while a page is open and is cleared when the page is closed or reloaded. Authentication tokens remain in the target website's own site storage. If the target API refreshes a token, the extension may update the same site-storage entry, but it does not copy the token into extension-specific storage or elsewhere.

## User controls and data rights

Users can revoke the extension's access to `web.okjike.com`, disable it, or uninstall it at any time from Microsoft Edge's extension management page. Signing out of the target website or clearing its site data removes authentication tokens saved by that website. Follow and unfollow changes occur only after an explicit user action and can be changed again through the target website.

Because the developer neither receives nor retains user data, the developer has no server-side user-data copy to access, correct, or delete. Account data held by the target service should be managed through that service's account and privacy controls.

## Third-party services and independence

Use of the target website, its API, and media or content hosts selected by it is governed by the applicable services' own terms and privacy policies. “阅赏” is not affiliated with, authorized by, endorsed by, or sponsored by the operator of the target website.

## Contact

For privacy questions, contact the developer through GitHub Issues:
https://github.com/BoWuGit/jike-polish/issues
