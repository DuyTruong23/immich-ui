<script lang="ts">
  import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import Portal from '$lib/elements/Portal.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { partnerFavoritesStore } from '$custom/stores/partner-favorites.svelte';
  import type { PartnerFavoriteUser } from '$custom/api/partner-favorites';
  import { handlePromiseError } from '$lib/utils';
  import { getNextAsset, getPreviousAsset } from '$lib/utils/asset-utils';
  import { navigate } from '$lib/utils/navigation';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { getAssetInfo, UserAvatarColor, type AssetResponseDto } from '@immich/sdk';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  type FilterId = 'all' | 'both' | 'mine' | 'partner';

  let filter = $state<FilterId>('all');
  let assets = $state<AssetResponseDto[]>([]);
  let loadingAssets = $state(true);
  let errorMessage = $state('');

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

  const visibleAssets = $derived(
    items
      .map((item) => assets.find((asset) => asset.id === item.assetId))
      .filter((asset): asset is AssetResponseDto => Boolean(asset)),
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

  const loadAssets = async (assetIds: string[]) => {
    const unique = [...new Set(assetIds)];
    const found: AssetResponseDto[] = [];

    for (let index = 0; index < unique.length; index += 12) {
      const chunk = unique.slice(index, index + 12);
      const results = await Promise.allSettled(chunk.map((id) => getAssetInfo({ id })));
      for (const result of results) {
        if (result.status === 'fulfilled' && !result.value.isTrashed) {
          found.push(result.value);
        }
      }
    }

    assets = found;
  };

  const refresh = async () => {
    loadingAssets = true;
    errorMessage = '';
    try {
      await partnerFavoritesStore.syncMineFromImmich();
      await loadAssets(partnerFavoritesStore.items.map((item) => item.assetId));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : $t('shared_favorites_load_error');
    } finally {
      loadingAssets = false;
    }
  };

  onMount(() => {
    void refresh();
  });

  const onViewAsset = async (asset: AssetResponseDto) => {
    await navigate({ targetRoute: 'current', assetId: asset.id });
  };

  const onCloseViewer = () => {
    assetViewerManager.showAssetViewer(false);
    handlePromiseError(navigate({ targetRoute: 'current', assetId: null }));
  };

  const assetCursor = $derived({
    current: assetViewerManager.asset!,
    nextAsset: getNextAsset(visibleAssets, assetViewerManager.asset),
    previousAsset: getPreviousAsset(visibleAssets, assetViewerManager.asset),
  });
</script>

<UserPageLayout title={data.meta.title}>
  <p class="mb-4 text-sm text-(--pg-text-muted)">
    {$t('shared_favorites_description')}
  </p>

  {#if partnerFavoritesStore.partners.length === 0 && partnerFavoritesStore.loaded}
    <p class="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
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

  {#if loadingAssets}
    <p class="text-sm text-(--pg-text-muted)">{$t('shared_favorites_loading')}</p>
  {:else if errorMessage}
    <p class="text-sm text-red-500">{errorMessage}</p>
  {:else if visibleAssets.length === 0}
    <EmptyPlaceholder text={$t('shared_favorites_empty')} class="mx-auto mt-10" />
  {:else}
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {#each items as item (item.assetId)}
        {@const asset = assets.find((entry) => entry.id === item.assetId)}
        {#if asset}
          <div class="relative aspect-square overflow-hidden rounded-xl">
            <Thumbnail
              asset={toTimelineAsset({ ...asset, isFavorite: false })}
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
