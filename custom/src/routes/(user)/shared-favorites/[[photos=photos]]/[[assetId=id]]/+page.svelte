<script lang="ts">
  import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import Portal from '$lib/elements/Portal.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { partnerFavoritesStore } from '$custom/stores/partner-favorites.svelte';
  import type { PartnerFavoriteUser } from '$custom/api/partner-favorites';
  import { pinchGrid } from '$lib/actions/pinch-grid.svelte';
  import { gridDensityManager } from '$lib/stores/grid-density.svelte';
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { handlePromiseError } from '$lib/utils';
  import { handleError } from '$lib/utils/handle-error';
  import { navigate } from '$lib/utils/navigation';
  import { toTimelineAsset, type TimelineDateTime } from '$lib/utils/timeline-util';
  import { AssetTypeEnum, AssetVisibility, getAssetInfo, updateAssets, UserAvatarColor, type AssetResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiClose } from '@mdi/js';
  import { DateTime } from 'luxon';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  type FilterId = 'all' | 'both' | 'mine' | 'partner';

  let filter = $state<FilterId>('all');
  let assetsById = $state(new Map<string, TimelineAsset>());
  let loadingAssets = $state(true);
  let errorMessage = $state('');
  let thumbSize = $state(0);
  const isMobileGrid = $derived(mediaQueryManager.pointerCoarse || mediaQueryManager.maxMd);

  const myId = $derived(partnerFavoritesStore.me?.id);
  const isAdmin = $derived(partnerFavoritesStore.me?.isAdmin === true);
  let removingIds = $state(new Set<string>());

  const items = $derived.by(() => {
    const all = partnerFavoritesStore.listedItems;
    if (filter === 'both') {
      return all.filter((item) => item.favoritedBy.length > 1);
    }
    if (filter === 'mine' && myId) {
      return all.filter((item) => item.favoritedBy.some((user) => user.id === myId));
    }
    if (filter === 'partner' && myId) {
      return all.filter((item) => item.favoritedBy.some((user) => user.id !== myId));
    }
    return all;
  });

  const displayItems = $derived(items);

  const stubDate = (): TimelineDateTime => {
    const now = DateTime.now();
    return {
      year: now.year,
      month: now.month,
      day: now.day,
      hour: now.hour,
      minute: now.minute,
      second: now.second,
      millisecond: now.millisecond,
    };
  };

  const stubAsset = (assetId: string, ownerId = ''): TimelineAsset => ({
    id: assetId,
    ownerId,
    ratio: 1,
    thumbhash: null,
    localDateTime: stubDate(),
    createdAt: stubDate(),
    fileCreatedAt: stubDate(),
    visibility: AssetVisibility.Timeline,
    isFavorite: false,
    isTrashed: false,
    isVideo: false,
    isImage: true,
    stack: null,
    duration: null,
    projectionType: null,
    livePhotoVideoId: null,
    city: null,
    country: null,
    people: null,
  });

  const assetForItem = (item: { assetId: string; favoritedBy: PartnerFavoriteUser[] }): TimelineAsset =>
    assetsById.get(item.assetId) ?? stubAsset(item.assetId, item.favoritedBy[0]?.id ?? '');

  const visibleAssets = $derived(displayItems.map((item) => assetForItem(item)));

  const counts = $derived.by(() => {
    const all = partnerFavoritesStore.listedItems;
    return {
      all: all.length,
      both: all.filter((item) => item.favoritedBy.length > 1).length,
      mine: myId ? all.filter((item) => item.favoritedBy.some((user) => user.id === myId)).length : 0,
      partner: myId ? all.filter((item) => item.favoritedBy.some((user) => user.id !== myId)).length : 0,
    };
  });

  const filters = $derived([
    { id: 'all' as const, label: $t('shared_favorites_filter_all') },
    { id: 'both' as const, label: $t('shared_favorites_filter_both') },
    { id: 'mine' as const, label: $t('shared_favorites_filter_mine') },
    { id: 'partner' as const, label: $t('shared_favorites_filter_partner') },
  ]);

  const resolveFavoriteUser = (user: PartnerFavoriteUser): PartnerFavoriteUser => {
    if (authManager.user?.id === user.id) {
      return {
        ...user,
        name: authManager.user.name,
        email: authManager.user.email,
        profileImagePath: authManager.user.profileImagePath,
        profileChangedAt: authManager.user.profileChangedAt,
        avatarColor: authManager.user.avatarColor,
      };
    }

    const known =
      partnerFavoritesStore.me?.id === user.id
        ? partnerFavoritesStore.me
        : partnerFavoritesStore.partners.find((partner) => partner.id === user.id);

    if (!known) {
      return user;
    }

    return {
      ...user,
      name: known.name || user.name,
      email: known.email || user.email,
      profileImagePath: known.profileImagePath || user.profileImagePath,
      profileChangedAt: known.profileChangedAt || user.profileChangedAt,
      avatarColor: known.avatarColor || user.avatarColor,
    };
  };

  const toAvatarUser = (user: PartnerFavoriteUser) => {
    const resolved = resolveFavoriteUser(user);
    return {
      id: resolved.id,
      name: resolved.name,
      email: resolved.email,
      profileImagePath: resolved.profileImagePath,
      profileChangedAt: resolved.profileChangedAt,
      avatarColor: (Object.values(UserAvatarColor) as string[]).includes(resolved.avatarColor)
        ? (resolved.avatarColor as UserAvatarColor)
        : UserAvatarColor.Primary,
    };
  };

  const mergeAssets = (incoming: TimelineAsset[]) => {
    if (incoming.length === 0) {
      return;
    }

    const next = new Map(assetsById);
    for (const asset of incoming) {
      next.set(asset.id, { ...asset, isFavorite: false });
    }
    assetsById = next;
  };

  const revealGrid = () => {
    if (!loadingAssets) {
      return;
    }

    if (visibleAssets.length > 0) {
      loadingAssets = false;
    }
  };

  const loadMissingAssets = async (assetIds: string[], isCancelled: () => boolean) => {
    const unique = [...new Set(assetIds)].filter((id) => !assetsById.has(id));

    for (let index = 0; index < unique.length; index += 6) {
      if (isCancelled()) {
        return;
      }

      const chunk = unique.slice(index, index + 6);
      const results = await Promise.allSettled(chunk.map((id) => getAssetInfo({ id })));
      if (isCancelled()) {
        return;
      }

      const incoming: TimelineAsset[] = [];
      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled' && !result.value.isTrashed) {
          incoming.push(toTimelineAsset(result.value));
          continue;
        }

        if (result.status === 'fulfilled' && result.value.isTrashed) {
          continue;
        }

        incoming.push(stubAsset(chunk[index]));
      }
      mergeAssets(incoming);
      revealGrid();
    }
  };

  const measureThumbCell = (node: HTMLElement) => {
    const update = () => {
      const styles = getComputedStyle(node);
      const cols = isMobileGrid
        ? gridDensityManager.columns
        : styles.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = Number.parseFloat(styles.columnGap) || 0;
      thumbSize = Math.max(1, Math.floor((node.clientWidth - gap * Math.max(cols - 1, 0)) / cols));
    };

    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();

    const unsubscribe = $effect.root(() => {
      $effect(() => {
        gridDensityManager.columns;
        update();
      });
    });

    return {
      destroy() {
        observer.disconnect();
        unsubscribe();
      },
    };
  };

  const toCursorAsset = (asset: TimelineAsset | undefined): AssetResponseDto | undefined => {
    if (!asset) {
      return undefined;
    }

    const width = 1000;
    const height = Math.max(1, Math.round(width / (asset.ratio || 1)));
    return {
      id: asset.id,
      ownerId: asset.ownerId,
      thumbhash: asset.thumbhash,
      type: asset.isVideo ? AssetTypeEnum.Video : AssetTypeEnum.Image,
      width,
      height,
      livePhotoVideoId: asset.livePhotoVideoId,
      duration: asset.duration,
      visibility: asset.visibility,
    } as AssetResponseDto;
  };

  const neighborAsset = (delta: 1 | -1): AssetResponseDto | undefined => {
    const currentId = assetViewerManager.asset?.id;
    const index = currentId ? visibleAssets.findIndex((asset) => asset.id === currentId) : -1;
    return toCursorAsset(index >= 0 ? visibleAssets[index + delta] : undefined);
  };

  onMount(() => {
    let cancelled = false;

    const refresh = async () => {
      loadingAssets = true;
      errorMessage = '';

      try {
        let resolveFirstBucket = () => {};
        const firstBucket = new Promise<void>((resolve) => {
          resolveFirstBucket = resolve;
        });

        const favoriteIdsPromise = partnerFavoritesStore.loadFavoriteBuckets((assets) => {
          if (cancelled) {
            return;
          }
          mergeAssets(assets);
          revealGrid();
          resolveFirstBucket();
        });
        void partnerFavoritesStore
          .loadFavoriteBuckets((assets) => {
            if (cancelled) {
              return;
            }
            mergeAssets(assets);
            revealGrid();
            resolveFirstBucket();
          }, { withPartners: true })
          .then(() => resolveFirstBucket())
          .catch((error) => {
            console.warn('[shared-favorites] partner buckets failed', error);
            resolveFirstBucket();
          });
        void favoriteIdsPromise.then(() => resolveFirstBucket());

        await partnerFavoritesStore.ensureLoaded();
        if (cancelled) {
          return;
        }
        if (partnerFavoritesStore.me?.isAdmin) {
          await partnerFavoritesStore.loadEveryoneFavoritesForAdmin((assets) => {
            if (cancelled) {
              return;
            }
            mergeAssets(assets);
            revealGrid();
            resolveFirstBucket();
          });
        }
        if (cancelled) {
          return;
        }
        await firstBucket;
        if (cancelled) {
          return;
        }
        revealGrid();

        const ownerId = partnerFavoritesStore.me?.id;
        const partnerOnlyIds = ownerId
          ? partnerFavoritesStore.listedItems
              .filter((item) => !item.favoritedBy.some((user) => user.id === ownerId))
              .map((item) => item.assetId)
          : [];

        const [, favoriteIds] = await Promise.all([
          loadMissingAssets(partnerOnlyIds, () => cancelled),
          favoriteIdsPromise,
        ]);
        if (cancelled) {
          return;
        }

        await partnerFavoritesStore.syncMineFromImmich(favoriteIds);
        if (cancelled) {
          return;
        }
        revealGrid();

        const leftoverIds = partnerFavoritesStore.listedItems
          .map((item) => item.assetId)
          .filter((id) => !assetsById.has(id));
        await loadMissingAssets(leftoverIds, () => cancelled);
      } catch (error) {
        if (!cancelled) {
          errorMessage = error instanceof Error ? error.message : $t('shared_favorites_load_error');
        }
      } finally {
        if (!cancelled) {
          loadingAssets = false;
        }
      }
    };

    void refresh();
    return () => {
      cancelled = true;
    };
  });

  const onViewAsset = async (asset: TimelineAsset) => {
    await navigate({ targetRoute: 'current', assetId: asset.id });
  };

  const onCloseViewer = () => {
    assetViewerManager.showAssetViewer(false);
    handlePromiseError(navigate({ targetRoute: 'current', assetId: null }));
  };

  const canRemoveItem = (item: { favoritedBy: PartnerFavoriteUser[] }) => {
    if (isAdmin) {
      return true;
    }
    return Boolean(myId && item.favoritedBy.some((user) => user.id === myId));
  };

  const handleRemoveFavorite = async (
    event: MouseEvent,
    item: { assetId: string; favoritedBy: PartnerFavoriteUser[] },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (removingIds.has(item.assetId) || !canRemoveItem(item)) {
      return;
    }

    removingIds = new Set(removingIds).add(item.assetId);
    try {
      const userIds = isAdmin ? item.favoritedBy.map((user) => user.id) : undefined;
      await partnerFavoritesStore.setFavorite(item.assetId, false, userIds);

      const asset = assetsById.get(item.assetId);
      if (authManager.authenticated && asset && asset.ownerId === authManager.user.id) {
        await updateAssets({ assetBulkUpdateDto: { ids: [item.assetId], isFavorite: false } });
      }
    } catch (error) {
      handleError(error, $t('shared_favorites_remove_error'));
    } finally {
      const next = new Set(removingIds);
      next.delete(item.assetId);
      removingIds = next;
    }
  };

  const assetCursor = $derived({
    current: assetViewerManager.asset!,
    nextAsset: neighborAsset(1),
    previousAsset: neighborAsset(-1),
  });
