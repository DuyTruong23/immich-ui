<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/ButtonContextMenu.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import ArchiveAction from '$lib/components/timeline/actions/ArchiveAction.svelte';
  import ChangeDate from '$lib/components/timeline/actions/ChangeDateAction.svelte';
  import ChangeDescription from '$lib/components/timeline/actions/ChangeDescriptionAction.svelte';
  import ChangeLocation from '$lib/components/timeline/actions/ChangeLocationAction.svelte';
  import CreateSharedLink from '$lib/components/timeline/actions/CreateSharedLinkAction.svelte';
  import DeleteAssets from '$lib/components/timeline/actions/DeleteAssetsAction.svelte';
  import DownloadAction from '$lib/components/timeline/actions/DownloadAction.svelte';
  import FavoriteAction from '$lib/components/timeline/actions/FavoriteAction.svelte';
  import SelectAllAssets from '$lib/components/timeline/actions/SelectAllAction.svelte';
  import SetVisibilityAction from '$lib/components/timeline/actions/SetVisibilityAction.svelte';
  import TagAction from '$lib/components/timeline/actions/TagAction.svelte';
  import AssetSelectControlBar from '$lib/components/timeline/AssetSelectControlBar.svelte';
  import Timeline from '$lib/components/timeline/Timeline.svelte';
  import { partnerFavoritesStore } from '$custom/stores/partner-favorites.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import { getAssetBulkActions } from '$lib/services/asset.service';
  import { handleError } from '$lib/utils/handle-error';
  import { ActionButton, CommandPaletteDefaultProvider, Switch } from '@immich/ui';
  import { mdiDotsVertical } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const { features } = getAppConfig();
  let timelineManager = $state<TimelineManager>() as TimelineManager;
  let savingShare = $state(false);
  const options = { isFavorite: true, withStacked: true };

  onMount(() => {
    if (features.sharedFavorites) {
      void partnerFavoritesStore.ensureLoaded();
    }
  });

  const handleShareToggle = async (enabled: boolean) => {
    savingShare = true;
    try {
      await partnerFavoritesStore.setShareWithEveryone(enabled);
    } catch (error) {
      handleError(error, $t('shared_favorites_load_error'));
    } finally {
      savingShare = false;
    }
  };

  const handleEscape = () => {
    if (!assetMultiSelectManager.selectionActive) {
      return;
    }

    assetMultiSelectManager.clear();
    return;
  };

  const handleSetVisibility = (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);
    assetMultiSelectManager.clear();
  };
</script>

<UserPageLayout hideNavbar={assetMultiSelectManager.selectionActive} title={data.meta.title} scrollbar={false}>
  {#snippet buttons()}
    {#if features.sharedFavorites && !assetMultiSelectManager.selectionActive}
      <label class="flex max-w-72 items-center gap-2 pe-1" title={$t('shared_favorites_share_toggle_subtitle')}>
        <span class="text-end text-xs font-medium text-primary sm:text-sm">{$t('shared_favorites_share_toggle')}</span>
        <Switch
          checked={partnerFavoritesStore.shareWithEveryone}
          disabled={savingShare}
          onCheckedChange={handleShareToggle}
        />
      </label>
    {/if}
  {/snippet}

  <Timeline
    enableRouting={true}
    withStacked={true}
    bind:timelineManager
    {options}
    assetInteraction={assetMultiSelectManager}
    onEscape={handleEscape}
  >
    {#snippet empty()}
      <EmptyPlaceholder text={$t('no_favorites_message')} class="mx-auto mt-10" />
    {/snippet}
  </Timeline>
</UserPageLayout>

<!-- Multiselection mode app bar -->
{#if assetMultiSelectManager.selectionActive}
  <AssetSelectControlBar>
    {@const Actions = getAssetBulkActions($t)}
    <CommandPaletteDefaultProvider name={$t('assets')} actions={Object.values(Actions)} />
    <FavoriteAction removeFavorite onFavorite={(assetIds) => timelineManager.removeAssets(assetIds)} />
    <CreateSharedLink />
    <SelectAllAssets {timelineManager} assetInteraction={assetMultiSelectManager} />
    <ActionButton action={Actions.AddToAlbum} />
    <ButtonContextMenu icon={mdiDotsVertical} title={$t('menu')}>
      <DownloadAction menuItem />
      <ChangeDate menuItem />
      <ChangeDescription menuItem />
      <ChangeLocation menuItem />
      <ArchiveAction
        menuItem
        unarchive={assetMultiSelectManager.isAllArchived}
        onArchive={(ids, visibility) => timelineManager.update(ids, (asset) => (asset.visibility = visibility))}
      />
      {#if authManager.preferences.tags.enabled}
        <TagAction menuItem />
      {/if}
      <SetVisibilityAction menuItem onVisibilitySet={handleSetVisibility} />
      <DeleteAssets
        menuItem
        onAssetDelete={(assetIds) => timelineManager.removeAssets(assetIds)}
        onUndoDelete={(assets) => timelineManager.upsertAssets(assets)}
      />
    </ButtonContextMenu>
  </AssetSelectControlBar>
{/if}
