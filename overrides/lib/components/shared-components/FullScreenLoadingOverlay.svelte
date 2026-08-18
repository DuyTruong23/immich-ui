<script lang="ts">
  import { LoadingSpinner } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    visible?: boolean;
    fullscreen?: boolean;
  };

  let { visible = true, fullscreen = false }: Props = $props();
</script>

{#if visible}
  <div
    class="{fullscreen ? 'fixed z-[200]' : 'absolute z-50'} inset-0 flex items-center justify-center bg-black/40"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label={$t('loading')}
  >
    <LoadingSpinner size="large" />
  </div>
{/if}
