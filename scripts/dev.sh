#!/usr/bin/env bash
# Dev bình thường — chỉ .env (+ .env.development), KHÔNG load .env.local
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_LOCAL="$ROOT/upstream/web/.env.local"
ENV_LOCAL_HIDDEN="$ROOT/upstream/web/.env.local.__hidden__"

restore_env_local() {
  if [ -f "$ENV_LOCAL_HIDDEN" ]; then
    mv "$ENV_LOCAL_HIDDEN" "$ENV_LOCAL"
  fi
}

# Vite luôn auto-load .env.local nếu file tồn tại — tạm ẩn khi chạy pnpm dev
if [ -f "$ENV_LOCAL" ]; then
  mv "$ENV_LOCAL" "$ENV_LOCAL_HIDDEN"
  trap restore_env_local EXIT INT TERM
fi

export VITE_CONFIG_NATIVE_IGNORE_WARNING=true
HOST="${VITE_DEV_HOST:-127.0.0.1}"
PORT="${VITE_DEV_PORT:-5283}"

VITE_CACHE="$ROOT/upstream/web/node_modules/.vite"
PORT_MARKER="$VITE_CACHE/last-dev-port"
if [ -f "$PORT_MARKER" ] && [ "$(cat "$PORT_MARKER")" != "$PORT" ]; then
  rm -rf "$VITE_CACHE/deps" 2>/dev/null || true
fi
mkdir -p "$VITE_CACHE"
echo "$PORT" > "$PORT_MARKER"

echo "==> dev — dùng upstream/web/.env (không .env.local) — http://${HOST}:${PORT}"
exec pnpm --filter immich-web exec vite dev --host "$HOST" --port "$PORT" --strictPort "$@"
