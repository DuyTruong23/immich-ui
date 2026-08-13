#!/usr/bin/env bash
# Đảm bảo upstream/web/.env có đủ PUBLIC_* keys từ .env.example (không ghi đè giá trị hiện có).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE="$ROOT/.env.example"
DEST="$ROOT/upstream/web/.env"

if [ ! -f "$EXAMPLE" ]; then
  echo "sync-web-env: thiếu $EXAMPLE" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"

if [ ! -f "$DEST" ]; then
  if [ -f "$ROOT/.env" ]; then
    cp "$ROOT/.env" "$DEST"
    echo "==> sync-web-env: tạo upstream/web/.env từ .env"
  else
    cp "$EXAMPLE" "$DEST"
    echo "==> sync-web-env: tạo upstream/web/.env từ .env.example"
  fi
fi

added=0
while IFS= read -r line || [ -n "$line" ]; do
  [[ "$line" =~ ^PUBLIC_[A-Z0-9_]+= ]] || continue
  key="${line%%=*}"
  if ! grep -q "^${key}=" "$DEST" 2>/dev/null; then
    printf '%s\n' "$line" >> "$DEST"
    added=$((added + 1))
  fi
done < "$EXAMPLE"

if [ "$added" -gt 0 ]; then
  echo "==> sync-web-env: thêm $added biến PUBLIC_* còn thiếu vào upstream/web/.env"
fi
