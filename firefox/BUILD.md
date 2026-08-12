# Firefox source build instructions

This archive contains the human-readable source used to produce the Firefox package submitted to addons.mozilla.org (AMO). The two generated JavaScript files are bundled with esbuild but are not minified or obfuscated.

## Environment

- Linux or macOS
- Node.js 20 or newer (AMO's default Node.js 24 environment is supported)
- npm
- Info-ZIP `zip`
- Network access to the official npm registry for `npm ci`

No private package registry, secret, account, or platform-specific SDK is needed to build the extension.

## Reproduce the submitted package

After extracting the source archive, change into its top-level directory (the one containing `package.json` and the `firefox/` directory):

```bash
npm ci
npm run firefox:package
```

The command:

1. bundles `src/content.js` to `content.js`;
2. bundles `src/jike-polish-page-bridge.js` to `jike-polish-page-bridge.js`;
3. stages only the Firefox runtime files in `build/firefox/`;
4. validates that directory with Mozilla's `web-ext lint`; and
5. creates `jike-polish-firefox-v<version>.zip` with normalized file modes and timestamps.

The submitted extension archive and the reproduced archive should contain the same files with identical contents. The command also creates a fresh source archive; that second archive is not part of the extension runtime.

## Source mapping

- `content.js` is generated from `src/content.js` and its imports under `src/content/` and `src/shared/`.
- `jike-polish-page-bridge.js` is generated from `src/jike-polish-page-bridge.js` and its imports under `src/page-bridge/` and `src/shared/`.
- `jike-twitter-font.user.css` is used directly without preprocessing.
- `firefox-demo/` is assembled from `edge/demo/` plus the shared `Style.css` and `Script.js` files listed in `scripts/package-firefox.mjs`.
- Firefox-specific manifest adjustments and the exact package file list are defined in `scripts/package-firefox.mjs`.

All executable code is included in the submitted package. The build does not download or embed remote executable code.
