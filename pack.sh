#!/bin/bash
# 打包 Chrome Web Store 上传用的 zip

set -e

VERSION=$(grep '"version"' manifest.json | sed 's/.*: "\(.*\)".*/\1/')
OUTPUT="jike-polish-v${VERSION}.zip"

rm -f "$OUTPUT"
zip "$OUTPUT" manifest.json content.js icon.png jike-twitter-font.user.css

echo "✅ 已生成 $OUTPUT"
