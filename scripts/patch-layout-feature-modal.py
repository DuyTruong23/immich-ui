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
        layout_path.write_text(text, encoding='utf-8')
        if "from './FeatureUpdateOnLogin.svelte'" in text:
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
