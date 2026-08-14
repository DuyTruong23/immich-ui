<script lang="ts">
  import { page } from '$app/state';
  import {
    hasSeenFeatureUpdateVersion,
    markFeatureUpdateSeen,
    subscribeFeatureUpdateSeen,
  } from '$custom/hooks/feature-update-seen';
  import { peekFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    belowNavbar?: boolean;
  };

  let { belowNavbar = true }: Props = $props();

  const version = peekFeatureUpdatesConfig().version;

  let seen = $state(hasSeenFeatureUpdateVersion(version));
  let opening = $state(false);

  const viewingAsset = $derived(Boolean(page.params.assetId) || assetViewerManager.isViewing);
  const visible = $derived(authManager.authenticated && !seen && !viewingAsset && !opening);

  const refreshSeen = () => {
    seen = hasSeenFeatureUpdateVersion(version);
  };

  onMount(() => subscribeFeatureUpdateSeen(refreshSeen));

  const openWhatsNew = (event: MouseEvent) => {
    if (opening || seen) {
      return;
    }

    opening = true;
    markFeatureUpdateSeen(version);
    seen = true;

    showFeatureUpdateModal({ originElement: event.currentTarget as HTMLElement }).catch((error) => {
      console.error('[FeatureUpdatePin] Failed to open feature update modal', error);
    });
  };
</script>

{#if visible}
  <button
    type="button"
    class="pg-whats-new-pin"
    class:pg-whats-new-pin--below-navbar={belowNavbar}
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
{/if}

<style>
  .pg-whats-new-pin {
    position: fixed;
    top: max(0.5rem, env(safe-area-inset-top, 0px));
    right: max(0.75rem, env(safe-area-inset-right, 0px));
    z-index: 30;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    max-width: calc(100vw - 1.5rem - env(safe-area-inset-right, 0px) - env(safe-area-inset-left, 0px));
    padding: 0.375rem 0.75rem 0.375rem 0.5rem;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 999px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    box-shadow: var(--md-sys-elevation-2, 0 2px 8px rgb(0 0 0 / 18%));
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.25;
    cursor: pointer;
  }

  .pg-whats-new-pin--below-navbar {
    top: calc(var(--navbar-height) + 0.5rem);
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

  .pg-whats-new-pin:hover {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
  }

  .pg-whats-new-pin:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 767px) {
    .pg-whats-new-pin--below-navbar {
      top: calc(var(--navbar-height-md) + max(0.5rem, env(safe-area-inset-top, 0px)));
    }
  }

  :global(html[data-feature-update-modal]) .pg-whats-new-pin,
  :global(body:has(#control-bar)) .pg-whats-new-pin,
  :global(body:has(#immich-asset-viewer)) .pg-whats-new-pin {
    display: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    .pg-whats-new-pin {
      animation: pg-whats-new-pin-in var(--md-motion-duration-short, 200ms)
        var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) both;
    }
  }

  @keyframes pg-whats-new-pin-in {
    from {
      opacity: 0;
      transform: translateY(-0.25rem);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
