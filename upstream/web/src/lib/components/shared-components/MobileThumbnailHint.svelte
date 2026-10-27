<script lang="ts">
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { Icon } from '@immich/ui';
  import { mdiClose, mdiInformationOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { isMobileShell } from '$custom/utils/capabilities.svelte';

  const STORAGE_KEY = 'immich-mobile-thumbnail-hint-dismissed';

  // Cùng điều kiện với mobile shell (<850px, đã đăng nhập, ngoài /admin) và mọi thiết bị cảm ứng
  const isMobile = $derived(isMobileShell() || mediaQueryManager.pointerCoarse);

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
    class="pg-mobile-hint flex items-center gap-2 border-b border-white/10 bg-(--md-sys-color-surface-container) px-3 py-1.5 text-(--md-sys-color-on-surface-variant)"
  >
    <Icon icon={mdiInformationOutline} size="16" class="shrink-0 opacity-80" />
    <p class="min-w-0 flex-1 text-xs/snug">
      {$t('mobile_thumbnail_hint')}
    </p>
    <button
      type="button"
      class="pg-touch-target relative flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-(--md-state-on-surface-hover) hover:opacity-100"
      aria-label={$t('close')}
      onclick={dismiss}
    >
      <Icon icon={mdiClose} size="16" />
    </button>
  </div>
{/if}
