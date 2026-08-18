#!/usr/bin/env python3
"""Inject FeatureUpdateOnLogin into upstream +layout.svelte after prepare-custom merge."""

from __future__ import annotations

import pathlib
import sys


def patch_layout(layout_path: pathlib.Path) -> None:
    text = layout_path.read_text(encoding='utf-8')

    if 'FeatureUpdateOnLogin' in text:
        text = text.replace(
            "import FeatureUpdateOnLogin from '$custom/components/FeatureUpdateOnLogin.svelte';",
            "import FeatureUpdateOnLogin from './FeatureUpdateOnLogin.svelte';",
        )
        if "FeatureUpdatePin" not in text:
            text = text.replace(
                "import FeatureUpdateOnLogin from './FeatureUpdateOnLogin.svelte';\n",
                "import FeatureUpdateOnLogin from './FeatureUpdateOnLogin.svelte';\n"
                "  import FeatureUpdatePin from '$custom/components/FeatureUpdatePin.svelte';\n",
                1,
            )
            text = text.replace('<FeatureUpdateOnLogin />', '<FeatureUpdateOnLogin />\n<FeatureUpdatePin />', 1)
        layout_path.write_text(text, encoding='utf-8')
        if "from './FeatureUpdateOnLogin.svelte'" in text:
            if 'reloadPreservingSession' not in text and 'location.reload()' in text:
                text = text.replace(
                    "import { getServerConfig } from '@immich/sdk';\n",
                    "import { getServerConfig } from '@immich/sdk';\n"
                    "  import { reloadPreservingSession } from '$custom/hooks/session-auth';\n",
                    1,
                )
                text = text.replace('location.reload();', 'reloadPreservingSession();')
                layout_path.write_text(text, encoding='utf-8')
            return

    import_line = "  import FeatureUpdateOnLogin from './FeatureUpdateOnLogin.svelte';\n"
    marker = "  import VersionAnnouncement from './VersionAnnouncement.svelte';\n"
    if marker not in text:
        raise SystemExit(f'Missing VersionAnnouncement import in {layout_path}')

    text = text.replace(marker, marker + import_line, 1)

    component_marker = '<VersionAnnouncement />\n'
    if component_marker not in text:
        raise SystemExit(f'Missing VersionAnnouncement component in {layout_path}')

    text = text.replace(
        component_marker,
        component_marker + '\n<FeatureUpdateOnLogin />\n',
        1,
    )

    if 'reloadPreservingSession' not in text and 'location.reload()' in text:
        text = text.replace(
            "import { getServerConfig } from '@immich/sdk';\n",
            "import { getServerConfig } from '@immich/sdk';\n"
            "  import { reloadPreservingSession } from '$custom/hooks/session-auth';\n",
            1,
        )
        text = text.replace('location.reload();', 'reloadPreservingSession();')

    layout_path.write_text(text, encoding='utf-8')
    print('==> Patch +layout.svelte: FeatureUpdateOnLogin')


def main() -> None:
    root = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('.')
    layout_path = root / 'upstream/web/src/routes/+layout.svelte'
    if not layout_path.is_file():
        raise SystemExit(f'Missing layout file: {layout_path}')
    patch_layout(layout_path)


if __name__ == '__main__':
    main()
