#!/usr/bin/env bash
# Local dev launcher: migrate, then run worker + web together.
# Usage: ./scripts/dev.sh   (Ctrl-C stops both)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Running migrations…"
npm run db:migrate

echo "▶ Starting worker + web (logs interleaved)…"
trap 'kill 0' EXIT
npm run dev:worker &
npm run dev:web &
wait
