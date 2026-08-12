# Notes for Mozilla reviewers

The extension runs only on `https://web.okjike.com/`. The third-party site normally requires QR-code login, so no reusable reviewer account can be provided.

## Account-free test path

Click the extension toolbar icon and open the packaged offline demo. It uses only local, fictional content and makes no network requests. It exercises:

1. original/polished typography switching;
2. restored repost image and link previews;
3. a fictional profile card; and
4. the image lightbox's 1×–6× buttons, wheel, double-click, keyboard, and drag controls.

## Online data flow

Packaged scripts make HTTPS requests only to `https://api.ruguoapp.com/` (the target site's own API) and to media/content URLs returned by that service. Requests may include the target site's existing access/refresh token, device identifier, post/profile identifiers, and an explicit follow/unfollow action. Nothing is sent to the extension developer.

The manifest declares the corresponding required Firefox data-collection categories. The privacy policy is:

https://github.com/BoWuGit/jike-polish/blob/main/PRIVACY.md

## Executable code and page bridge

All executable JavaScript and CSS is packaged locally. There is no remote code, `eval`, WebAssembly, analytics, advertising, or telemetry.

The page bridge is packaged as `jike-polish-page-bridge.js` and is exposed only to `https://web.okjike.com/*`. It runs in the page context so it can augment the site's own React-rendered quote-card and lightbox state. It does not weaken the page CSP or download executable code.

## Reproducible source build

The source archive is required because esbuild bundles the source modules. Build it with:

```bash
npm ci
npm run firefox:package
```

Full instructions and the generated-file mapping are in `firefox/BUILD.md` inside the source archive.

`web-ext lint` reports no errors, notices, or warnings. The minimum desktop version is set to Firefox 142 so the package remains warning-free under Mozilla's current compatibility-data checks. The manifest intentionally omits `gecko_android`, and this AMO submission targets desktop Firefox only.
