<script lang="ts">
  import AppDownloadModal from '$lib/modals/AppDownloadModal.svelte';
  import ObtainiumConfigModal from '$lib/modals/ObtainiumConfigModal.svelte';
  import { Route } from '$lib/route';
  import { Icon, modalManager, Text } from '@immich/ui';
  import {
    mdiCellphoneArrowDownVariant,
    mdiContentDuplicate,
    mdiCrosshairsGps,
    mdiImageSizeSelectLarge,
    mdiLinkEdit,
    mdiStateMachine,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';

  const links = [
    { href: Route.duplicatesUtility(), icon: mdiContentDuplicate, label: $t('review_duplicates') },
    { href: Route.largeFileUtility(), icon: mdiImageSizeSelectLarge, label: $t('review_large_files') },
    { href: Route.geolocationUtility(), icon: mdiCrosshairsGps, label: $t('manage_geolocation') },
    { href: Route.workflows(), icon: mdiStateMachine, label: $t('workflows') },
  ];
</script>

<div class="rounded-3xl border border-gray-300 pt-1 pb-6 dark:border-immich-dark-gray dark:text-white">
  <Text size="tiny" color="muted" fontWeight="medium" class="p-4">{$t('organize_your_library')}</Text>

  {#each links as link (link.href)}
    <a href={link.href} class="flex w-full items-center gap-4 p-4 hover:bg-gray-100 dark:hover:bg-immich-dark-gray">
      <span><Icon icon={link.icon} class="text-primary" size="24" /> </span>
      {link.label}
    </a>
  {/each}
</div>
<br />
