#!/bin/bash
# 打包 Chrome Web Store 上传用的 zip

set -e

cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ 需要已安装的 Node.js/npm 以执行 npm run build" >&2
  exit 1
fi
npm run build

VERSION=$(grep '"version"' manifest.json | sed 's/.*: "\(.*\)".*/\1/')
OUTPUT="jike-polish-v${VERSION}.zip"

rm -f "$OUTPUT"
zip "$OUTPUT" manifest.json content.js icon.png jike-twitter-font.user.css

echo "✅ 已生成 $OUTPUT"
