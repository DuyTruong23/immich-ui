<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { clickOutside } from '$lib/actions/click-outside';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { Route } from '$lib/route';
  import { sidebarStore } from '$lib/stores/sidebar.svelte';
  import { Icon } from '@immich/ui';
  import {
    mdiDotsHorizontal,
    mdiHeart,
    mdiHeartMultiple,
    mdiHeartMultipleOutline,
    mdiHeartOutline,
    mdiImageMultiple,
    mdiImageMultipleOutline,
    mdiMagnify,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { can, isMobileNavActive, isMobileShell, type MobileNavId } from '$custom/utils/capabilities.svelte';

  type NavItem = {
    id: MobileNavId;
    href?: string;
    title: string;
    icon: string;
    activeIcon: string;
    hasMenu?: boolean;
  };

  type FavoriteChoice = {
    id: 'favorites' | 'shared-favorites';
    href: string;
    title: string;
    icon: string;
    activeIcon: string;
  };

  let favoritesOpen = $state(false);

  const items = $derived(
    (
      [
        can('library') && {
          id: 'library' as const,
          href: Route.photos(),
          title: $t('photos'),
          icon: mdiImageMultipleOutline,
          activeIcon: mdiImageMultiple,
        },
        can('favorite') && {
          id: 'favorites' as const,
          href: Route.favorites(),
          title: $t('favorites'),
          icon: mdiHeartOutline,
          activeIcon: mdiHeart,
          hasMenu: can('sharedFavorites'),
        },
        can('search') && {
          id: 'search' as const,
          href: Route.search(),
          title: $t('search'),
          icon: mdiMagnify,
          activeIcon: mdiMagnify,
        },
        can('settings') && {
          id: 'more' as const,
          href: '/more',
          title: $t('more'),
          icon: mdiDotsHorizontal,
          activeIcon: mdiDotsHorizontal,
        },
      ] satisfies Array<NavItem | false>
    ).filter((item): item is NavItem => Boolean(item)),
  );

  const favoriteChoices = $derived(
    (
      [
        can('favorite') && {
          id: 'favorites' as const,
          href: Route.favorites(),
          title: $t('favorites'),
          icon: mdiHeartOutline,
          activeIcon: mdiHeart,
        },
        can('sharedFavorites') && {
          id: 'shared-favorites' as const,
          href: '/shared-favorites',
          title: $t('shared_favorites'),
          icon: mdiHeartMultipleOutline,
          activeIcon: mdiHeartMultiple,
        },
      ] satisfies Array<FavoriteChoice | false>
    ).filter((item): item is FavoriteChoice => Boolean(item)),
  );

  const showNav = $derived(isMobileShell() && items.length > 0 && !assetViewerManager.isViewing);

  $effect(() => {
    const active = isMobileShell();
    document.documentElement.toggleAttribute('data-mobile-shell', active);
    if (active && sidebarStore.isOpen) {
      sidebarStore.reset();
    }

    return () => {
      document.documentElement.removeAttribute('data-mobile-shell');
    };
  });

  $effect(() => {
    page.url.pathname;
    assetViewerManager.isViewing;
    favoritesOpen = false;
  });

  const isFavoriteChoiceActive = (choice: FavoriteChoice) => {
    const path = page.url.pathname;
    return choice.id === 'shared-favorites'
      ? path.startsWith('/shared-favorites')
      : path.startsWith('/favorites') && !path.startsWith('/shared-favorites');
  };

  const openFavoritesMenu = () => {
    favoritesOpen = !favoritesOpen;
  };

  const chooseFavorite = async (href: string) => {
    favoritesOpen = false;
    await goto(href);
  };
</script>

{#if showNav}
  <nav class="pg-mobile-bottom-nav" aria-label={$t('primary')}>
    {#each items as item (item.id)}
      {@const active = isMobileNavActive(item.id, page.url.pathname)}
      {#if item.id === 'favorites' && item.hasMenu}
        <div
          class="pg-mobile-bottom-nav__menu"
          use:clickOutside={{
            onOutclick: () => (favoritesOpen = false),
            onEscape: () => (favoritesOpen = false),
          }}
        >
          {#if favoritesOpen}
            <div class="pg-mobile-favorites-menu" role="menu" aria-label={$t('favorites')}>
              {#each favoriteChoices as choice (choice.id)}
                {@const choiceActive = isFavoriteChoiceActive(choice)}
                <button
                  type="button"
                  class="pg-mobile-favorites-menu__item"
                  class:pg-mobile-favorites-menu__item--active={choiceActive}
                  role="menuitem"
                  onclick={() => chooseFavorite(choice.href)}
                >
                  <span class="pg-mobile-favorites-menu__icon" aria-hidden="true">
                    <Icon icon={choiceActive ? choice.activeIcon : choice.icon} size="20" />
                  </span>
                  <span>{choice.title}</span>
                </button>
              {/each}
            </div>
          {/if}
          <button
            type="button"
            class="pg-mobile-bottom-nav__item"
            class:pg-mobile-bottom-nav__item--active={active}
            aria-current={active ? 'page' : undefined}
            aria-expanded={favoritesOpen}
            aria-haspopup="menu"
            onclick={openFavoritesMenu}
          >
            <span class="pg-mobile-bottom-nav__icon" aria-hidden="true">
              <Icon icon={active ? item.activeIcon : item.icon} size="22" />
            </span>
            <span class="pg-mobile-bottom-nav__label">{item.title}</span>
          </button>
        </div>
      {:else if item.href}
        <a
          href={item.href}
          class="pg-mobile-bottom-nav__item"
          class:pg-mobile-bottom-nav__item--active={active}
          aria-current={active ? 'page' : undefined}
          data-sveltekit-preload-data="hover"
        >
          <span class="pg-mobile-bottom-nav__icon" aria-hidden="true">
            <Icon icon={active ? item.activeIcon : item.icon} size="22" />
          </span>
          <span class="pg-mobile-bottom-nav__label">{item.title}</span>
        </a>
      {/if}
    {/each}
  </nav>
{/if}
