#!/usr/bin/env bash
# Kiểm tra HTTP Range (206 Partial Content) cho video Immich.
#
# Usage:
#   pnpm check:range
#   ASSET_ID=<uuid> IMMICH_API_KEY=<key> pnpm check:range
#
# Env:
#   IMMICH_MEDIA_URL   — tunnel trực tiếp (mặc định https://api.gallery-app.pp.ua)
#   IMMICH_PROXY_URL   — qua Vercel proxy (mặc định https://gallery-app.pp.ua)
#   IMMICH_TUNNEL_URL  — tunnel chính (mặc định https://immich.gallery-app.pp.ua)
#   ASSET_ID           — UUID video (bắt buộc để test Range playback)
#   IMMICH_API_KEY     — API key Immich (Settings → Account → API Keys)

set -euo pipefail

MEDIA_BASE="${IMMICH_MEDIA_URL:-https://api.gallery-app.pp.ua}"
PROXY_BASE="${IMMICH_PROXY_URL:-https://gallery-app.pp.ua}"
TUNNEL_BASE="${IMMICH_TUNNEL_URL:-https://immich.gallery-app.pp.ua}"
ASSET_ID="${ASSET_ID:-}"
API_KEY="${IMMICH_API_KEY:-}"
RANGE="${RANGE_HEADER:-bytes=0-65535}"

auth_args=()
if [ -n "$API_KEY" ]; then
  auth_args=(-H "x-api-key: ${API_KEY}")
fi

section() {
  echo ""
  echo "=== $1 ==="
}

check_ping() {
  local base="$1"
  local label="$2"
  local code body

  code="$(curl -sS -o /tmp/immich-ping.json -w '%{http_code}' "${base}/api/server/ping")"
  body="$(cat /tmp/immich-ping.json)"

  if [ "$code" = "200" ] && echo "$body" | grep -q '"pong"'; then
    echo "OK  [$label] ${base}/api/server/ping → HTTP $code $body"
  else
    echo "FAIL [$label] ${base}/api/server/ping → HTTP $code $body" >&2
    return 1
  fi
}

summarize_range() {
  local headers="$1"

  echo "$headers" | awk '
    BEGIN { status=""; accept=""; content_range="" }
    /^HTTP/ { status=$2 }
    /^accept-ranges:/ { accept=$0 }
    /^content-range:/ { content_range=$0 }
    END {
      print "  Status:", (status == "" ? "(unknown)" : status)
      print "  Accept-Ranges:", (accept == "" ? "(missing)" : accept)
      print "  Content-Range:", (content_range == "" ? "(missing)" : content_range)
      if (status == "206") print "  → Range OK"
      else if (status == "200") print "  → WARN: full file (200) — browser tải cả file, seek chậm"
      else print "  → FAIL: unexpected status"
    }
  '
}

check_playback_range() {
  local base="$1"
  local label="$2"
  local url="${base}/api/assets/${ASSET_ID}/video/playback"
  local headers

  headers="$(
    curl -sS -D - -o /dev/null \
      -H "Range: ${RANGE}" \
      "${auth_args[@]}" \
      "$url" 2>/dev/null | tr -d '\r'
  )"

  echo "URL: $url"
  summarize_range "$headers"
}

section "1. Ping — tunnel & proxy"
check_ping "$TUNNEL_BASE" "tunnel" || true
check_ping "$MEDIA_BASE" "media" || true
check_ping "$PROXY_BASE" "vercel-proxy" || true

if [ -z "$ASSET_ID" ]; then
  section "2. Range playback — skipped"
  echo "Set ASSET_ID và IMMICH_API_KEY để kiểm tra 206 Partial Content:"
  echo "  ASSET_ID=<video-uuid> IMMICH_API_KEY=<key> pnpm check:range"
  exit 0
fi

section "2. Range playback — media trực tiếp ($MEDIA_BASE)"
check_playback_range "$MEDIA_BASE" "media"

section "3. Range playback — Vercel proxy ($PROXY_BASE)"
check_playback_range "$PROXY_BASE" "proxy"

section "4. Gợi ý"
cat <<'EOF'
  • Status 206 + Accept-Ranges: bytes → browser seek/buffer tốt
  • Status 200 → sửa reverse proxy / Immich trước khi tối ưu UI
  • So sánh mục 2 vs 3: media trực tiếp thường nhanh hơn (bypass Vercel)
  • DevTools: Network → filter "playback" → xem Range request khi seek video
EOF
