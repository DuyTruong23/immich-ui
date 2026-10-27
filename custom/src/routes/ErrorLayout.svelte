<script lang="ts">
  import MaintenancePage from '$custom/components/MaintenancePage.svelte';
  import { isStaleChunkError } from '$custom/utils/server-connection-error';
  import { reloadApp } from '$custom/hooks/app-reload';
  import type { Page } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  import { locale as i18nLocale, t } from 'svelte-i18n';

  interface Props {
    error?: Page['error'] | undefined;
  }

  let { error = undefined }: Props = $props();

  const showStaleChunkPage = $derived(isStaleChunkError(error));

  // Lỗi chunk cũ có thể xảy ra trước khi i18n nạp xong (chính file ngôn ngữ cũng là chunk) — giữ chuỗi gốc làm dự phòng
  const tr = (
    key: 'pg_stale_chunk_title' | 'pg_stale_chunk_description' | 'pg_stale_chunk_reload',
    fallback: string,
  ) => ($i18nLocale ? $t(key, { default: fallback }) : fallback);

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
      <h1 class="pg-maintenance__title">{tr('pg_stale_chunk_title', 'Đang tải bản mới')}</h1>
      <p class="pg-maintenance__description">
        {tr('pg_stale_chunk_description', 'Ứng dụng vừa được cập nhật. Trang sẽ tải lại — bạn không phải đăng nhập lại.')}
      </p>
      <button type="button" class="pg-stale-chunk-reload" onclick={() => reloadApp()}>
        {tr('pg_stale_chunk_reload', 'Tải lại')}
      </button>
    </div>
  </div>
{:else}
  <MaintenancePage />
{/if}

