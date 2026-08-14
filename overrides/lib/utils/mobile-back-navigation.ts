import { goto } from '$app/navigation';
import type { BeforeNavigate } from '@sveltejs/kit';
import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
import { navigate } from '$lib/utils/navigation';

const hasAssetId = (target?: { params?: Record<string, string> | null } | null) => Boolean(target?.params?.assetId);

export const VIEWER_NAV_OPTIONS = {
  replaceState: true,
  noScroll: true,
  keepFocus: true,
} as const;

export const rememberViewerScrollTarget = (): string | undefined => {
  const assetId = assetViewerManager.asset?.id;
  if (assetId) {
    assetViewerManager.gridScrollTarget = { at: assetId };
  }
  return assetId;
};

/** Đóng viewer giống nút mũi tên — SPA goto, không reload trang đang ở. */
export const closeAssetViewerLikeBackArrow = async (): Promise<void> => {
  const assetId = rememberViewerScrollTarget();
  if (!assetId) {
    assetViewerManager.showAssetViewer(false);
    return;
  }

  await navigate(
    {
      targetRoute: 'current',
      assetId: null,
      assetGridRouteSearchParams: { at: assetId },
    },
    VIEWER_NAV_OPTIONS,
  );
};

const clientGoto = (href: string) =>
  goto(href, { replaceState: true, noScroll: true, keepFocus: true, invalidateAll: false });

/**
 * Vuốt back / nút back hệ thống: giữ client router, đóng viewer như mũi tên.
 * Gọi từ `beforeNavigate` trong component (SvelteKit yêu cầu init-time).
 */
export const handleMobileBackNavigation = (nav: BeforeNavigate): void => {
  const fromViewer = hasAssetId(nav.from);
  const toViewer = hasAssetId(nav.to);
  const overlayViewer = assetViewerManager.isViewing && !fromViewer;

  if (nav.type === 'popstate' && overlayViewer) {
    nav.cancel();
    assetViewerManager.showAssetViewer(false);
    return;
  }

  if (nav.type === 'popstate' && fromViewer && !toViewer) {
    nav.cancel();
    void closeAssetViewerLikeBackArrow();
    return;
  }

  if (nav.type === 'popstate' && nav.willUnload && nav.to) {
    nav.cancel();
    void clientGoto(nav.to.url.href);
  }
};
