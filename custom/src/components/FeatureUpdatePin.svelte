<script lang="ts">
  import { page } from '$app/state';
  import Portal from '$lib/elements/Portal.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { openFileUploadDialog } from '$lib/utils/file-uploader';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { can, isMobileShell } from '$custom/utils/capabilities.svelte';
  import { isCookRoute } from '$custom/utils/cook-route';

  const LEGACY_DISMISS_KEY = 'pg_feature_update_pin_dismissed_version';

  let dismissedThisSession = $state(false);
  let pinUserId = $state('');
  let featureUpdateModalOpen = $state(false);

  $effect(() => {
    const userId = authManager.authenticated ? authManager.user.id : '';
    if (userId === pinUserId) {
      return;
    }

    pinUserId = userId;
    dismissedThisSession = false;
  });

  const onCookPage = $derived(isCookRoute(page.url.pathname));
  const viewingAsset = $derived(Boolean(page.params.assetId) || assetViewerManager.isViewing);
  const canUpload = $derived(can('upload'));
  const showUpload = $derived(
    !onCookPage &&
      canUpload &&
      !viewingAsset &&
      !featureUpdateModalOpen &&
      (isMobileShell() || !authManager.user.isAdmin),
  );
  const showWhatsNew = $derived(
    !onCookPage &&
      authManager.authenticated &&
      !authManager.user.isAdmin &&
      !viewingAsset &&
      !dismissedThisSession &&
      !featureUpdateModalOpen,
  );
  const showCluster = $derived(showUpload || showWhatsNew);

  onMount(() => {
    try {
      localStorage.removeItem(LEGACY_DISMISS_KEY);
    } catch {
      // ignore
    }

    const root = document.documentElement;
    const syncModalOpen = () => {
      featureUpdateModalOpen = Boolean(root.dataset.featureUpdateModal);
    };
    syncModalOpen();
    const observer = new MutationObserver(syncModalOpen);
    observer.observe(root, { attributes: true, attributeFilter: ['data-feature-update-modal'] });
    return () => observer.disconnect();
  });

  const openWhatsNew = (event: MouseEvent) => {
    showFeatureUpdateModal({
      originElement: event.currentTarget as HTMLElement,
      userId: authManager.user.id,
      accountEmail: authManager.user.email,
    }).catch((error) => {
      console.error('[FeatureUpdatePin] Failed to open feature update modal', error);
    });
  };

  const dismissPin = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dismissedThisSession = true;
  };

  const openUpload = () => {
    void openFileUploadDialog();
  };
</script>

{#if showCluster}
  <Portal target="body">
    <div class="pg-gallery-fabs" role="group" aria-label={$t('upload')}>
      {#if showUpload}
        <button
          type="button"
          class="pg-upload-fab"
          aria-label={$t('upload')}
          title={$t('upload')}
          onclick={openUpload}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" />
          </svg>
        </button>
      {/if}

      {#if showWhatsNew}
        <div class="pg-whats-new-pin">
          <button
            type="button"
            class="pg-whats-new-pin__open"
            aria-label={$t('feature_updates_whats_new')}
            onclick={openWhatsNew}
          >
            <span class="pg-whats-new-pin__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2,4.31L15.41,2.86C14.32,2.3 13.19,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12M22,5.5A2.5,2.5 0 0,1 19.5,8A2.5,2.5 0 0,1 17,5.5A2.5,2.5 0 0,1 19.5,3A2.5,2.5 0 0,1 22,5.5M16.27,7.27L11.09,12.45L9.73,11.09L8.32,12.5L11.09,15.27L17.68,8.68L16.27,7.27Z"
                />
              </svg>
            </span>
            <span class="pg-whats-new-pin__label">{$t('feature_updates_whats_new')}</span>
          </button>
          <button type="button" class="pg-whats-new-pin__dismiss" aria-label={$t('close')} onclick={dismissPin}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"
              />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </Portal>
{/if}

<style>
  :global(html[data-feature-update-modal]) .pg-gallery-fabs {
    display: none;
  }

  .pg-gallery-fabs {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right, 0px));
    bottom: max(1rem, env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    max-width: calc(100vw - 2rem);
  }

  .pg-upload-fab {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 999px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    box-shadow: var(--md-sys-elevation-3, 0 4px 16px rgb(0 0 0 / 28%));
    cursor: pointer;
  }

  .pg-upload-fab:hover {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
  }

  .pg-upload-fab:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }

  .pg-whats-new-pin {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    min-width: 0;
    max-width: 100%;
    padding: 0.375rem 0.375rem 0.375rem 0.625rem;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 999px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    box-shadow: var(--md-sys-elevation-3, 0 4px 16px rgb(0 0 0 / 28%));
  }

  .pg-whats-new-pin__open {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.25rem 0.125rem 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.25;
    cursor: pointer;
  }

  .pg-whats-new-pin__icon {
    display: inline-flex;
    flex-shrink: 0;
  }

  .pg-whats-new-pin__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pg-whats-new-pin__dismiss {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    min-width: 1.75rem;
    min-height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    opacity: 0.72;
    cursor: pointer;
  }

  .pg-whats-new-pin:has(.pg-whats-new-pin__open:hover) {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
  }

  .pg-whats-new-pin__dismiss:hover {
    background: color-mix(in srgb, currentColor 14%, transparent);
    opacity: 1;
  }

  .pg-whats-new-pin__open:focus-visible,
  .pg-whats-new-pin__dismiss:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }
</style>
