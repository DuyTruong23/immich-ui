<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { Route } from '$lib/route';
  import { Icon } from '@immich/ui';
  import {
    mdiAccountMultipleOutline,
    mdiAccountOutline,
    mdiArchiveArrowDownOutline,
    mdiCogOutline,
    mdiFolderOutline,
    mdiImageAlbum,
    mdiLink,
    mdiLockOutline,
    mdiMagnify,
    mdiMapOutline,
    mdiShieldAccountOutline,
    mdiTagMultipleOutline,
    mdiToolboxOutline,
    mdiTrashCanOutline,
    mdiUploadOutline,
    mdiViewDashboardOutline,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { can } from '$custom/utils/capabilities.svelte';

  type MoreItem = {
    id: string;
    href: string;
    title: string;
    icon: string;
  };

  type MoreSection = {
    id: string;
    title: string;
    items: MoreItem[];
  };

  const sections = $derived.by((): MoreSection[] => {
    const libraryItems = [
      can('albums') && { id: 'albums', href: Route.albums(), title: $t('albums'), icon: mdiImageAlbum },
      can('explore') && { id: 'explore', href: Route.explore(), title: $t('explore'), icon: mdiMagnify },
      can('people') && { id: 'people', href: Route.people(), title: $t('people'), icon: mdiAccountOutline },
      can('map') && { id: 'map', href: Route.map(), title: $t('map'), icon: mdiMapOutline },
      can('sharing') && { id: 'sharing', href: Route.sharing(), title: $t('sharing'), icon: mdiAccountMultipleOutline },
      can('sharedLinks') && { id: 'shared-links', href: Route.sharedLinks(), title: $t('shared_links'), icon: mdiLink },
      can('recentlyAdded') && {
        id: 'recently-added',
        href: Route.recentlyAdded(),
        title: $t('recently_added'),
        icon: mdiUploadOutline,
      },
      can('folders') && { id: 'folders', href: Route.folders(), title: $t('folders'), icon: mdiFolderOutline },
      can('tags') && { id: 'tags', href: Route.tags(), title: $t('tags'), icon: mdiTagMultipleOutline },
      can('utilities') && { id: 'utilities', href: Route.utilities(), title: $t('utilities'), icon: mdiToolboxOutline },
      can('archive') && { id: 'archive', href: Route.archive(), title: $t('archive'), icon: mdiArchiveArrowDownOutline },
      can('lockedFolder') && { id: 'locked', href: Route.locked(), title: $t('locked_folder'), icon: mdiLockOutline },
      can('trash') && { id: 'trash', href: Route.trash(), title: $t('trash'), icon: mdiTrashCanOutline },
    ].filter((item): item is MoreItem => Boolean(item));

    const settingsItems = [
      can('settings') && { id: 'settings', href: Route.userSettings(), title: $t('settings'), icon: mdiCogOutline },
    ].filter((item): item is MoreItem => Boolean(item));

    const adminItems = [
      can('dashboard') && { id: 'dashboard', href: '/dashboard', title: 'Dashboard', icon: mdiViewDashboardOutline },
      can('admin') && { id: 'users', href: Route.users(), title: $t('users'), icon: mdiAccountOutline },
      can('admin') && { id: 'system', href: Route.systemSettings(), title: $t('admin.system_settings'), icon: mdiCogOutline },
      can('admin') && {
        id: 'feature-updates',
        href: '/admin/feature-updates',
        title: $t('admin.feature_updates'),
        icon: mdiShieldAccountOutline,
      },
    ].filter((item): item is MoreItem => Boolean(item));

    return [
      { id: 'library', title: $t('library'), items: libraryItems },
      { id: 'settings', title: $t('settings'), items: settingsItems },
      { id: 'admin', title: $t('administration'), items: adminItems },
    ].filter((section) => section.items.length > 0);
  });
</script>

<UserPageLayout>
  <div class="pg-more-page">
    {#if authManager.authenticated}
      <div class="pg-more-account">
        <UserAvatar user={authManager.user} size="lg" noTitle />
        <div class="pg-more-account__text">
          <p class="pg-more-account__name">{authManager.user.name}</p>
          <p class="pg-more-account__email">{authManager.user.email}</p>
        </div>
      </div>
    {/if}

    {#each sections as section (section.id)}
      <section>
        <h2 class="pg-more-section__title">{section.title}</h2>
        <div class="pg-more-list">
          {#each section.items as item (item.id)}
            <a href={item.href} class="pg-more-list__item" data-sveltekit-preload-data="hover">
              <span class="pg-more-list__icon" aria-hidden="true">
                <Icon icon={item.icon} size="22" />
              </span>
              <span class="pg-more-list__label">{item.title}</span>
            </a>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</UserPageLayout>
