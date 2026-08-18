<script lang="ts">
  import { SwipeNavigate, swipeDismissProgress, swipeDismissScale } from '$lib/actions/swipe-navigate.svelte';
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
    onCommitStart?: (direction: 'next' | 'previous') => void;
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
    onCommitStart,
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
    onCommitStart: (direction) => {
      onCommitStart?.(direction);
    },
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

  onDestroy(() => {
    swipe.destroy();
    document.getElementById('immich-asset-viewer')?.style.removeProperty('--viewer-dismiss');
  });

  const settleMs = $derived(motionDuration(280));
  const dismissProgress = $derived(swipeDismissProgress(swipe.offsetY));
  const dismissScale = $derived(swipeDismissScale(swipe.offsetY));
  const bindTouchGuard = (node: HTMLElement) => swipe.bindTouchGuard(node);

  $effect(() => {
    const root = document.getElementById('immich-asset-viewer');
    if (!root) {
      return;
    }
    root.style.setProperty('--viewer-dismiss', String(dismissProgress));
  });
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
    style:transform="translate3d({swipe.offset}px, {swipe.offsetY}px, 0) scale({dismissScale})"
    style:opacity={swipe.offsetY > 0 ? Math.max(0.35, 1 - dismissProgress * 0.65) : 1}
    style:transition={swipe.animating
      ? `transform ${settleMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${settleMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : 'none'}
  >
    {#if previousAsset}
      <div class="absolute inset-0 -translate-x-full">
        <PhotoSwipePeek asset={previousAsset} {sharedLink} containerWidth={width} containerHeight={height} />
      </div>
    {/if}

    <div class="relative flex size-full place-content-center place-items-center">
      {@render children?.()}
    </div>

    {#if nextAsset}
      <div class="absolute inset-0 translate-x-full">
        <PhotoSwipePeek asset={nextAsset} {sharedLink} containerWidth={width} containerHeight={height} />
      </div>
    {/if}
  </div>
</div>
