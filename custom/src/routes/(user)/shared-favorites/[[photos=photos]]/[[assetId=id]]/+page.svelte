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
  import { handlePromiseError } from '$lib/utils';
  import { navigate } from '$lib/utils/navigation';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { AssetTypeEnum, getAssetInfo, UserAvatarColor, type AssetResponseDto } from '@immich/sdk';
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

  const myId = $derived(partnerFavoritesStore.me?.id);

  const items = $derived.by(() => {
    const all = partnerFavoritesStore.items;
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

  const displayItems = $derived.by(() => {
    if (partnerFavoritesStore.items.length > 0) {
      return items;
    }
    if (filter === 'partner' || filter === 'both') {
      return [];
    }
    return [...assetsById.keys()].map((assetId) => ({
      assetId,
      favoritedAt: '',
      favoritedBy: [] as PartnerFavoriteUser[],
    }));
  });

  const visibleAssets = $derived(
    displayItems.map((item) => assetsById.get(item.assetId)).filter((asset): asset is TimelineAsset => Boolean(asset)),
  );

  const counts = $derived.by(() => {
    const all = partnerFavoritesStore.items;
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
      for (const result of results) {
        if (result.status === 'fulfilled' && !result.value.isTrashed) {
          incoming.push(toTimelineAsset(result.value));
        }
      }
      mergeAssets(incoming);
      revealGrid();
    }
  };

  const measureThumbCell = (node: HTMLElement) => {
    const update = () => {
      const styles = getComputedStyle(node);
      const cols = styles.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = Number.parseFloat(styles.columnGap) || 0;
      thumbSize = Math.max(1, Math.floor((node.clientWidth - gap * Math.max(cols - 1, 0)) / cols));
    };

    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return {
      destroy() {
        observer.disconnect();
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
        void favoriteIdsPromise.then(() => resolveFirstBucket());

        await partnerFavoritesStore.ensureLoaded();
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
          ? partnerFavoritesStore.items
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

        const leftoverIds = partnerFavoritesStore.items.map((item) => item.assetId).filter((id) => !assetsById.has(id));
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

  const assetCursor = $derived({
    current: assetViewerManager.asset!,
    nextAsset: neighborAsset(1),
    previousAsset: neighborAsset(-1),
  });
</script>

<UserPageLayout title={data.meta.title} hideNavbar={assetViewerManager.isViewing}>
  <p class="mb-4 text-sm text-(--pg-text-muted)">
    {$t('shared_favorites_description')}
  </p>

  {#if partnerFavoritesStore.partners.length === 0 && partnerFavoritesStore.loaded}
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
  {:else if visibleAssets.length === 0 && loadingAssets}
    <p class="text-sm text-(--pg-text-muted)">{$t('shared_favorites_loading')}</p>
  {:else if visibleAssets.length === 0}
    <EmptyPlaceholder text={$t('shared_favorites_empty')} class="mx-auto mt-10" />
  {:else}
    <div
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      use:measureThumbCell
    >
      {#each displayItems as item (item.assetId)}
        {@const asset = assetsById.get(item.assetId)}
        {#if asset}
          <div class="relative aspect-square overflow-hidden rounded-xl">
            <Thumbnail
              {asset}
              thumbnailSize={thumbSize || undefined}
              imageClass="size-full"
              readonly
              onClick={() => handlePromiseError(onViewAsset(asset))}
            />
            <div class="pointer-events-none absolute inset-e-2 bottom-2 z-3 flex">
              {#each item.favoritedBy as user, index (user.id)}
                <div
                  class="rounded-full ring-2 ring-black/50 {index > 0 ? '-ms-2' : ''}"
                  style="z-index: {item.favoritedBy.length - index}"
                  title={$t('shared_favorites_liked_by', { values: { name: user.name } })}
                >
                  <UserAvatar user={toAvatarUser(user)} size="sm" />
                </div>
              {/each}
            </div>
          </div>
        {/if}
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
