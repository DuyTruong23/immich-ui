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
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { getAssetInfo } from '@immich/sdk';
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
  const showShareToggle = $derived(
    features.sharedFavorites && !assetMultiSelectManager.selectionActive && !authManager.user.isAdmin,
  );

  const mergedOverlayIds = new Set<string>();

  const mergeMineOverlayFavorites = async (tm: TimelineManager, isCancelled: () => boolean) => {
    const overlayIds = partnerFavoritesStore.mineAssetIds.filter((id) => {
      if (mergedOverlayIds.has(id)) {
        return false;
      }
      if (tm.getTimelineMonthByAssetId(id)) {
        mergedOverlayIds.add(id);
        return false;
      }
      return true;
    });

    for (let index = 0; index < overlayIds.length; index += 6) {
      if (isCancelled()) {
        return;
      }

      const chunk = overlayIds.slice(index, index + 6);
      const results = await Promise.allSettled(chunk.map((id) => getAssetInfo({ id })));
      if (isCancelled()) {
        return;
      }

      const incoming = [];
      for (const result of results) {
        if (result.status !== 'fulfilled' || result.value.isTrashed) {
          continue;
        }

        incoming.push({ ...toTimelineAsset(result.value), isFavorite: true });
        mergedOverlayIds.add(result.value.id);
      }

      for (const asset of incoming) {
        await tm.loadTimelineMonth(
          { year: asset.localDateTime.year, month: asset.localDateTime.month },
          { cancelable: false },
        );
        if (isCancelled()) {
          return;
        }
      }
      tm.upsertAssets(incoming);
    }
  };

  onMount(() => {
    if (!features.sharedFavorites) {
      return;
    }

    let cancelled = false;

    const syncOverlayFavorites = async () => {
      await partnerFavoritesStore.ensureLoaded();
      const started = Date.now();
      while (!cancelled && !timelineManager?.isInitialized) {
        if (Date.now() - started > 10_000) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (cancelled || !timelineManager) {
        return;
      }
      await mergeMineOverlayFavorites(timelineManager, () => cancelled);
    };

    void syncOverlayFavorites();
    return () => {
      cancelled = true;
    };
  });

  const handleShareToggle = async (enabled: boolean) => {
    savingShare = true;
    try {
      if (enabled) {
        await partnerFavoritesStore.syncMineFromImmich();
      }
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
    {#if showShareToggle}
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
