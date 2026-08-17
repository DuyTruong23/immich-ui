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

    old_upload_opts = '  data: FormData;\n  onUploadProgress?: (event: ProgressEvent<XMLHttpRequestEventTarget>) => void;\n'
    new_upload_opts = (
        '  data: FormData;\n'
        '  headers?: Record<string, string>;\n'
        '  onUploadProgress?: (event: ProgressEvent<XMLHttpRequestEventTarget>) => void;\n'
    )
    if old_upload_opts in text:
        text = text.replace(old_upload_opts, new_upload_opts, 1)

    old_upload_open = '    xhr.open(options.method || \'POST\', url);\n    xhr.responseType = \'json\';\n    xhr.send(data);'
    new_upload_open = (
        '    xhr.open(options.method || \'POST\', url);\n'
        '    xhr.responseType = \'json\';\n'
        '    for (const [key, value] of Object.entries(headers ?? {})) {\n'
        '      xhr.setRequestHeader(key, value);\n'
        '    }\n'
        '    xhr.send(data);'
    )
    if old_upload_open in text:
        text = text.replace('  const { onUploadProgress: onProgress, data, url } = options;', '  const { onUploadProgress: onProgress, data, url, headers } = options;', 1)
        text = text.replace(old_upload_open, new_upload_open, 1)

    date_import = "import { formatDate, formatDateTime, formatTime } from '$lib/utils/date-format';\n"
    if date_import not in text:
        media_import = "import { getMediaBaseUrl } from '$lib/utils/media-base-url';\n"
        if media_import not in text:
            raise SystemExit(f'Cannot find media-base-url import in {utils_path}')
        text = text.replace(media_import, media_import + date_import, 1)

    old_formatter = """export function createDateFormatter(localeCode: string | undefined): DateFormatter {
  return {
    formatDate: (date: Date): string =>
      date.toLocaleString(localeCode, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),

    formatTime: (date: Date): string =>
      date.toLocaleString(localeCode, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),

    formatDateTime: (date: Date): string => {
      const formattedDate = date.toLocaleString(localeCode, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const formattedTime = date.toLocaleString(localeCode, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return `${formattedDate} ${formattedTime}`;
    },
  };
}"""
    new_formatter = """export function createDateFormatter(localeCode: string | undefined): DateFormatter {
  return {
    formatDate: (date: Date): string => formatDate(date, localeCode),
    formatTime: (date: Date): string => formatTime(date, localeCode),
    formatDateTime: (date: Date): string => formatDateTime(date, localeCode),
  };
}"""
    if old_formatter in text:
        text = text.replace(old_formatter, new_formatter, 1)
    elif new_formatter not in text:
        raise SystemExit(f'Cannot find createDateFormatter in {utils_path}')

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
    if line not in text:
        marker = "process.env.PUBLIC_IMMICH_PAY_HOST = process.env.PUBLIC_IMMICH_PAY_HOST || 'https://pay.futo.org';\n"
        if marker not in text:
            raise SystemExit(f"Cannot find PUBLIC_IMMICH_PAY_HOST default in {svelte_config_path}")
        text = text.replace(marker, marker + line, 1)

    old_version = (
        "    version: {\n"
        "      name: process.env.IMMICH_BUILD || process.env.npm_package_version || 'local',\n"
        "    },\n"
    )
    new_version = (
        "    version: {\n"
        "      name:\n"
        "        process.env.VERCEL_GIT_COMMIT_SHA ||\n"
        "        process.env.VERCEL_DEPLOYMENT_ID ||\n"
        "        process.env.IMMICH_BUILD ||\n"
        "        process.env.npm_package_version ||\n"
        "        'local',\n"
        "      pollInterval: 60_000,\n"
        "    },\n"
    )
    if old_version in text:
        text = text.replace(old_version, new_version, 1)
    elif new_version not in text:
        raise SystemExit(f'Cannot find kit.version in {svelte_config_path}')

    svelte_config_path.write_text(text, encoding='utf-8')


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    patch_utils(root / 'upstream/web/src/lib/utils.ts')
    patch_app_d_ts(root / 'upstream/web/src/app.d.ts')
    patch_svelte_config(root / 'upstream/web/svelte.config.js')


if __name__ == '__main__':
    main()
