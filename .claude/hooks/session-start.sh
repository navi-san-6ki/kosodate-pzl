#!/bin/bash
set -euo pipefail

# Claude Code のクラウドセッションでだけ依存パッケージを入れる
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# pnpm がなければ corepack で用意する
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
fi

pnpm install
