import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'vite';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const resolveImmichServerUrl = (): string =>
  process.env.IMMICH_SERVER_URL ??
  process.env.VITE_IMMICH_API_URL ??
  process.env.PUBLIC_IMMICH_SERVER_URL ??
  'http://localhost:2283';

const webNodeModules = path.resolve(rootDir, 'upstream/web/node_modules');

export const customViteAliases = (): Record<string, string> => ({
  // $custom lives outside upstream/web; bare imports need the web node_modules.
  'svelte-i18n': path.resolve(webNodeModules, 'svelte-i18n'),
  '@photo-gallery/config': path.resolve(rootDir, 'config/src'),
  '@photo-gallery/custom': path.resolve(rootDir, 'custom/src'),
  '@photo-gallery/branding': path.resolve(rootDir, 'branding/src'),
  '@photo-gallery/overrides': path.resolve(rootDir, 'overrides'),
  $config: path.resolve(rootDir, 'config/src'),
  $custom: path.resolve(rootDir, 'custom/src'),
  $branding: path.resolve(rootDir, 'branding/src'),
  $overrides: path.resolve(rootDir, 'overrides'),
  '$lib/components/shared-components/side-bar/UserSidebar.svelte': path.resolve(
    rootDir,
    'overrides/lib/components/shared-components/side-bar/UserSidebar.svelte',
  ),
  '$lib/components/shared-components/side-bar/BottomInfo.svelte': path.resolve(
    rootDir,
    'overrides/lib/components/shared-components/side-bar/BottomInfo.svelte',
  ),
  '$lib/components/layouts/UserPageLayout.svelte': path.resolve(
    rootDir,
    'overrides/lib/components/layouts/UserPageLayout.svelte',
  ),
});

export const customViteResolve = (): UserConfig['resolve'] => ({
  alias: customViteAliases(),
});

export const customSvelteKitAliases = (): Record<string, string> => ({
  '@photo-gallery/config': '../../config/src',
  '@photo-gallery/custom': '../../custom/src',
  '@photo-gallery/branding': '../../branding/src',
  '@photo-gallery/overrides': '../../overrides',
  $config: '../../config/src',
  $custom: '../../custom/src',
  $branding: '../../branding/src',
  $overrides: '../../overrides',
  '$lib/components/shared-components/side-bar/UserSidebar.svelte':
    '../../overrides/lib/components/shared-components/side-bar/UserSidebar.svelte',
  '$lib/components/shared-components/side-bar/BottomInfo.svelte':
    '../../overrides/lib/components/shared-components/side-bar/BottomInfo.svelte',
  '$lib/components/layouts/UserPageLayout.svelte':
    '../../overrides/lib/components/layouts/UserPageLayout.svelte',
});

export const brandingAssetsDir = path.resolve(rootDir, 'branding/assets');
