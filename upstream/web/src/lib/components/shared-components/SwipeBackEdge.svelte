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
    inset-block: 64px 0;
    inset-inline-start: 0;
    z-index: 40;
    width: 32px;
    touch-action: none;
  }
</style>
