<script lang="ts">
  import { FILMSTRIP_THUMB_SIZE } from '$lib/components/asset-viewer/preview-layout';

  type Props = {
    /** Số placeholder hiển thị — mặc định 7 (giữa là current). */
    count?: number;
  };

  let { count = 7 }: Props = $props();

  const THUMB_SIZE = FILMSTRIP_THUMB_SIZE;
  const currentIndex = $derived(Math.floor(count / 2));
  const placeholders = $derived(Array.from({ length: count }, (_, index) => index));
</script>

<div
  class="mobile-preview-strip-skeleton pointer-events-none w-full px-3 pt-1.5 pb-0.5"
  aria-hidden="true"
  role="presentation"
>
  <div class="flex w-max min-w-full items-center justify-center gap-1.5">
    {#each placeholders as index (index)}
      {@const isCurrent = index === currentIndex}
      <div
        class="mobile-preview-strip-skeleton__thumb shrink-0 rounded-full bg-white/10 {isCurrent
          ? 'opacity-100 ring-2 ring-white/50 ring-offset-1 ring-offset-black/80'
          : 'opacity-55'}"
        style:width="{THUMB_SIZE}px"
        style:height="{THUMB_SIZE}px"
      ></div>
    {/each}
  </div>
</div>

<style>
  .mobile-preview-strip-skeleton__thumb {
    animation: filmstrip-skeleton-pulse 1.35s ease-in-out infinite;
  }

  .mobile-preview-strip-skeleton__thumb:nth-child(odd) {
    animation-delay: 0.12s;
  }

  @keyframes filmstrip-skeleton-pulse {
    0%,
    100% {
      opacity: 0.4;
    }

    50% {
      opacity: 0.9;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mobile-preview-strip-skeleton__thumb {
      animation: none;
      opacity: 0.65;
    }
  }
</style>
