# 阅赏 Landing Page

零框架静态站点，使用 Cloudflare Workers Static Assets 部署。站点源码均在 `site/`，Cloudflare 配置在根目录 `wrangler.jsonc`。

## 本地预览

```bash
npm install
npm run site:dev
```

打开 Wrangler 输出的本地地址（通常是 `http://localhost:8787`）。

## 部署

部署凭据只通过环境变量或 Wrangler 本地登录提供，不要写入仓库：

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
npm run site:deploy
```

Worker 名称为 `jike-polish-site`。正式地址：

> https://jikepolish.com

`workers_dev` 已关闭，生产访问统一使用自定义域名。

## 自定义域名

`wrangler.jsonc` 已通过 Custom Domain route 将主域名绑定到 Worker：

```jsonc
"routes": [{ "pattern": "jikepolish.com", "custom_domain": true }]
```

正式入口直接由 Cloudflare Worker 的自定义域名提供服务。域名 zone 与 Worker 必须位于同一个 Cloudflare 账户。后续如更换域名，应同步更新首页 canonical、Open Graph URL、`robots.txt` 和 `sitemap.xml`。

## 中国内地访问验证

在内地测点从仓库根目录运行 `bash scripts/probe-site.sh 3`。有待验证的加速入口时，把它作为第二个参数传入，例如 `bash scripts/probe-site.sh 6 https://candidate.example.com`。脚本对首页、隐私页、样式和两张截图发起无代理 GET，交替安排两条线路的先后顺序。TSV 记录包含 HTTP 状态、DNS、TCP、TLS、首字节、完整耗时、下载字节数、curl 退出码和解压后响应体的 SHA-256。各阶段时间从请求开始计算，单位为秒。HTTP 200 后下载超时也算失败。对照时核对成功样本的摘要，避免把错误页或不同版本算进同一组结果。

以下为配对 HTTPS 请求的汇总。中位数和 P95 仅统计通过内容校验的完整下载，超时计入完成率。

| 测试网络 | 直连完成数 | 候选线路完成数 | 直连中位数 / P95 | 候选线路中位数 / P95 |
| --- | ---: | ---: | ---: | ---: |
| 中国内地云服务器 | 43/50 | 50/50 | 1.35 秒 / 4.54 秒 | 0.67 秒 / 1.29 秒 |
| 中国内地云服务器复测 | 20/30 | 30/30 | 1.25 秒 / 3.97 秒 | 1.06 秒 / 3.28 秒 |
| 中国内地 5G 蜂窝 | 30/30 | 29/30 | 1.25 秒 / 5.93 秒 | 1.51 秒 / 2.62 秒 |
| 中国内地 5G 蜂窝晚高峰 | 27/30 | 29/30 | 3.23 秒 / 8.29 秒 | 1.09 秒 / 3.48 秒 |
| 另一运营商 5G 蜂窝晚高峰 | 28/30 | 28/30 | 2.18 秒 / 7.09 秒 | 2.68 秒 / 7.81 秒 |

云服务器两轮测试中，候选线路完成率更高。三轮蜂窝测试合计，直连完成 85/90，候选线路完成 86/90，速度优势随运营商和时段变化。正式站采用 Cloudflare 直连。公开分享测速结果时，使用汇总数据，省略测试域名、设备及服务标识、精确时间和原始日志。

## 浏览器商店链接

首页下载入口在 `site/index.html`，紧接标题展示，与功能概述组成同一个首屏区域：

- Chrome、Edge、Safari、Firefox 均使用公开商店地址；
- Firefox 商店地址：https://addons.mozilla.org/firefox/addon/yueshang/，支持桌面 Firefox 142+。
- `site/download.js` 根据浏览器信息默认展示对应的桌面安装按钮，其他版本通过“其他浏览器”展开；Safari 仅在 macOS 上推荐。
- 移动设备、无法识别的浏览器或禁用 JavaScript 时保留完整的浏览器选择。识别只在本地进行，不保存或上传浏览器信息。

## 功能截图

首页只使用 README 中已有的实际运行截图，不使用功能示意图。部署目录中的图片是对应仓库图片的副本：

- `site/assets/plugin-effect.png` ← `screenshot.png`
- `site/assets/native-effect.png` ← `screenshot-native.png`
- `site/assets/user-hover-card.png` ← `chrome/store-assets/screenshots/chrome-user-hover-card.png`
- `site/assets/lightbox-multi-zoom.png` ← `chrome/store-assets/screenshots/chrome-lightbox-multi-zoom.png`

更新原始截图时应同步复制到 `site/assets/`。

下载卡片使用本地托管的 Chrome、Safari、Edge 和 Firefox 官方图形，文件位于 `site/assets/browsers/`，来源为 [`alrra/browser-logos`](https://github.com/alrra/browser-logos)。不要改回 CSS 绘制的近似图标，也不要从第三方 CDN 直接加载。

## 隐私政策

`site/privacy/index.html` 是仓库根目录 `PRIVACY.md` 的站点版。修改政策时请同步维护两处内容。
