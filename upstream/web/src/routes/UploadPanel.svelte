<script lang="ts">
  import { eventManager } from '$lib/managers/event-manager.svelte';
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { locale } from '$lib/stores/preferences.store';
  import { uploadAssetsStore } from '$lib/stores/upload';
  import { UploadState } from '$lib/types';
  import { uploadExecutionQueue } from '$lib/utils/file-uploader';
  import { acquireWakeLock, releaseWakeLock } from '$lib/utils/wakelock.svelte';
  import { Icon, IconButton, toastManager } from '@immich/ui';
  import { mdiCancel, mdiCloudUploadOutline, mdiCog, mdiWindowMinimize } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { quartInOut } from 'svelte/easing';
  import { fade, scale } from 'svelte/transition';
  import UploadAssetPreview from './UploadAssetPreview.svelte';

  let showDetail = $state(false);
  let showOptions = $state(false);
  let concurrency = $state(uploadExecutionQueue.concurrency);
  let didNotifyComplete = false;
  const completedAssetIds = new Set<string>();

  let { stats, isDismissible, isUploading, remainingUploads } = uploadAssetsStore;

  let hasRemaining = $derived($remainingUploads > 0);
  const isMobilePanel = $derived(mediaQueryManager.pointerCoarse || mediaQueryManager.maxMd);

  $effect(() => {
    if ($isUploading) {
      showDetail = true;
    }
  });

  $effect(() => {
    for (const item of $uploadAssetsStore) {
      if (item.state === UploadState.DONE && item.assetId) {
        completedAssetIds.add(item.assetId);
      }
    }
  });

  $effect(() => {
    if (hasRemaining) {
      didNotifyComplete = false;
      void acquireWakeLock();
      return;
    }

    void releaseWakeLock();

    if (!didNotifyComplete && $isUploading && $stats.success > 0) {
      didNotifyComplete = true;
      const assetIds = [...completedAssetIds];
      completedAssetIds.clear();
      void (async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        eventManager.emit('UploadsComplete', { assetIds });
      })();
    }
  });
</script>

{#if $isUploading}
  <div
    in:fade={{ duration: 250 }}
    out:fade={{ duration: 250 }}
    onoutroend={() => {
      if ($stats.errors > 0) {
        toastManager.danger($t('upload_errors', { values: { count: $stats.errors } }));
      } else if ($stats.success > 0) {
        toastManager.primary($t('upload_success'));
      }
      if ($stats.duplicates > 0) {
        toastManager.warning($t('upload_skipped_duplicates', { values: { count: $stats.duplicates } }));
      }
      uploadAssetsStore.reset();
    }}
    class="fixed z-60 {isMobilePanel
      ? 'pg-upload-panel-mobile inset-x-3'
      : 'inset-e-16 bottom-6'}"
  >
    {#if showDetail}
      <div
        in:scale={{ duration: 250, easing: quartInOut }}
        class="rounded-xl border border-gray-200 bg-subtle p-3 text-sm shadow-xs max-md:max-h-[min(70dvh,32rem)] max-md:overflow-hidden dark:border-subtle {isMobilePanel
          ? 'w-full max-w-full'
          : 'w-81 p-4'}"
      >
        <div class="place-item-center mb-3 flex justify-between gap-2 md:mb-4">
          <div class="flex min-w-0 flex-col gap-1">
            <p class="text-xm immich-form-label">
              {$t('upload_progress', {
                values: {
                  remaining: $remainingUploads,
                  processed: $stats.total - $remainingUploads,
                  total: $stats.total,
                },
              })}
            </p>
            <p class="text-xs immich-form-label">
              {$t('upload_status_uploaded')}
              <span class="text-success">{$stats.success.toLocaleString($locale)}</span>
              -
              {$t('upload_status_errors')}
              <span class="text-danger">{$stats.errors.toLocaleString($locale)}</span>
              -
              {$t('upload_status_duplicates')}
              <span class="text-warning">{$stats.duplicates.toLocaleString($locale)}</span>
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end">
            <div class="flex flex-row">
              <IconButton
                variant="ghost"
                shape="round"
                color="secondary"
                icon={mdiCog}
                size="small"
                onclick={() => (showOptions = !showOptions)}
                aria-label={$t('toggle_settings')}
              />
              <IconButton
                variant="ghost"
                shape="round"
                color="secondary"
                aria-label={$t('minimize')}
                icon={mdiWindowMinimize}
                size="small"
                onclick={() => (showDetail = false)}
              />
            </div>
            {#if $isDismissible}
              <IconButton
                variant="ghost"
                shape="round"
                color="secondary"
                aria-label={$t('dismiss_all_errors')}
                icon={mdiCancel}
                size="small"
                onclick={() => uploadAssetsStore.dismissErrors()}
              />
            {/if}
          </div>
        </div>
        {#if showOptions}
          <div class="mb-4 max-h-100 immich-scrollbar overflow-y-auto rounded-lg">
            <div class="flex h-6.5 place-items-center gap-1">
              <label class="immich-form-label" for="upload-concurrency">{$t('upload_concurrency')}</label>
            </div>
            <input
              class="immich-form-input w-full"
              aria-labelledby={$t('upload_concurrency')}
              id="upload-concurrency"
              name={$t('upload_concurrency')}
              type="number"
              min="1"
              max="50"
              step="1"
              bind:value={concurrency}
              onchange={() => (uploadExecutionQueue.concurrency = concurrency)}
            />
          </div>
        {/if}
        <div
          class="immich-scrollbar flex flex-col gap-2 overflow-y-auto rounded-lg {isMobilePanel
            ? 'max-h-[min(48dvh,22rem)]'
            : 'max-h-[400px]'}"
        >
          {#each $uploadAssetsStore as uploadAsset (uploadAsset.id)}
            <UploadAssetPreview {uploadAsset} />
          {/each}
        </div>
      </div>
    {:else}
      <div class="rounded-full {isMobilePanel ? 'ms-auto w-fit' : ''}">
        <button
          type="button"
          in:scale={{ duration: 250, easing: quartInOut }}
          onclick={() => (showDetail = true)}
          class="absolute -inset-s-4 -top-4 flex size-10 place-content-center place-items-center rounded-full bg-primary p-5 text-xs text-light"
        >
          {$remainingUploads.toLocaleString($locale)}
        </button>
        {#if $stats.errors > 0}
          <button
            type="button"
            in:scale={{ duration: 250, easing: quartInOut }}
            onclick={() => (showDetail = true)}
            class="absolute -inset-e-4 -top-4 flex size-10 place-content-center place-items-center rounded-full bg-danger p-5 text-xs text-light"
          >
            {$stats.errors.toLocaleString($locale)}
          </button>
        {/if}
        <button
          type="button"
          in:scale={{ duration: 250, easing: quartInOut }}
          onclick={() => (showDetail = true)}
          class="flex size-16 place-content-center place-items-center rounded-full bg-subtle p-5 text-sm text-primary shadow-lg"
        >
          <div class="animate-pulse">
            <Icon icon={mdiCloudUploadOutline} size="30" />
          </div>
        </button>
      </div>
    {/if}
  </div>
{/if}
