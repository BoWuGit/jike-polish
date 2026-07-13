# Project Conventions

## Build

- Content script source: `src/content.js`. Run `npm run build` to emit root `content.js` (referenced by `manifest.json`).

## Chrome Web Store release

- The public Chrome Web Store item ID is `hnbakdoibeogigpihopfjfjbacfmcfck`; the release script pins this ID to prevent cross-project uploads.
- Keep the version in `manifest.json`, `package.json`, and `package-lock.json` identical.
- Run `npm run release:extension` to validate and create `jike-polish-v<version>.zip` without uploading.
- From a clean Git tree, run `npm run release:extension -- --mode submit --confirm` to upload the zip and submit it for review. Use `--mode upload` to upload a draft without submitting, or `--dry-run` to avoid API calls.
- Upload/submit requires `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, and `CWS_REFRESH_TOKEN` in the process environment. The OAuth refresh token must include the `https://www.googleapis.com/auth/chromewebstore` scope and belong to an account that can publish this item.
- This is a public repository. Never commit credentials, tokens, `.env` files, downloaded OAuth JSON, or command output containing secrets. Keep secrets outside the repository and inject them through the shell environment or a secret manager.
- API submission only starts Chrome Web Store review; it does not guarantee immediate publication. Check final status in the Developer Dashboard.

## Git

- Commit messages must be in **English**.
- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, etc.
