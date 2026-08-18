import { page } from '$app/state';
import { getAppConfig } from '@photo-gallery/config';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
import { AssetVisibility } from '@immich/sdk';

export type SessionCapability =
  | 'library'
  | 'albums'
  | 'search'
  | 'explore'
  | 'upload'
  | 'favorite'
  | 'createAlbum'
  | 'share'
  | 'download'
  | 'settings'
  | 'admin'
  | 'dashboard'
  | 'trash'
  | 'map'
  | 'people'
  | 'sharing'
  | 'sharedFavorites'
  | 'folders'
  | 'tags'
  | 'archive'
  | 'utilities'
  | 'sharedLinks'
  | 'lockedFolder'
  | 'recentlyAdded'
  | 'memories';

export type AssetCapability = 'favorite' | 'delete' | 'editMetadata' | 'edit' | 'share' | 'download' | 'addToAlbum';

export type MobileNavId = 'library' | 'albums' | 'search' | 'more';

type AssetLike = {
  ownerId?: string;
  isTrashed?: boolean;
  visibility?: string;
};

const features = () => getAppConfig().features;

const signedIn = () => authManager.authenticated && !authManager.isSharedLink;

const isAdmin = () => signedIn() && authManager.user.isAdmin;

const isOwner = (asset: AssetLike) =>
  Boolean(signedIn() && asset.ownerId && authManager.user.id === asset.ownerId);

export const isMobileShell = () =>
  !mediaQueryManager.isFullSidebar && signedIn() && !page.url.pathname.startsWith('/admin');

export const can = (capability: SessionCapability): boolean => {
  const flags = features();

  switch (capability) {
    case 'library':
      return authManager.authenticated;
    case 'albums':
      return signedIn();
    case 'search':
      return signedIn() && flags.search && featureFlagsManager.value.search;
    case 'explore':
      return signedIn() && flags.explore && flags.search && featureFlagsManager.value.search;
    case 'upload':
      return signedIn();
    case 'favorite':
      return signedIn();
    case 'createAlbum':
      return signedIn();
    case 'share':
      return signedIn() && flags.sharing;
    case 'download':
      return authManager.authenticated;
    case 'settings':
      return signedIn();
    case 'admin':
      return isAdmin();
    case 'dashboard':
      return isAdmin() && flags.dashboard;
    case 'trash':
      return isAdmin() && flags.trash && featureFlagsManager.value.trash;
    case 'map':
      return signedIn() && flags.map && featureFlagsManager.value.map;
    case 'people':
      return signedIn() && flags.people && authManager.preferences.people.enabled;
    case 'sharing':
      return isAdmin() && flags.sharing;
    case 'sharedFavorites':
      return signedIn() && flags.sharedFavorites;
    case 'folders':
      return signedIn() && flags.folders && authManager.preferences.folders.enabled;
    case 'tags':
      return signedIn() && flags.tags && authManager.preferences.tags.enabled;
    case 'archive':
      return signedIn() && flags.archive;
    case 'utilities':
      return signedIn() && flags.utilities;
    case 'sharedLinks':
      return signedIn() && flags.sharedLinks && authManager.preferences.sharedLinks.enabled;
    case 'lockedFolder':
      return signedIn();
    case 'recentlyAdded':
      return signedIn();
    case 'memories':
      return signedIn() && flags.memories && authManager.preferences.memories.enabled;
  }
};

export const canForAsset = (capability: AssetCapability, asset: AssetLike): boolean => {
  switch (capability) {
    case 'favorite':
      return can('favorite');
    case 'delete':
      return isOwner(asset);
    case 'editMetadata':
    case 'edit':
      return isOwner(asset);
    case 'share':
      return can('share') && !asset.isTrashed && asset.visibility !== AssetVisibility.Locked;
    case 'download':
      return can('download');
    case 'addToAlbum':
      return can('createAlbum') && !asset.isTrashed && asset.visibility !== AssetVisibility.Locked;
  }
};

export const isMobileNavActive = (id: MobileNavId, pathname: string): boolean => {
  switch (id) {
    case 'library':
      return pathname === '/photos' || pathname.startsWith('/photos/');
    case 'albums':
      return pathname === '/albums' || pathname.startsWith('/albums/');
    case 'search':
      return pathname === '/search' || pathname.startsWith('/search/');
    case 'more':
      return (
        pathname === '/more' ||
        pathname.startsWith('/more/') ||
        (!pathname.startsWith('/photos') && !pathname.startsWith('/albums') && !pathname.startsWith('/search'))
      );
  }
};
