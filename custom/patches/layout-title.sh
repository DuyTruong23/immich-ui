#!/usr/bin/env bash
# Patch document title suffix after upstream sync (idempotent).
apply_layout_title_patch() {
  local layout="$1"
  [ -f "$layout" ] || return 0
  if grep -q "WeGallery</title>" "$layout"; then
    return 0
  fi
  sed -i \
    -e "s| - Immich</title>| - WeGallery</title>|g" \
    -e "s| · iCloud Photos</title>| - WeGallery</title>|g" \
    -e "s| - Gallery</title>| - WeGallery</title>|g" \
    "$layout" 2>/dev/null \
    || sed -i '' \
      -e "s| - Immich</title>| - WeGallery</title>|g" \
      -e "s| · iCloud Photos</title>| - WeGallery</title>|g" \
      -e "s| - Gallery</title>| - WeGallery</title>|g" \
      "$layout"
}
