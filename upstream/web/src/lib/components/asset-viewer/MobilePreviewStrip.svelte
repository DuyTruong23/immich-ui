<script lang="ts">
  import ImageThumbnail from '$lib/components/assets/thumbnail/ImageThumbnail.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { getAssetMediaUrl } from '$lib/utils';
  import { AssetMediaSize, type AssetResponseDto } from '@immich/sdk';

  type Props = {
    previousAsset2?: AssetResponseDto;
    previousAsset?: AssetResponseDto;
    current: AssetResponseDto;
    nextAsset?: AssetResponseDto;
    nextAsset2?: AssetResponseDto;
    onSelect: (asset: AssetResponseDto) => void;
  };

  let { previousAsset2, previousAsset, current, nextAsset, nextAsset2, onSelect }: Props = $props();

  const slots = $derived([previousAsset2, previousAsset, current, nextAsset, nextAsset2] as const);
  const thumbnailSize = 36;
  const currentSize = 42;

  const urlFor = (asset: AssetResponseDto) => {
    if (!authManager.mediaAuthReady) {
      return;
    }

    return getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Thumbnail, cacheKey: asset.thumbhash });
  };
</script>

<nav
  class="pointer-events-auto grid w-full grid-cols-5 items-end justify-items-center gap-1 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1"
  aria-label="Nearby assets"
>
  {#each slots as asset, index (asset?.id ?? `empty-${index}`)}
    {@const isCurrent = asset?.id === current.id}
    {@const size = isCurrent ? currentSize : thumbnailSize}
    {#if asset}
      {@const url = urlFor(asset)}
      <button
        type="button"
        class="relative overflow-hidden rounded-md {isCurrent
          ? 'ring-2 ring-white ring-offset-1 ring-offset-black'
          : 'opacity-80'}"
        style:width="{size}px"
        style:height="{size}px"
        aria-current={isCurrent ? 'true' : undefined}
        aria-label={asset.originalFileName}
        onclick={() => {
          if (!isCurrent) {
            onSelect(asset);
          }
        }}
      >
        {#if url}
          <ImageThumbnail
            {url}
            altText={asset.originalFileName}
            widthStyle="{size}px"
            heightStyle="{size}px"
            class="size-full object-cover"
            preload
          />
        {/if}
      </button>
    {:else}
      <div aria-hidden="true"></div>
    {/if}
  {/each}
</nav>
