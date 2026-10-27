<script lang="ts">
  import { swipeBack } from '$lib/actions/swipe-back';

  interface Props {
    onBack: () => void;
    enabled?: boolean;
  }

  let { onBack, enabled = true }: Props = $props();
</script>

{#if enabled}
  <div
    class="pg-swipe-back-edge"
    aria-hidden="true"
    use:swipeBack={{ onBack, enabled: () => enabled }}
  ></div>
{/if}

<style>
  .pg-swipe-back-edge {
    position: absolute;
    /* Dưới navbar overlay mobile (3rem + safe-area-top), trên filmstrip/video chrome */
    inset-block: calc(3rem + env(safe-area-inset-top, 0px)) var(--mobile-preview-strip-offset, 0px);
    inset-inline-start: 0;
    z-index: 40;
    width: 20px;
    /* pan-y: không chặn cuộn dọc bắt đầu ở mép; swipe-back tự preventDefault khi vuốt ngang */
    touch-action: pan-y;
  }

  /* Chuột (cửa sổ hẹp <768px vẫn là mobile viewer): không có cử chỉ vuốt, không nuốt click mép trái */
  @media (hover: hover) and (pointer: fine) {
    .pg-swipe-back-edge {
      display: none;
    }
  }
</style>
