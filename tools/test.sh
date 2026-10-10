#!/bin/sh
# 自動テストを Node.js 22 で実行する(既定の node は v14 のまま)。
# 使い方: sh tools/test.sh   (別の場所の Node 22 を使うときは NODE22=/path/to/node sh tools/test.sh)
NODE="${NODE22:-$HOME/.local/opt/node22/bin/node}"
if ! "$NODE" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' 2>/dev/null; then
  echo "Node.js 22 が見つかりません: $NODE" >&2
  exit 1
fi
cd "$(dirname "$0")/.." && exec "$NODE" --test tests/*.test.js
