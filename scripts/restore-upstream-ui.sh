#!/usr/bin/env bash
# Restore upstream Immich UI files overwritten by branding / Fluent overrides.
restore_upstream_ui() {
  local root="$1"
  local ref="${UPSTREAM_UI_REF:-cb26ab31b^}"

  restore_file() {
    local git_path="$1"
    local dest="$root/$2"
    if git show "$ref:$git_path" >/dev/null 2>&1; then
      mkdir -p "$(dirname "$dest")"
      git show "$ref:$git_path" >"$dest"
    elif [ -f "$dest" ]; then
      echo "    skip restore (ref unavailable): $git_path"
    else
      echo "    warn: cannot restore missing file (ref unavailable): $git_path" >&2
    fi
  }

  echo "==> Restore upstream UI (ref: $ref)"

  restore_file upstream/web/src/lib/components/shared-components/navigation-bar/AccountInfoPanel.svelte \
    upstream/web/src/lib/components/shared-components/navigation-bar/AccountInfoPanel.svelte
  restore_file upstream/web/src/lib/components/pages/SharedLinkPage.svelte \
    upstream/web/src/lib/components/pages/SharedLinkPage.svelte
  restore_file upstream/web/src/app.html upstream/web/src/app.html

  python - "$root/upstream/web/src/lib/components/shared-components/navigation-bar/AccountInfoPanel.svelte" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
if not path.is_file():
    sys.exit(0)
text = path.read_text(encoding="utf-8")
text = re.sub(
    r'class="absolute inset-e-6 top-19 z-1 w-\[min\(360px,100vw-50px\)\]',
    'class="absolute end-0 top-full z-50 mt-2 w-[min(360px,100vw-50px)]',
    text,
)
path.write_text(text, encoding="utf-8")
PY

  # Keep document titles on WeGallery after upstream restore
  python - "$root/upstream/web/src/routes/+layout.svelte" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
if not path.is_file():
    sys.exit(0)
text = path.read_text(encoding="utf-8")
text = re.sub(
    r"<title>[^<]*</title>",
    "<title>{page.data.meta?.title || 'Web'} - WeGallery</title>",
    text,
    count=1,
)
text = re.sub(
    r'content="(?:Photos|iCloud Photos|Immich)"',
    'content="WeGallery"',
    text,
    count=1,
)
text = re.sub(
    r"\n  <!-- branding-favicon-[^\n]+ -->\n(?:  <link rel=\"(?:icon|apple-touch-icon)[^>]*>\n)+",
    "\n",
    text,
)
path.write_text(text, encoding="utf-8")
PY

  python - "$root/upstream/web/src/lib/components/pages/SharedLinkPage.svelte" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
if not path.is_file():
    sys.exit(0)
text = path.read_text(encoding="utf-8")
text = text.replace(" + ' - Immich'", " + ' - WeGallery'")
text = text.replace(' + " - Immich"', ' + " - WeGallery"')
path.write_text(text, encoding="utf-8")
PY

  python - "$root/upstream/web/src/app.html" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
if not path.is_file():
    sys.exit(0)
text = path.read_text(encoding="utf-8")
text = text.replace("To use Immich, you must enable JavaScript", "To use WeGallery, you must enable JavaScript")
text = text.replace("To use iCloud Photos, you must enable JavaScript", "To use WeGallery, you must enable JavaScript")
path.write_text(text, encoding="utf-8")
PY
}
