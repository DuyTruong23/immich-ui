import { authManager } from '$lib/managers/auth-manager.svelte';
import { eventManager } from '$lib/managers/event-manager.svelte';
import { waitForWebsocketEvent } from '$lib/stores/websocket';
import { getAssetInfo, type AssetResponseDto } from '@immich/sdk';
import { toastManager } from '@immich/ui';
import { get } from 'svelte/store';
import { locale, t } from 'svelte-i18n';

const WS_REFRESH_TIMEOUT_MS = 4000;

const WRITEBACK_POLL_MS = 2000;
const WRITEBACK_POLL_MAX_ATTEMPTS = 90;

type WritebackStatusResponse = {
  status: 'idle' | 'pending' | 'done' | 'failed';
  pendingCount?: number;
  failedCount?: number;
  doneCount?: number;
};

function isVietnamese(): boolean {
  return (get(locale) ?? '').toLowerCase().startsWith('vi');
}

function messageWritingOriginals(count: number): string {
  if (isVietnamese()) {
    return count === 1
      ? 'Ngày trên thư viện đã cập nhật. Đang ghi vào file gốc…'
      : `Ngày trên thư viện đã cập nhật. Đang ghi vào ${count} file gốc…`;
  }
  return count === 1
    ? 'Library date updated. Writing original file…'
    : `Library date updated. Writing ${count} original files…`;
}

function messageOriginalsDone(count: number): string {
  if (isVietnamese()) {
    return count === 1 ? 'Đã ghi xong metadata vào file gốc.' : `Đã ghi xong metadata vào ${count} file gốc.`;
  }
  return count === 1
    ? 'Finished writing original file metadata.'
    : `Finished writing original file metadata (${count}).`;
}

function messageOriginalsFailed(failedCount: number): string {
  if (isVietnamese()) {
    return `Không ghi được metadata vào ${failedCount} file gốc.`;
  }
  return `Failed to write original file metadata for ${failedCount} file(s).`;
}

/** Toast after Immich DB date update succeeded. */
export function notifyDateUpdated(count: number): void {
  toastManager.primary(get(t)('edit_date_and_time_action_prompt', { values: { count } }));
}

/**
 * Refresh timeline + selection after bulk date change (replaces page reload).
 * Fetches updated assets, emits AssetUpdate, and falls back to websocket events.
 */
export async function refreshAssetsAfterDateUpdate(assetIds: string[]): Promise<AssetResponseDto[]> {
  if (assetIds.length === 0) {
    return [];
  }

  const refreshed = new Map<string, AssetResponseDto>();
  const results = await Promise.allSettled(
    assetIds.map((id) => getAssetInfo({ ...authManager.params, id })),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      refreshed.set(result.value.id, result.value);
      eventManager.emit('AssetUpdate', result.value);
    }
  }

  const pendingIds = assetIds.filter((id) => !refreshed.has(id));
  await Promise.all(
    pendingIds.map(async (id) => {
      try {
        const [asset] = await waitForWebsocketEvent('on_asset_update', (candidate) => candidate.id === id, WS_REFRESH_TIMEOUT_MS);
        refreshed.set(asset.id, asset);
        eventManager.emit('AssetUpdate', asset);
      } catch {
        // Best-effort; writeback may still finish in the background.
      }
    }),
  );

  const assets = assetIds.map((id) => refreshed.get(id)).filter((asset): asset is AssetResponseDto => !!asset);

  if (assetIds.length > 0) {
    eventManager.emit('AssetsDateUpdated', { assetIds });
  }

  return assets;
}

/**
 * Poll writeback proxy for original-file write progress (fire-and-forget after WRITEBACK_WAIT_MS).
 * Safe no-op if the endpoint is unavailable.
 */
export async function followOriginalFileWriteback(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0 || typeof fetch === 'undefined') {
    return;
  }

  let announcedPending = false;

  for (let attempt = 0; attempt < WRITEBACK_POLL_MAX_ATTEMPTS; attempt++) {
    let data: WritebackStatusResponse;
    try {
      const response = await fetch(`/api/writeback-status?ids=${encodeURIComponent(assetIds.join(','))}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        return;
      }
      data = (await response.json()) as WritebackStatusResponse;
    } catch {
      return;
    }

    if (data.status === 'pending') {
      if (!announcedPending) {
        announcedPending = true;
        toastManager.info(messageWritingOriginals(data.pendingCount ?? assetIds.length));
      }
      await sleep(WRITEBACK_POLL_MS);
      continue;
    }

    if (data.status === 'failed') {
      toastManager.danger(messageOriginalsFailed(data.failedCount ?? 1));
      return;
    }

    if (data.status === 'done' && announcedPending) {
      toastManager.success(messageOriginalsDone(data.doneCount ?? assetIds.length));
    }
    return;
  }

  if (announcedPending) {
    toastManager.warning(
      isVietnamese()
        ? 'Ghi file gốc vẫn đang chạy nền. Kiểm tra lại sau nếu ngày trên file chưa đổi.'
        : 'Original file write is still running in the background. Check again later if file dates look unchanged.',
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
