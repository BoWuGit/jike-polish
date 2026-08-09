#!/bin/bash
# 打包 Chrome Web Store 上传用的 zip

set -e

cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ 需要已安装的 Node.js/npm 以执行 npm run build" >&2
  exit 1
fi
npm run safari:check
npm run build

VERSION=$(node -e 'const manifest = JSON.parse(require("node:fs").readFileSync("manifest.json", "utf8")); process.stdout.write(String(manifest.version || ""));')
if [[ ! "$VERSION" =~ ^[0-9]+(\.[0-9]+){0,3}$ ]]; then
  echo "❌ manifest.json 中的版本号无效: $VERSION" >&2
  exit 1
fi

ROOT=$(pwd)
OUTPUT="$ROOT/jike-polish-v${VERSION}.zip"
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/jike-polish-chrome.XXXXXX")
FILES=(manifest.json content.js icon.png jike-twitter-font.user.css jike-polish-page-bridge.js)
trap 'rm -rf "$STAGE"' EXIT

for FILE in "${FILES[@]}"; do
  cp "$FILE" "$STAGE/$FILE"
  chmod 0644 "$STAGE/$FILE"
done
TZ=UTC touch -t 198001010000 "${FILES[@]/#/$STAGE/}"

rm -f "$OUTPUT"
(
  cd "$STAGE"
  TZ=UTC zip -X -q "$OUTPUT" "${FILES[@]}"
)

echo "✅ 已生成 ${OUTPUT##*/}"
