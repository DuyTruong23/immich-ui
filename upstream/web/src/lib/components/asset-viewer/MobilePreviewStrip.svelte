<script lang="ts">
  import ImageThumbnail from '$lib/components/assets/thumbnail/ImageThumbnail.svelte';
  import { FILMSTRIP_THUMB_SIZE, type PreviewStripItem } from '$lib/components/asset-viewer/preview-layout';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { getAssetMediaUrl } from '$lib/utils';
  import { AssetMediaSize } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiPlayCircleOutline } from '@mdi/js';
  import { Duration } from 'luxon';
  import { onDestroy } from 'svelte';

  type Props = {
    assets: PreviewStripItem[];
    currentId: string;
    onSelect: (asset: PreviewStripItem) => void;
    onNearEdge?: (direction: 'earlier' | 'later') => void;
  };

  let { assets, currentId, onSelect, onNearEdge }: Props = $props();

  let scroller: HTMLElement | undefined = $state();
  let userScrolling = $state(false);
  let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;
  let edgeTimer: ReturnType<typeof setTimeout> | undefined;
  let programmaticScroll = false;

  const THUMB_SIZE = FILMSTRIP_THUMB_SIZE;
  const EDGE_THRESHOLD_PX = 48;
  const USER_SCROLL_SETTLE_MS = 180;

  const urlFor = (asset: PreviewStripItem) => {
    if (!authManager.mediaAuthReady) {
      return;
    }

    return getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Thumbnail, cacheKey: asset.thumbhash });
  };

  const formatDuration = (durationMs: number | null | undefined) => {
    if (!durationMs || durationMs <= 0) {
      return '';
    }
    return Duration.fromMillis(durationMs).toFormat('m:ss');
  };

  const scrollCurrentIntoView = (behavior: ScrollBehavior = 'smooth') => {
    const el = scroller?.querySelector('[aria-current="true"]');
    if (!(el instanceof HTMLElement) || !scroller) {
      return;
    }
    programmaticScroll = true;
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior });
    requestAnimationFrame(() => {
      programmaticScroll = false;
    });
  };

  const clearScrollTimers = () => {
    if (scrollEndTimer) {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = undefined;
    }
    if (edgeTimer) {
      clearTimeout(edgeTimer);
      edgeTimer = undefined;
    }
  };

  const onScrollerScroll = () => {
    if (programmaticScroll || !scroller) {
      return;
    }

    userScrolling = true;
    clearScrollTimers();

    scrollEndTimer = setTimeout(() => {
      userScrolling = false;
    }, USER_SCROLL_SETTLE_MS);

    if (!onNearEdge) {
      return;
    }

    edgeTimer = setTimeout(() => {
      if (!scroller) {
        return;
      }
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      if (scrollLeft <= EDGE_THRESHOLD_PX) {
        onNearEdge('later');
      } else if (scrollLeft + clientWidth >= scrollWidth - EDGE_THRESHOLD_PX) {
        onNearEdge('earlier');
      }
    }, 120);
  };

  const stopGestureBubble = (event: Event) => {
    event.stopPropagation();
  };

  $effect(() => {
    currentId;
    assets;
    if (userScrolling) {
      return;
    }
    requestAnimationFrame(() => scrollCurrentIntoView('smooth'));
  });

  onDestroy(() => {
    clearScrollTimers();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav
  bind:this={scroller}
  class="mobile-preview-strip pointer-events-auto w-full overflow-x-auto overscroll-x-contain touch-pan-x px-3 pt-1.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  aria-label="Filmstrip"
  onscroll={onScrollerScroll}
  onpointerdown={stopGestureBubble}
  ontouchstart={stopGestureBubble}
>
  <div class="flex w-max min-w-full items-center justify-start gap-1.5 sm:justify-center">
    {#each assets as asset (asset.id)}
      {@const isCurrent = asset.id === currentId}
      {@const url = urlFor(asset)}
      {@const durationLabel = asset.isVideo ? formatDuration(asset.duration) : ''}
      <button
        type="button"
        class="relative shrink-0 overflow-hidden rounded-md bg-white/10 transition-[box-shadow,opacity] duration-200 {isCurrent
          ? 'z-10 opacity-100 ring-2 ring-white ring-offset-1 ring-offset-black/80'
          : 'opacity-70 hover:opacity-90'}"
        style:width="{THUMB_SIZE}px"
        style:height="{THUMB_SIZE}px"
        aria-current={isCurrent ? 'true' : undefined}
        aria-label={asset.isVideo
          ? `${asset.originalFileName ?? asset.id} (video${durationLabel ? `, ${durationLabel}` : ''})`
          : (asset.originalFileName ?? asset.id)}
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
            widthStyle="{THUMB_SIZE}px"
            heightStyle="{THUMB_SIZE}px"
            curve
            class="size-full rounded-md object-cover"
            preload={isCurrent || Math.abs(assets.findIndex((entry) => entry.id === asset.id) - assets.findIndex((entry) => entry.id === currentId)) <= 2}
          />
        {/if}

        {#if asset.isVideo}
          <span
            class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 bg-linear-to-t from-black/70 to-transparent px-1 pb-0.5 pt-2 text-[10px] leading-none font-medium text-white"
            aria-hidden="true"
          >
            <Icon icon={mdiPlayCircleOutline} size="14" class="shrink-0 opacity-90" />
            {#if durationLabel}
              <span class="tabular-nums">{durationLabel}</span>
            {/if}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</nav>
