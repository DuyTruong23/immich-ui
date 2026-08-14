<script lang="ts">
  import { page } from '$app/state';
  import { peekFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
  import Portal from '$lib/elements/Portal.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import { t } from 'svelte-i18n';

  const DISMISS_KEY = 'pg_feature_update_pin_dismissed_version';

  const readDismissedVersion = () => {
    try {
      return typeof localStorage === 'undefined' ? undefined : localStorage.getItem(DISMISS_KEY)?.trim() || undefined;
    } catch {
      return undefined;
    }
  };

  let dismissedVersion = $state(readDismissedVersion());

  const viewingAsset = $derived(Boolean(page.params.assetId) || assetViewerManager.isViewing);
  const currentVersion = $derived(peekFeatureUpdatesConfig().version.trim());
  const visible = $derived(
    authManager.authenticated &&
      !authManager.user.isAdmin &&
      !viewingAsset &&
      dismissedVersion !== currentVersion,
  );

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

    const version = currentVersion;
    if (!version) {
      return;
    }

    dismissedVersion = version;
    try {
      localStorage.setItem(DISMISS_KEY, version);
    } catch {
      // ignore
    }
  };
</script>

{#if visible}
  <Portal target="body">
    <div class="pg-whats-new-pin" role="group" aria-label={$t('feature_updates_whats_new')}>
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
  </Portal>
{/if}

<style>
  .pg-whats-new-pin {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right, 0px));
    bottom: max(1rem, env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    max-width: calc(100vw - 2rem);
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
