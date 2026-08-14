<script lang="ts">
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { Icon } from '@immich/ui';
  import { mdiClose, mdiInformationOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  const STORAGE_KEY = 'immich-mobile-thumbnail-hint-dismissed';

  const isMobile = $derived(mediaQueryManager.pointerCoarse || mediaQueryManager.maxMd);

  const readDismissed = () => {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };

  let dismissed = $state(readDismissed());

  const dismiss = () => {
    dismissed = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };
</script>

{#if isMobile && !dismissed}
  <div
    role="status"
    class="flex items-center gap-2 border-b border-white/10 bg-(--md-sys-color-surface-container) px-3 py-1.5 text-(--md-sys-color-on-surface-variant)"
  >
    <Icon icon={mdiInformationOutline} size="16" class="shrink-0 opacity-80" />
    <p class="min-w-0 flex-1 text-[11px] leading-snug">
      {$t('mobile_thumbnail_hint')}
    </p>
    <button
      type="button"
      class="flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100"
      aria-label={$t('close')}
      onclick={dismiss}
    >
      <Icon icon={mdiClose} size="16" />
    </button>
  </div>
{/if}
