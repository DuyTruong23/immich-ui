#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Avoid native config-loader warning noise on Vite 8
export VITE_CONFIG_NATIVE_IGNORE_WARNING=true

# Git Bash on Windows: prefer localhost binding (0.0.0.0 + many VM adapters can destabilize dev)
HOST="${VITE_DEV_HOST:-127.0.0.1}"
PORT="${VITE_DEV_PORT:-5002}"

exec pnpm --filter immich-web exec vite dev --host "$HOST" --port "$PORT" --strictPort "$@"
