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
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise SystemExit(f"Cannot find createUrl return in {utils_path}")

    old_profile = (
        'createUrl(getUserProfileImagePath(user.id), { updatedAt: user.profileChangedAt });'
    )
    new_profile = (
        'createUrl(getUserProfileImagePath(user.id), { ...authManager.params, updatedAt: user.profileChangedAt });'
    )
    if old_profile in text:
        text = text.replace(old_profile, new_profile, 1)
    elif new_profile not in text:
        raise SystemExit(f'Cannot find getProfileImageUrl in {utils_path}')

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


def patch_svelte_config(svelte_config_path: pathlib.Path) -> None:
    text = svelte_config_path.read_text(encoding='utf-8')
    line = "process.env.PUBLIC_IMMICH_MEDIA_URL = process.env.PUBLIC_IMMICH_MEDIA_URL || '';\n"
    if line in text:
        return

    marker = "process.env.PUBLIC_IMMICH_PAY_HOST = process.env.PUBLIC_IMMICH_PAY_HOST || 'https://pay.futo.org';\n"
    if marker not in text:
        raise SystemExit(f"Cannot find PUBLIC_IMMICH_PAY_HOST default in {svelte_config_path}")
    text = text.replace(marker, marker + line, 1)
    svelte_config_path.write_text(text, encoding='utf-8')


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    patch_utils(root / 'upstream/web/src/lib/utils.ts')
    patch_app_d_ts(root / 'upstream/web/src/app.d.ts')
    patch_svelte_config(root / 'upstream/web/svelte.config.js')


if __name__ == '__main__':
    main()
