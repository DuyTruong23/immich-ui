<script lang="ts">
  import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import type { AssetResponseDto } from '@immich/sdk';

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
  const thumbnailSize = 52;
  const currentSize = 60;
</script>

<nav
  class="pointer-events-auto flex w-full items-end justify-center gap-1.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
  aria-label="Nearby assets"
>
  {#each slots as asset, index (asset?.id ?? `empty-${index}`)}
    {@const isCurrent = asset?.id === current.id}
    {#if asset}
      <div
        class="relative shrink-0 rounded-md transition-transform {isCurrent
          ? 'scale-100 ring-2 ring-white ring-offset-2 ring-offset-black'
          : 'scale-95 opacity-75'}"
        aria-current={isCurrent ? 'true' : undefined}
      >
        <Thumbnail
          asset={toTimelineAsset(asset)}
          readonly
          disableLinkMouseOver
          showStackedIcon={false}
          thumbnailSize={isCurrent ? currentSize : thumbnailSize}
          imageClass={{ 'border border-white/40': !isCurrent }}
          onClick={() => {
            if (!isCurrent) {
              onSelect(asset);
            }
          }}
        />
      </div>
    {:else}
      <div
        class="shrink-0 rounded-md bg-white/10"
        style:width="{thumbnailSize}px"
        style:height="{thumbnailSize}px"
        aria-hidden="true"
      ></div>
    {/if}
  {/each}
</nav>