</script>

<UserPageLayout title={data.meta.title} hideNavbar={assetViewerManager.isViewing}>
  {#if !partnerFavoritesStore.me?.isAdmin && partnerFavoritesStore.partners.length === 0 && partnerFavoritesStore.loaded}
    <p
      class="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
    >
      {$t('shared_favorites_no_partner')}
    </p>
  {/if}

  <div class="mb-5 flex flex-wrap gap-2">
    {#each filters as item (item.id)}
      <button
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm transition-colors {filter === item.id
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-(--pg-border) text-(--pg-text-muted) hover:border-primary/40'}"
        onclick={() => (filter = item.id)}
      >
        {item.label}
        <span class="ms-1 opacity-70">{counts[item.id]}</span>
      </button>
    {/each}
  </div>

  {#if errorMessage}
    <p class="text-sm text-red-500">{errorMessage}</p>
  {:else if displayItems.length === 0 && loadingAssets}
    <p class="text-sm text-(--pg-text-muted)">{$t('shared_favorites_loading')}</p>
  {:else if displayItems.length === 0}
    <EmptyPlaceholder text={$t('shared_favorites_empty')} class="mx-auto mt-10" />
  {:else}
    <div
      class="pg-photo-grid grid gap-2 {isMobileGrid ? '' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'}"
      style:grid-template-columns={isMobileGrid
        ? `repeat(${gridDensityManager.columns}, minmax(0, 1fr))`
        : undefined}
      use:measureThumbCell
      use:pinchGrid
    >
      {#each displayItems as item (item.assetId)}
        {@const asset = assetForItem(item)}
        <div class="relative isolate aspect-square overflow-hidden rounded-xl {removingIds.has(item.assetId) ? 'opacity-60' : ''}">
          <Thumbnail
            {asset}
            thumbnailSize={thumbSize || undefined}
            imageClass="size-full"
            readonly
            onClick={() => handlePromiseError(onViewAsset(asset))}
          />
          {#if canRemoveItem(item)}
            <button
              type="button"
              class="absolute top-2 end-2 z-20 flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/80 disabled:opacity-50"
              aria-label={isAdmin ? $t('shared_favorites_remove_admin') : $t('unfavorite')}
              disabled={removingIds.has(item.assetId)}
              onclick={(event) => handlePromiseError(handleRemoveFavorite(event, item))}
            >
              <Icon icon={mdiClose} size="18" />
            </button>
          {/if}
          <div class="pointer-events-none absolute inset-e-2 bottom-2 flex">
            {#each item.favoritedBy as user, index (user.id)}
              <div
                class="relative rounded-full ring-2 ring-black/50 {index > 0 ? '-ms-2' : ''}"
                style="z-index: {item.favoritedBy.length - index}"
                title={$t('shared_favorites_liked_by', { values: { name: user.name } })}
              >
                <UserAvatar user={toAvatarUser(user)} size="sm" />
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</UserPageLayout>

{#if assetViewerManager.isViewing}
  {#await import('$lib/components/asset-viewer/AssetViewer.svelte') then { default: AssetViewer }}
    <Portal target="body">
      <AssetViewer cursor={assetCursor} onClose={onCloseViewer} />
    </Portal>
  {/await}
{/if}
