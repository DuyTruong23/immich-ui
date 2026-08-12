#!/usr/bin/env bash
# Dev với .env + .env.local (UI dev mode, override cá nhân)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_LOCAL="$ROOT/upstream/web/.env.local"
ENV_LOCAL_EXAMPLE="$ROOT/upstream/web/.env.local.example"

if [ ! -f "$ENV_LOCAL" ]; then
  if [ -f "$ENV_LOCAL_EXAMPLE" ]; then
    echo "==> Chưa có .env.local — copy từ .env.local.example"
    cp "$ENV_LOCAL_EXAMPLE" "$ENV_LOCAL"
  else
    echo "Thiếu upstream/web/.env.local (tạo file hoặc copy từ .env.local.example)" >&2
    exit 1
  fi
fi

export VITE_CONFIG_NATIVE_IGNORE_WARNING=true
HOST="${VITE_DEV_HOST:-127.0.0.1}"
PORT="${VITE_DEV_PORT:-5283}"

VITE_CACHE="$ROOT/upstream/web/node_modules/.vite"
PORT_MARKER="$VITE_CACHE/last-dev-port"
# dev:local hay gặp 504 Outdated Optimize Dep — làm mới cache deps mỗi lần start
rm -rf "$VITE_CACHE/deps" 2>/dev/null || true
mkdir -p "$VITE_CACHE"
echo "$PORT" > "$PORT_MARKER"

echo "==> dev:local — dùng upstream/web/.env + .env.local — http://${HOST}:${PORT}"
exec pnpm --filter immich-web exec vite dev --host "$HOST" --port "$PORT" --strictPort "$@"
