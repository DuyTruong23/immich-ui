#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/docker-up.sh

echo ""
echo "==> Starting custom frontend (hot reload)"
echo "    http://localhost:5283 → proxy → http://localhost:2283"
pnpm dev
