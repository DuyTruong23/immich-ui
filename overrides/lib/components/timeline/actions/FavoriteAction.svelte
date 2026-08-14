<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import type { OnFavorite } from '$lib/utils/actions';
  import { handleError } from '$lib/utils/handle-error';
  import { partnerFavoritesStore } from '$custom/stores/partner-favorites.svelte';
  import { updateAssets } from '@immich/sdk';
  import { IconButton, toastManager } from '@immich/ui';
  import { mdiHeartMinusOutline, mdiHeartOutline, mdiTimerSand } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    onFavorite?: OnFavorite;
    menuItem?: boolean;
    removeFavorite: boolean;
  }

  let { onFavorite, menuItem = false, removeFavorite }: Props = $props();

  let text = $derived(removeFavorite ? $t('remove_from_favorites') : $t('to_favorite'));
  let icon = $derived(removeFavorite ? mdiHeartMinusOutline : mdiHeartOutline);

  let loading = $state(false);

  const handleFavorite = async () => {
    const isFavorite = !removeFavorite;
    loading = true;

    try {
      const selected = assetMultiSelectManager.assets.filter((asset) => {
        const mine = partnerFavoritesStore.hasMine(asset.id);
        return isFavorite ? !(asset.isFavorite || mine) : asset.isFavorite || mine;
      });
      const ownedIds = selected
        .filter((asset) => authManager.authenticated && asset.ownerId === authManager.user.id)
        .map((asset) => asset.id);
      const ids = selected.map((asset) => asset.id);

      if (ownedIds.length > 0) {
        await updateAssets({ assetBulkUpdateDto: { ids: ownedIds, isFavorite } });
      }

      if (ids.length > 0) {
        await partnerFavoritesStore.setFavorite(ids, isFavorite);
      }

      for (const asset of selected) {
        if (authManager.authenticated && asset.ownerId === authManager.user.id) {
          asset.isFavorite = isFavorite;
        }
      }

      onFavorite?.(ids, isFavorite);

      toastManager.primary(
        isFavorite
          ? $t('added_to_favorites_count', { values: { count: ids.length } })
          : $t('removed_from_favorites_count', { values: { count: ids.length } }),
      );

      assetMultiSelectManager.clear();
    } catch (error) {
      handleError(error, $t('errors.unable_to_add_remove_favorites', { values: { favorite: isFavorite } }));
    } finally {
      loading = false;
    }
  };
</script>

{#if menuItem}
  <MenuOption {text} {icon} onClick={handleFavorite} />
{/if}

{#if !menuItem}
  {#if loading}
    <IconButton
      shape="round"
      color="secondary"
      variant="ghost"
      aria-label={$t('loading')}
      icon={mdiTimerSand}
      onclick={() => {}}
    />
  {:else}
    <IconButton shape="round" color="secondary" variant="ghost" aria-label={text} {icon} onclick={handleFavorite} />
  {/if}
{/if}
