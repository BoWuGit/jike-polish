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

域名 zone 与 Worker 必须位于同一个 Cloudflare 账户。后续如更换域名，应同步更新首页 canonical、Open Graph URL、`robots.txt` 和 `sitemap.xml`。

## 浏览器商店链接

首页下载区在 `site/index.html`：

- Chrome、Edge、Safari 已使用公开商店地址；
- Firefox 当前显示“待上线”；
- Firefox 发布后，把对应的 `browser-card-pending` 容器改成带 `href` 的 `<a class="browser-card">`。

## 隐私政策

`site/privacy/index.html` 是仓库根目录 `PRIVACY.md` 的站点版。修改政策时请同步维护两处内容。
