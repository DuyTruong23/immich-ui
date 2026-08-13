#!/usr/bin/env python3
"""Patch upstream utils.ts to route media URLs through getMediaBaseUrl() when configured."""

from __future__ import annotations

import pathlib
import sys


def patch_utils(utils_path: pathlib.Path) -> None:
    text = utils_path.read_text(encoding='utf-8')

    import_line = "import { getMediaBaseUrl } from '$lib/utils/media-base-url';\n"
    if import_line not in text:
        marker = "import { authManager } from '$lib/managers/auth-manager.svelte';\n"
        if marker not in text:
            raise SystemExit(f"Cannot find authManager import in {utils_path}")
        text = text.replace(marker, marker + import_line, 1)

    old = '  return getBaseUrl() + url.pathname + url.search + url.hash;'
    new = '  return getMediaBaseUrl() + url.pathname + url.search + url.hash;'
    if old not in text:
        if new in text:
            return
        raise SystemExit(f"Cannot find createUrl return in {utils_path}")
    text = text.replace(old, new, 1)

    utils_path.write_text(text, encoding='utf-8')


def patch_app_d_ts(app_d_path: pathlib.Path) -> None:
    text = app_d_path.read_text(encoding='utf-8')
    decl = '  export const PUBLIC_IMMICH_MEDIA_URL: string;\n'
    if decl in text:
        return

    marker = '  export const PUBLIC_IMMICH_SERVER_URL: string;\n'
    if marker not in text:
        raise SystemExit(f"Cannot find PUBLIC_IMMICH_SERVER_URL in {app_d_path}")
    text = text.replace(marker, marker + decl, 1)
    app_d_path.write_text(text, encoding='utf-8')


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    patch_utils(root / 'upstream/web/src/lib/utils.ts')
    patch_app_d_ts(root / 'upstream/web/src/app.d.ts')


if __name__ == '__main__':
    main()
