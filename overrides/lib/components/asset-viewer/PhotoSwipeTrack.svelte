<script lang="ts">
  import { SwipeNavigate } from '$lib/actions/swipe-navigate.svelte';
  import { motionDuration } from '$lib/utils/mobile-performance.svelte';
  import type { AssetResponseDto, SharedLinkResponseDto } from '@immich/sdk';
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import type { SwipeCustomEvent } from 'svelte-gestures';
  import PhotoSwipePeek from './PhotoSwipePeek.svelte';

  interface Props {
    currentId: string;
    nextAsset?: AssetResponseDto;
    previousAsset?: AssetResponseDto;
    sharedLink?: SharedLinkResponseDto;
    disabled?: boolean;
    canStart?: (event: PointerEvent) => boolean;
    onSwipe?: (event: SwipeCustomEvent) => void;
    children?: Snippet;
  }

  let {
    currentId,
    nextAsset,
    previousAsset,
    sharedLink,
    disabled = false,
    canStart,
    onSwipe,
    children,
  }: Props = $props();

  let width = $state(0);
  let height = $state(0);

  const swipe = new SwipeNavigate({
    getWidth: () => width,
    getHeight: () => height,
    canStart: (event) => !disabled && (canStart?.(event) ?? true),
    hasNext: () => Boolean(nextAsset),
    hasPrevious: () => Boolean(previousAsset),
    onCommit: (direction) => {
      onSwipe?.({
        detail: { direction: direction === 'next' ? 'left' : 'right' },
      } as SwipeCustomEvent);
    },
    onDismiss: () => {
      onSwipe?.({
        detail: { direction: 'bottom' },
      } as SwipeCustomEvent);
    },
  });

  $effect.pre(() => {
    currentId;
    untrack(() => swipe.reset());
  });

  $effect(() => {
    if (disabled) {
      swipe.reset();
    }
  });

  onDestroy(() => swipe.destroy());

  const settleMs = $derived(motionDuration(280));
  const bindTouchGuard = (node: HTMLElement) => swipe.bindTouchGuard(node);
</script>

<div
  class="relative size-full overflow-hidden overscroll-none {disabled ? '' : 'touch-pinch-zoom'}"
  role="presentation"
  bind:clientWidth={width}
  bind:clientHeight={height}
  use:bindTouchGuard
  onpointerdown={swipe.onPointerDown}
  onpointermove={swipe.onPointerMove}
  onpointerup={swipe.onPointerUp}
  onpointercancel={swipe.onPointerCancel}
  ontouchstart={(event) => {
    if (event.touches.length > 1) {
      swipe.reset();
    }
  }}
>
  <div
    class="absolute inset-0 will-change-transform"
    style:transform="translate3d({swipe.offset}px, {swipe.offsetY}px, 0)"
    style:opacity={swipe.offsetY > 0 ? Math.max(0.35, 1 - swipe.offsetY / 420) : 1}
    style:transition={swipe.animating ? `transform ${settleMs}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none'}
  >
    {#if previousAsset}
      <div class="absolute inset-0 -translate-x-full">
        <PhotoSwipePeek asset={previousAsset} {sharedLink} />
      </div>
    {/if}

    <div class="relative flex size-full place-content-center place-items-center">
      {@render children?.()}
    </div>

    {#if nextAsset}
      <div class="absolute inset-0 translate-x-full">
        <PhotoSwipePeek asset={nextAsset} {sharedLink} />
      </div>
    {/if}
  </div>
</div>
