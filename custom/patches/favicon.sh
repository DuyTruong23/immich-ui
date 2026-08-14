#!/usr/bin/env bash
# Replace all Immich favicon / PWA icon assets with WeGallery branding.

BRANDING_FAVICON_VERSION="${BRANDING_FAVICON_VERSION:-icloud2}"

apply_favicon_static_patch() {
  local root="$1"
  local assets="$root/branding/assets"
  local static="$root/upstream/web/static"

  for f in \
    favicon.ico \
    favicon.png \
    favicon-16.png \
    favicon-32.png \
    favicon-48.png \
    favicon-96.png \
    favicon-144.png \
    apple-icon-180.png \
    manifest-icon-192.maskable.png \
    manifest-icon-512.maskable.png; do
    if [ -f "$assets/$f" ]; then
      cp "$assets/$f" "$static/$f"
    fi
  done
}

apply_app_html_favicon_patch() {
  local app_html="$1"
  [ -f "$app_html" ] || return 0

  if grep -q "branding-favicon-${BRANDING_FAVICON_VERSION}" "$app_html"; then
    return 0
  fi

  local v="$BRANDING_FAVICON_VERSION"
  local favicon_block="    <!-- branding-favicon-${v} -->
    <link rel=\"icon\" href=\"/favicon.ico?v=${v}\" sizes=\"any\" />
    <link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"/favicon-16.png?v=${v}\" />
    <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/favicon-32.png?v=${v}\" />
    <link rel=\"icon\" type=\"image/png\" sizes=\"48x48\" href=\"/favicon-48.png?v=${v}\" />
    <link rel=\"icon\" type=\"image/png\" sizes=\"96x96\" href=\"/favicon-96.png?v=${v}\" />
    <link rel=\"icon\" type=\"image/png\" sizes=\"144x144\" href=\"/favicon-144.png?v=${v}\" />
    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/branding/icloud-photos-icon.svg?v=${v}\" />
    <link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/apple-icon-180.png?v=${v}\" />"

  python - "$app_html" "$favicon_block" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
block = sys.argv[2]
text = path.read_text(encoding="utf-8")
pattern = re.compile(
    r'    <!-- branding-favicon-[^\n]+ -->\n(?:    <link rel="(?:icon|apple-touch-icon)[^>]*>\n)+'
    r'|    <link rel="(?:icon|shortcut icon|apple-touch-icon)[^>]*>\n(?:    <link rel="(?:icon|shortcut icon|apple-touch-icon)[^>]*>\n)*',
    re.MULTILINE,
)
if not pattern.search(text):
    raise SystemExit("favicon block not found in app.html")
path.write_text(pattern.sub(block + "\n", text, count=1), encoding="utf-8")
PY
}

apply_app_html_stencil_patch() {
  local app_html="$1"
  [ -f "$app_html" ] || return 0

  if grep -q 'id="stencil"' "$app_html" && grep -q 'icloud-photos-icon.svg' "$app_html"; then
    if ! grep -q 'fa2921' "$app_html"; then
      return 0
    fi
  fi

  python - "$app_html" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
replacement = '''    <div id="stencil">
      <img src="/branding/icloud-photos-icon.svg" width="150" height="150" alt="" />
    </div>'''
pattern = re.compile(r'    <div id="stencil">.*?</div>', re.DOTALL)
if not pattern.search(text):
    raise SystemExit("stencil block not found in app.html")
path.write_text(pattern.sub(replacement, text, count=1), encoding="utf-8")
PY
}

apply_app_html_noscript_patch() {
  local app_html="$1"
  [ -f "$app_html" ] || return 0

  if grep -q 'To use WeGallery' "$app_html"; then
    return 0
  fi

  sed -i \
    -e 's|To use Immich, you must enable JavaScript|To use WeGallery, you must enable JavaScript|' \
    -e 's|To use iCloud Photos, you must enable JavaScript|To use WeGallery, you must enable JavaScript|' \
    "$app_html" 2>/dev/null \
    || sed -i '' \
      -e 's|To use Immich, you must enable JavaScript|To use WeGallery, you must enable JavaScript|' \
      -e 's|To use iCloud Photos, you must enable JavaScript|To use WeGallery, you must enable JavaScript|' \
      "$app_html"
}

apply_layout_favicon_patch() {
  local layout="$1"
  [ -f "$layout" ] || return 0

  local v="$BRANDING_FAVICON_VERSION"
  if grep -q "branding-favicon-${v}" "$layout"; then
    return 0
  fi

  python - "$layout" "$v" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
version = sys.argv[2]
text = path.read_text(encoding="utf-8")
block = f'''  <!-- branding-favicon-{version} -->
  <link rel="icon" href="/favicon.ico?v={version}" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v={version}" />
  <link rel="icon" type="image/svg+xml" href="/branding/icloud-photos-icon.svg?v={version}" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180.png?v={version}" />'''
pattern = re.compile(
    r'  <!-- branding-favicon-[^\n]+ -->\n(?:  <link rel="(?:icon|apple-touch-icon)[^>]*>\n)+'
    r'|  <link rel="(?:icon|apple-touch-icon)[^>]*>\n(?:  <link rel="(?:icon|apple-touch-icon)[^>]*>\n)*',
    re.MULTILINE,
)
if not pattern.search(text):
    raise SystemExit("favicon block not found in +layout.svelte")
path.write_text(pattern.sub(block + "\n", text, count=1), encoding="utf-8")
PY
}

apply_manifest_patch() {
  local manifest="$1"
  [ -f "$manifest" ] || return 0

  python - "$manifest" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
data["name"] = "WeGallery"
  data["short_name"] = "WeGallery"
data["theme_color"] = "#1677ff"
data["icons"] = [
    {
        "src": "/favicon-32.png",
        "sizes": "32x32",
        "type": "image/png",
    },
    {
        "src": "/apple-icon-180.png",
        "sizes": "180x180",
        "type": "image/png",
    },
    {
        "src": "/branding/icon-192.png",
        "sizes": "192x192",
        "type": "image/png",
    },
    {
        "src": "/manifest-icon-192.maskable.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable",
    },
    {
        "src": "/branding/icon-512.png",
        "sizes": "512x512",
        "type": "image/png",
    },
    {
        "src": "/manifest-icon-512.maskable.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable",
    },
]
path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY
}
