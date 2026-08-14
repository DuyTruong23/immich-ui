<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import BottomInfo from '$lib/components/shared-components/side-bar/BottomInfo.svelte';
  import RecentAlbums from '$lib/components/shared-components/side-bar/RecentAlbums.svelte';
  import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { Route } from '$lib/route';
  import { recentAlbumsDropdown } from '$lib/stores/preferences.store';
  import { NavbarGroup, NavbarItem } from '@immich/ui';
  import {
    mdiAccount,
    mdiAccountMultiple,
    mdiAccountMultipleOutline,
    mdiAccountOutline,
    mdiArchiveArrowDown,
    mdiArchiveArrowDownOutline,
    mdiFolderOutline,
    mdiHeart,
    mdiHeartMultiple,
    mdiHeartMultipleOutline,
    mdiHeartOutline,
    mdiImageAlbum,
    mdiImageMultiple,
    mdiImageMultipleOutline,
    mdiLink,
    mdiLock,
    mdiLockOutline,
    mdiMagnify,
    mdiMap,
    mdiMapOutline,
    mdiTagMultipleOutline,
    mdiToolbox,
    mdiToolboxOutline,
    mdiTrashCan,
    mdiTrashCanOutline,
    mdiUploadOutline,
    mdiViewDashboardOutline,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { partnerFavoritesStore } from '$custom/stores/partner-favorites.svelte';

  const { features } = getAppConfig();

  onMount(() => {
    if (features.sharedFavorites && authManager.authenticated) {
      void partnerFavoritesStore.load();
    }
  });
</script>

<Sidebar ariaLabel={$t('primary')}>
  <NavbarItem title={$t('photos')} href={Route.photos()} icon={mdiImageMultipleOutline} activeIcon={mdiImageMultiple} />

  {#if features.dashboard && authManager.authenticated && authManager.user.isAdmin}
    <NavbarItem title="Dashboard" href="/dashboard" icon={mdiViewDashboardOutline} />
  {/if}

  {#if features.explore && features.search && featureFlagsManager.value.search}
    <NavbarItem title={$t('explore')} href={Route.explore()} icon={mdiMagnify} />
  {/if}

  {#if features.map && featureFlagsManager.value.map}
    <NavbarItem title={$t('map')} href={Route.map()} icon={mdiMapOutline} activeIcon={mdiMap} />
  {/if}

  {#if features.people && authManager.preferences.people.enabled && authManager.preferences.people.sidebarWeb}
    <NavbarItem title={$t('people')} href={Route.people()} icon={mdiAccountOutline} activeIcon={mdiAccount} />
  {/if}

  {#if features.sharedLinks && authManager.preferences.sharedLinks.enabled && authManager.preferences.sharedLinks.sidebarWeb}
    <NavbarItem title={$t('shared_links')} href={Route.sharedLinks()} icon={mdiLink} />
  {/if}

  {#if features.sharing && authManager.authenticated && authManager.user.isAdmin}
    <NavbarItem
      title={$t('sharing')}
      href={Route.sharing()}
      icon={mdiAccountMultipleOutline}
      activeIcon={mdiAccountMultiple}
    />
  {/if}

  <NavbarGroup title={$t('library')} size="tiny" />

  <NavbarItem title={$t('favorites')} href={Route.favorites()} icon={mdiHeartOutline} activeIcon={mdiHeart} />

  {#if features.sharedFavorites}
    <NavbarItem
      title={$t('shared_favorites')}
      href="/shared-favorites"
      icon={mdiHeartMultipleOutline}
      activeIcon={mdiHeartMultiple}
    />
  {/if}

  <NavbarItem
    title={$t('albums')}
    href={Route.albums()}
    icon={{ icon: mdiImageAlbum, flipped: true }}
    bind:expanded={$recentAlbumsDropdown}
  >
    {#snippet items()}
      <span in:fly={{ y: -20 }} class="hidden md:block">
        <RecentAlbums />
      </span>
    {/snippet}
  </NavbarItem>

  {#if features.tags && authManager.preferences.tags.enabled && authManager.preferences.tags.sidebarWeb}
    <NavbarItem title={$t('tags')} href={Route.tags()} icon={{ icon: mdiTagMultipleOutline, flipped: true }} />
  {/if}

  {#if authManager.preferences.recentlyAdded.sidebarWeb}
    <NavbarItem
      title={$t('recently_added')}
      href={Route.recentlyAdded()}
      icon={{ icon: mdiUploadOutline, flipped: true }}
    />
  {/if}

  {#if features.folders && authManager.preferences.folders.enabled && authManager.preferences.folders.sidebarWeb}
    <NavbarItem title={$t('folders')} href={Route.folders()} icon={{ icon: mdiFolderOutline, flipped: true }} />
  {/if}

  {#if features.utilities}
    <NavbarItem title={$t('utilities')} href={Route.utilities()} icon={mdiToolboxOutline} activeIcon={mdiToolbox} />
  {/if}

  {#if features.archive}
    <NavbarItem
      title={$t('archive')}
      href={Route.archive()}
      icon={mdiArchiveArrowDownOutline}
      activeIcon={mdiArchiveArrowDown}
    />
  {/if}

  <NavbarItem title={$t('locked_folder')} href={Route.locked()} icon={mdiLockOutline} activeIcon={mdiLock} />

  {#if authManager.authenticated && authManager.user.isAdmin && features.trash && featureFlagsManager.value.trash}
    <NavbarItem title={$t('trash')} href={Route.trash()} icon={mdiTrashCanOutline} activeIcon={mdiTrashCan} />
  {/if}

  <BottomInfo />
</Sidebar>
