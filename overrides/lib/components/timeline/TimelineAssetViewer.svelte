<script lang="ts">
  import type { Action } from '$lib/components/asset-viewer/actions/action';
  import type { AssetCursor } from '$lib/components/asset-viewer/AssetViewer.svelte';
  import { FILMSTRIP_RADIUS, buildFilmstrip, type PreviewStripItem } from '$lib/components/asset-viewer/preview-layout';
  import { AssetAction } from '$lib/constants';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { assetCacheManager } from '$lib/managers/AssetCacheManager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { websocketEvents } from '$lib/stores/websocket';
  import { handlePromiseError } from '$lib/utils';
  import { updateStackedAssetInTimeline, updateUnstackedAssetInTimeline } from '$lib/utils/actions';
  import { navigateToAsset } from '$lib/utils/asset-utils';
  import { handleErrorAsync } from '$lib/utils/handle-error';
  import { navigate } from '$lib/utils/navigation';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { type AlbumResponseDto, type AssetResponseDto, type PersonResponseDto, getAssetInfo } from '@immich/sdk';
  import { onDestroy, onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    timelineManager: TimelineManager;
    invisible: boolean;
    withStacked?: boolean;
    isShared?: boolean;
    album?: AlbumResponseDto;
    person?: PersonResponseDto;
    removeAction?: AssetAction.UNARCHIVE | AssetAction.ARCHIVE | AssetAction.SET_VISIBILITY_TIMELINE | null;
  }

  let {
    timelineManager,
    // eslint-disable-next-line no-useless-assignment
    invisible = $bindable(false),
    removeAction,
    withStacked = false,
    isShared = false,
    album,
    person,
  }: Props = $props();

  const getAsset = (id: string) => {
    return handleErrorAsync(
      () => assetCacheManager.getAsset({ ...authManager.params, id }),
      $t('error_retrieving_asset_information'),
    );
  };

  const getNextAsset = async (currentAsset: AssetResponseDto) => {
    const earlierTimelineAsset = await timelineManager.getEarlierAsset(currentAsset);
    if (!earlierTimelineAsset) {
      return;
    }
    return getAsset(earlierTimelineAsset.id);
  };

  const getPreviousAsset = async (currentAsset: AssetResponseDto) => {
    const laterTimelineAsset = await timelineManager.getLaterAsset(currentAsset);
    if (!laterTimelineAsset) {
      return;
    }
    return getAsset(laterTimelineAsset.id);
  };

  const STRIP_RADIUS = FILMSTRIP_RADIUS;

  const toStripItem = (asset: {
    id: string;
    thumbhash: string | null;
    originalFileName?: string;
    isVideo?: boolean;
    duration?: number | null;
    type?: string;
  }): PreviewStripItem => ({
    id: asset.id,
    thumbhash: asset.thumbhash,
    originalFileName: asset.originalFileName,
    isVideo: asset.isVideo ?? asset.type === 'VIDEO',
    duration: asset.duration ?? null,
  });

  let extraLaterItems = $state<PreviewStripItem[]>([]);
  let extraEarlierItems = $state<PreviewStripItem[]>([]);
  let baseLaterItems = $state<PreviewStripItem[]>([]);
  let baseEarlierItems = $state<PreviewStripItem[]>([]);
  let expandToken = 0;

  const collectStripSide = async (currentId: string, direction: 'earlier' | 'later', skipIds: Set<string>) => {
    const items: PreviewStripItem[] = [];
    const start = { id: currentId } as TimelineAsset;
    for await (const asset of timelineManager.assetsIterator({ startAsset: start, direction })) {
      if (asset.id === currentId || skipIds.has(asset.id)) {
        continue;
      }
      items.push(toStripItem(asset));
      if (items.length >= STRIP_RADIUS) {
        break;
      }
    }
    return items;
  };

  const buildNearbyAssets = (
    currentAsset: AssetResponseDto,
    nextAsset: AssetResponseDto | undefined,
    previousAsset: AssetResponseDto | undefined,
    laterItems: PreviewStripItem[],
    earlierItems: PreviewStripItem[],
  ) =>
    buildFilmstrip({
      current: toStripItem(currentAsset),
      previous: previousAsset ? toStripItem(previousAsset) : undefined,
      next: nextAsset ? toStripItem(nextAsset) : undefined,
      laterItems: [...laterItems, ...extraLaterItems],
      earlierItems: [...earlierItems, ...extraEarlierItems],
    });

  let assetCursor = $state<AssetCursor>({
    current: assetViewerManager.asset!,
    previousAsset: undefined,
    nextAsset: undefined,
  });
  let nearbyLoadToken = 0;

  const loadCloseAssets = async (currentAsset: AssetResponseDto) => {
    const token = ++nearbyLoadToken;

    // Giữ strip đầy đủ trong lúc tải lại — tránh fallback chỉ prev/current/next (3 ảnh).
    const interimNearby = buildNearbyAssets(
      currentAsset,
      assetCursor.nextAsset,
      assetCursor.previousAsset,
      baseLaterItems,
      baseEarlierItems,
    );
    if (interimNearby.length > 1) {
      assetCursor = {
        ...assetCursor,
        current: currentAsset,
        nearbyAssets: interimNearby,
      };
    }

    extraLaterItems = [];
    extraEarlierItems = [];
    const [nextAsset, previousAsset, laterItems, earlierItems] = await Promise.all([
      getNextAsset(currentAsset),
      getPreviousAsset(currentAsset),
      collectStripSide(currentAsset.id, 'later', new Set()),
      collectStripSide(currentAsset.id, 'earlier', new Set()),
    ]);

    if (token !== nearbyLoadToken) {
      return;
    }

    baseLaterItems = laterItems;
    baseEarlierItems = earlierItems;

    const nearbyAssets = buildNearbyAssets(currentAsset, nextAsset, previousAsset, laterItems, earlierItems);

    assetCursor = {
      current: currentAsset,
      nextAsset,
      previousAsset,
      nearbyAssets: nearbyAssets.length > 1 ? nearbyAssets : undefined,
    };
  };

  const expandFilmstrip = async (direction: 'earlier' | 'later') => {
    const token = ++expandToken;
    const currentAsset = assetCursor.current;
    const existingIds = new Set(assetCursor.nearbyAssets?.map((entry) => entry.id) ?? [currentAsset.id]);

    const anchorId =
      direction === 'later'
        ? assetCursor.nearbyAssets?.[0]?.id ?? currentAsset.id
        : (assetCursor.nearbyAssets?.at(-1)?.id ?? currentAsset.id);

    const batch: PreviewStripItem[] = [];
    const start = { id: anchorId } as TimelineAsset;
    for await (const asset of timelineManager.assetsIterator({ startAsset: start, direction })) {
      if (existingIds.has(asset.id)) {
        continue;
      }
      batch.push(toStripItem(asset));
      existingIds.add(asset.id);
      if (batch.length >= 4) {
        break;
      }
    }

    if (token !== expandToken || batch.length === 0) {
      return;
    }

    if (direction === 'later') {
      extraLaterItems = [...batch, ...extraLaterItems];
    } else {
      extraEarlierItems = [...extraEarlierItems, ...batch];
    }

    const nearbyAssets = buildNearbyAssets(
      currentAsset,
      assetCursor.nextAsset,
      assetCursor.previousAsset,
      baseLaterItems,
      baseEarlierItems,
    );

    assetCursor = {
      ...assetCursor,
      nearbyAssets: nearbyAssets.length > 1 ? nearbyAssets : undefined,
    };
  };

  //TODO: replace this with async derived in svelte 6
  $effect(() => {
    const asset = assetViewerManager.asset;
    if (asset) {
      handlePromiseError(loadCloseAssets(asset));
    }
  });

  const handleRandom = async () => {
    const randomAsset = await timelineManager.getRandomAsset();
    if (!randomAsset) {
      return;
    }

    await navigate({ targetRoute: 'current', assetId: randomAsset.id });
    return { id: randomAsset.id };
  };

  const handleClose = async (assetId: string) => {
    invisible = true;
    assetViewerManager.showAssetViewer(false);
    assetViewerManager.gridScrollTarget = { at: assetId };
    try {
      await navigate({
        targetRoute: 'current',
        assetId: null,
        assetGridRouteSearchParams: assetViewerManager.gridScrollTarget,
      });
    } finally {
      // Fallback: timeline phải tương tác lại nếu scrollAfterNavigate không chạy (vuốt đóng sau video).
      setTimeout(() => {
        invisible = false;
      }, 2500);
    }
  };

  const handleRemoveFromAlbum = async (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);

    if (!assetIds.includes(assetCursor.current.id)) {
      return;
    }

    // keep the cleanup workflow in viewer by moving to adjacent asset first
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (await navigateToAsset(assetCursor?.nextAsset)) ||
      (await navigateToAsset(assetCursor?.previousAsset)) ||
      (await handleClose(assetCursor.current.id));
  };

  const handlePreAction = async (action: Action) => {
    switch (action.type) {
      case removeAction:
      case AssetAction.TRASH:
      case AssetAction.RESTORE:
      case AssetAction.DELETE:
      case AssetAction.ARCHIVE:
      case AssetAction.SET_VISIBILITY_LOCKED:
      case AssetAction.SET_VISIBILITY_TIMELINE: {
        // must update manager before performing any navigation
        timelineManager.removeAssets([action.asset.id]);

        // find the next asset to show or close the viewer
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (await navigateToAsset(assetCursor?.nextAsset)) ||
          (await navigateToAsset(assetCursor?.previousAsset)) ||
          (await handleClose(action.asset.id));

        break;
      }
      // no default
    }
  };
  const handleAction = (action: Action) => {
    switch (action.type) {
      case AssetAction.ARCHIVE:
      case AssetAction.UNARCHIVE: {
        timelineManager.upsertAssets([action.asset]);
        break;
      }

      case AssetAction.STACK: {
        updateStackedAssetInTimeline(timelineManager, {
          stack: action.stack,
          toDeleteIds: action.stack.assets
            .filter((asset) => asset.id !== action.stack.primaryAssetId)
            .map((asset) => asset.id),
        });
        break;
      }

      case AssetAction.UNSTACK: {
        updateUnstackedAssetInTimeline(timelineManager, action.assets);
        break;
      }
      case AssetAction.REMOVE_ASSET_FROM_STACK: {
        timelineManager.upsertAssets([toTimelineAsset(action.asset)]);
        if (action.stack) {
          //Have to unstack then restack assets in timeline in order to update the stack count in the timeline.
          updateUnstackedAssetInTimeline(
            timelineManager,
            action.stack.assets.map((asset) => toTimelineAsset(asset)),
          );
          updateStackedAssetInTimeline(timelineManager, {
            stack: action.stack,
            toDeleteIds: action.stack.assets
              .filter((asset) => asset.id !== action.stack?.primaryAssetId)
              .map((asset) => asset.id),
          });
        }
        break;
      }
      case AssetAction.SET_STACK_PRIMARY_ASSET: {
        //Have to unstack then restack assets in timeline in order for the currently removed new primary asset to be made visible.
        updateUnstackedAssetInTimeline(
          timelineManager,
          action.stack.assets.map((asset) => toTimelineAsset(asset)),
        );
        updateStackedAssetInTimeline(timelineManager, {
          stack: action.stack,
          toDeleteIds: action.stack.assets
            .filter((asset) => asset.id !== action.stack.primaryAssetId)
            .map((asset) => asset.id),
        });
        break;
      }
      // no default
    }
  };
  const handleUndoDelete = async (assets: TimelineAsset[]) => {
    timelineManager.upsertAssets(assets);
    if (assets.length === 0) {
      return;
    }

    const restoredAsset = assets[0];
    const asset = await getAssetInfo({ ...authManager.params, id: restoredAsset.id });
    assetViewerManager.setAsset(asset);
    await navigate({ targetRoute: 'current', assetId: restoredAsset.id });
  };

  const handleUpdateOrUpload = (asset: AssetResponseDto) => {
    if (asset.id === assetCursor.current.id) {
      void loadCloseAssets(asset);
    }
  };

  onMount(() => {
    const unsubscribes = [
      websocketEvents.on('on_upload_success', (asset: AssetResponseDto) => handleUpdateOrUpload(asset)),
      websocketEvents.on('on_asset_update', (asset: AssetResponseDto) => handleUpdateOrUpload(asset)),
    ];
    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  });

  onDestroy(() => {
    assetCacheManager.invalidate();
  });
</script>

{#await import('$lib/components/asset-viewer/AssetViewer.svelte') then { default: AssetViewer }}
  <AssetViewer
    {withStacked}
    cursor={assetCursor}
    {isShared}
    {album}
    {person}
    onAssetChange={(asset) => {
      timelineManager?.upsertAssets([toTimelineAsset(asset)]);
    }}
    preAction={handlePreAction}
    onAction={(action) => {
      handleAction(action);
      assetCacheManager.invalidate();
    }}
    onUndoDelete={handleUndoDelete}
    onRandom={handleRandom}
    onRemoveFromAlbum={handleRemoveFromAlbum}
    onClose={handleClose}
    onFilmstripNearEdge={expandFilmstrip}
  />
{/await}
