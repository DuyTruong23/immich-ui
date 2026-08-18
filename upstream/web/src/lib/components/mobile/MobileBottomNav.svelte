<script lang="ts">
  import { page } from '$app/state';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { Route } from '$lib/route';
  import { sidebarStore } from '$lib/stores/sidebar.svelte';
  import { Icon } from '@immich/ui';
  import { mdiDotsHorizontal, mdiImageAlbum, mdiImageMultiple, mdiImageMultipleOutline, mdiMagnify } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { can, isMobileNavActive, isMobileShell, type MobileNavId } from '$custom/utils/capabilities.svelte';

  type NavItem = {
    id: MobileNavId;
    href: string;
    title: string;
    icon: string;
    activeIcon: string;
  };

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
        can('albums') && {
          id: 'albums' as const,
          href: Route.albums(),
          title: $t('albums'),
          icon: mdiImageAlbum,
          activeIcon: mdiImageAlbum,
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
</script>

{#if showNav}
  <nav class="pg-mobile-bottom-nav" aria-label={$t('primary')}>
    {#each items as item (item.id)}
      {@const active = isMobileNavActive(item.id, page.url.pathname)}
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
    {/each}
  </nav>
{/if}
