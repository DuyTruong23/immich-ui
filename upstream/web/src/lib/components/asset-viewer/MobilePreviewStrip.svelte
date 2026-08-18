<script lang="ts">
  import ImageThumbnail from '$lib/components/assets/thumbnail/ImageThumbnail.svelte';
  import {
    PREVIEW_STRIP_CURRENT_SIZE,
    PREVIEW_STRIP_THUMB_SIZE,
    windowPreviewStrip,
  } from '$lib/components/asset-viewer/preview-layout';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { getAssetMediaUrl } from '$lib/utils';
  import { AssetMediaSize } from '@immich/sdk';

  export type PreviewStripAsset = {
    id: string;
    thumbhash: string | null;
    originalFileName?: string;
  };

  type Props = {
    assets: PreviewStripAsset[];
    currentId: string;
    onSelect: (asset: PreviewStripAsset) => void;
  };

  let { assets, currentId, onSelect }: Props = $props();

  const visibleAssets = $derived(windowPreviewStrip(assets, currentId));
  let scroller: HTMLElement | undefined = $state();

  const urlFor = (asset: PreviewStripAsset) => {
    if (!authManager.mediaAuthReady) {
      return;
    }

    return getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Thumbnail, cacheKey: asset.thumbhash });
  };

  $effect(() => {
    currentId;
    visibleAssets;
    const el = scroller?.querySelector('[aria-current="true"]');
    if (!(el instanceof HTMLElement)) {
      return;
    }
    requestAnimationFrame(() => {
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
  });
</script>

<nav
  bind:this={scroller}
  class="mobile-preview-strip pointer-events-auto w-full overflow-x-auto overscroll-x-contain touch-pan-x px-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  aria-label="Nearby assets"
>
  <div class="flex w-max min-w-full items-end justify-center gap-1.5">
    {#each visibleAssets as asset (asset.id)}
      {@const isCurrent = asset.id === currentId}
      {@const size = isCurrent ? PREVIEW_STRIP_CURRENT_SIZE : PREVIEW_STRIP_THUMB_SIZE}
      {@const url = urlFor(asset)}
      <button
        type="button"
        class="relative shrink-0 overflow-hidden rounded-lg bg-white/10 transition-[box-shadow,opacity,transform] duration-200 {isCurrent
          ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
          : 'opacity-75'}"
        style:width="{size}px"
        style:height="{size}px"
        aria-current={isCurrent ? 'true' : undefined}
        aria-label={asset.originalFileName ?? asset.id}
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
            curve
            class="size-full rounded-lg object-cover"
            preload={isCurrent}
          />
        {/if}
      </button>
    {/each}
  </div>
</nav>
