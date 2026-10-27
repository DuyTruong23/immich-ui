<script lang="ts">
  import MaintenancePage from '$custom/components/MaintenancePage.svelte';
  import { isStaleChunkError } from '$custom/utils/server-connection-error';
  import { reloadApp } from '$custom/hooks/app-reload';
  import type { Page } from '@sveltejs/kit';
  import { onMount } from 'svelte';

  interface Props {
    error?: Page['error'] | undefined;
  }

  let { error = undefined }: Props = $props();

  const showStaleChunkPage = $derived(isStaleChunkError(error));

  onMount(() => {
    if (!showStaleChunkPage) {
      return;
    }

    const timer = setTimeout(() => {
      reloadApp();
    }, 250);

    return () => clearTimeout(timer);
  });
</script>

{#if showStaleChunkPage}
  <div class="pg-maintenance pg-maintenance--stale" role="status" aria-live="polite">
    <div class="pg-maintenance__content">
      <h1 class="pg-maintenance__title">Đang tải bản mới</h1>
      <p class="pg-maintenance__description">
        Ứng dụng vừa được cập nhật. Trang sẽ tải lại — bạn không phải đăng nhập lại.
      </p>
      <button type="button" class="pg-stale-chunk-reload" onclick={() => reloadApp()}>Tải lại</button>
    </div>
  </div>
{:else}
  <MaintenancePage />
{/if}

