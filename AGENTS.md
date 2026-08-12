# Project Conventions

## Build

- Content script source: `src/content.js`. Run `npm run build` to emit root `content.js` (referenced by `manifest.json`).
- The macOS Safari wrapper is in `safari/JikePolish`. Run `npm run safari:build` for an unsigned compile check; signing configuration and credentials must stay local.
- Safari directly packages the shared root extension resources referenced by the Xcode project. Do not add the repository, `node_modules`, screenshots, archives, or credentials to the Extension target's Resources phase.
- `assets/icon-1024.png` is the canonical icon master. Run `npm run safari:icons` to regenerate root `icon.png`, Firefox icon sizes, the Safari container image, and all macOS AppIcon sizes.

## Chrome Web Store release

- The public Chrome Web Store item ID is `hnbakdoibeogigpihopfjfjbacfmcfck`; the release script pins this ID to prevent cross-project uploads.
- Keep the version in `manifest.json`, `package.json`, `package-lock.json`, and the Safari Xcode target `MARKETING_VERSION` settings identical.
- Run `npm run release:extension` to validate and create `jike-polish-v<version>.zip` without uploading.
- From a clean Git tree, run `npm run release:extension -- --mode submit --confirm` to upload the zip and submit it for review. Use `--mode upload` to upload a draft without submitting, or `--dry-run` to avoid API calls.
- Upload/submit requires `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, and `CWS_REFRESH_TOKEN` in the process environment. The OAuth refresh token must include the `https://www.googleapis.com/auth/chromewebstore` scope and belong to an account that can publish this item.
- This is a public repository. Never commit credentials, tokens, `.env` files, downloaded OAuth JSON, or command output containing secrets. Keep secrets outside the repository and inject them through the shell environment or a secret manager.
- API submission only starts Chrome Web Store review; it does not guarantee immediate publication. Check final status in the Developer Dashboard.

## Microsoft Edge Add-ons release

- For Edge compatibility, store metadata, privacy declarations, review notes, or submission work, read `edge/README.md` and use its current checklist.
- Run `npm run edge:package` and upload `jike-polish-edge-v<version>.zip`; the generic Chrome package omits the Edge offline review demo.
- The Edge demo sources are in `edge/demo/`; its generated package reuses the Safari container demo's `Style.css` and `Script.js`, so changes to those shared interactions must keep both demos working.

## Firefox Add-ons release

- For Firefox compatibility, AMO metadata, privacy declarations, review notes, signing, or submission work, read `firefox/README.md` and use its current checklist.
- Keep the Gecko ID `jike-polish@bowugit.github.io` stable and the Firefox minimum version at 142+ unless the data-consent design is intentionally revised.
- Run `npm run firefox:package` and upload both the matching extension zip and source zip; AMO requires the source archive because the runtime scripts are bundled.
- Keep `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` outside the repository; `npm run release:firefox -- --mode submit --confirm` is for a clean Git tree.

## Git

- Commit messages must be in **English**.
- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, etc.
