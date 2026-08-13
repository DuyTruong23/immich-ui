#!/usr/bin/env bash
# Cấu hình DNS api.gallery-app.pp.ua trỏ cùng tunnel với immich.gallery-app.pp.ua
#
# Cần Cloudflare API Token với quyền:
#   Zone → DNS → Edit
#   (tuỳ chọn) Account → Cloudflare Tunnel → Read
#
# Usage:
#   CLOUDFLARE_API_TOKEN=xxx bash scripts/setup-cloudflare-dns.sh
#   CLOUDFLARE_API_TOKEN=xxx ZONE_NAME=gallery-app.pp.ua bash scripts/setup-cloudflare-dns.sh

set -euo pipefail

API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ZONE_NAME="${ZONE_NAME:-gallery-app.pp.ua}"
API_SUBDOMAIN="${API_SUBDOMAIN:-api}"
REFERENCE_SUBDOMAIN="${REFERENCE_SUBDOMAIN:-immich}"

if [ -z "$API_TOKEN" ]; then
  echo "Thiếu CLOUDFLARE_API_TOKEN." >&2
  echo "Tạo token: Cloudflare Dashboard → My Profile → API Tokens → Create Token" >&2
  echo "  Permissions: Zone.DNS Edit (zone gallery-app.pp.ua)" >&2
  exit 1
fi

api() {
  curl -sS -H "Authorization: Bearer ${API_TOKEN}" -H "Content-Type: application/json" "$@"
}

echo "==> Lấy Zone ID cho ${ZONE_NAME}"
ZONE_ID="$(
  api "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" |
    python -c "import json,sys; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('success') and d['result'] else '')"
)"

if [ -z "$ZONE_ID" ]; then
  echo "Không tìm thấy zone ${ZONE_NAME}. Kiểm tra token/quyền." >&2
  exit 1
fi
echo "Zone ID: ${ZONE_ID}"

echo "==> DNS records hiện tại (${API_SUBDOMAIN}, ${REFERENCE_SUBDOMAIN})"
RECORDS_JSON="$(api "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100")"

python - <<PY
import json, os, sys
records = json.loads('''${RECORDS_JSON}''')
if not records.get("success"):
    print(records, file=sys.stderr); sys.exit(1)
want = {os.environ["API_SUBDOMAIN"], os.environ["REFERENCE_SUBDOMAIN"]}
for r in records["result"]:
    name = r["name"].removesuffix("." + os.environ["ZONE_NAME"]).removesuffix(os.environ["ZONE_NAME"])
    if name in want or r["name"].startswith(want):
        print(f"  {r['type']:5} {r['name']:35} -> {r['content']:40} proxied={r.get('proxied')}")
PY

REFERENCE_TARGET="$(
  python - <<PY
import json, os, sys
records = json.loads('''${RECORDS_JSON}''')
zone = os.environ["ZONE_NAME"]
ref = os.environ["REFERENCE_SUBDOMAIN"]
fqdn = f"{ref}.{zone}"
for r in records["result"]:
    if r["name"] == fqdn and r["type"] == "CNAME":
        print(r["content"])
        break
PY
)"

if [ -z "$REFERENCE_TARGET" ]; then
  echo "Không tìm thấy CNAME ${REFERENCE_SUBDOMAIN}.${ZONE_NAME}." >&2
  echo "Kiểm tra tunnel đã tạo public hostname cho immich chưa." >&2
  exit 1
fi

echo "==> Target tunnel (từ ${REFERENCE_SUBDOMAIN}): ${REFERENCE_TARGET}"

API_FQDN="${API_SUBDOMAIN}.${ZONE_NAME}"
API_RECORD_ID="$(
  python - <<PY
import json, os
records = json.loads('''${RECORDS_JSON}''')
fqdn = f"{os.environ['API_SUBDOMAIN']}.{os.environ['ZONE_NAME']}"
for r in records["result"]:
    if r["name"] == fqdn:
        print(r["id"])
        break
PY
)"

PAYLOAD="$(python - <<PY
import json, os
print(json.dumps({
    "type": "CNAME",
    "name": os.environ["API_SUBDOMAIN"],
    "content": os.environ["REFERENCE_TARGET"],
    "proxied": True,
    "ttl": 1,
}))
PY
)"

if [ -n "$API_RECORD_ID" ]; then
  echo "==> Cập nhật DNS record ${API_FQDN}"
  RESULT="$(api -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${API_RECORD_ID}" --data "${PAYLOAD}")"
else
  echo "==> Tạo DNS record ${API_FQDN}"
  RESULT="$(api -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" --data "${PAYLOAD}")"
fi

python - <<PY
import json, sys
d = json.loads('''${RESULT}''')
if not d.get("success"):
    print("FAIL:", d.get("errors"), file=sys.stderr)
    sys.exit(1)
r = d["result"]
print(f"OK  {r['name']} CNAME -> {r['content']} (proxied={r.get('proxied')})")
PY

echo ""
echo "==> Kiểm tra (chờ 1–2 phút DNS propagate)"
echo "curl -sS https://${API_FQDN}/api/server/ping"
echo ""
echo "Nếu vẫn lỗi, thêm Public Hostname trong Zero Trust Tunnel:"
echo "  api.${ZONE_NAME} -> http://127.0.0.1:2283"
