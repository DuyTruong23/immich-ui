import { browser } from '$app/environment';
import { gridDensityManager } from '$lib/stores/grid-density.svelte';

export type NetworkQuality = 'fast' | 'slow' | 'save-data';

type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
};

const getConnection = (): NetworkConnection | undefined => {
  if (!browser) {
    return;
  }

  return (navigator as Navigator & { connection?: NetworkConnection }).connection;
};

export const getNetworkQuality = (): NetworkQuality => {
  const connection = getConnection();
  if (connection?.saveData) {
    return 'save-data';
  }

  const type = connection?.effectiveType;
  if (type === 'slow-2g' || type === '2g' || type === '3g') {
    return 'slow';
  }

  return 'fast';
};

export const isCoarsePointer = (): boolean => {
  return browser && matchMedia('(pointer: coarse)').matches;
};

export const isNarrowViewport = (): boolean => {
  return browser && matchMedia('(max-width: 767px)').matches;
};

export const prefersReducedMotion = (): boolean => {
  return browser && matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const shouldPreferCompressedMedia = (): boolean => {
  const quality = getNetworkQuality();
  return quality !== 'fast' || isCoarsePointer();
};

export const shouldLazyLoadThumbnails = (): boolean => {
  return isCoarsePointer() || isNarrowViewport() || getNetworkQuality() !== 'fast';
};

export const shouldPlayVideoThumbnailOnHover = (): boolean => {
  return !isCoarsePointer() && getNetworkQuality() === 'fast';
};

/** GIF / motion preview on thumbnail hover — desktop + mạng nhanh only */
export const shouldLoadAnimatedPreview = (): boolean => shouldPlayVideoThumbnailOnHover();

/** Live Photo video overlay — tránh fetch playback URL trên mobile/mạng chậm */
export const shouldLoadLivePhotoPreview = (): boolean => shouldPlayVideoThumbnailOnHover();

export const shouldPreloadAdjacentAssets = (): boolean => {
  return getNetworkQuality() !== 'save-data' && !prefersReducedMotion();
};

export const getTimelineIntersectionExpand = (options?: { scrolling?: boolean }): number => {
  const quality = getNetworkQuality();
  const scrolling = options?.scrolling === true;
  const mobile = isNarrowViewport() || isCoarsePointer();

  // Scrub / jump-to-date: keep destination month + neighbors mounted so thumbs aren't torn down mid-flight.
  if (scrolling) {
    if (quality === 'save-data') {
      return mobile ? 400 : 600;
    }
    return mobile ? 900 : 1200;
  }

  if (quality === 'save-data') {
    return mobile ? 80 : 120;
  }

  if (quality === 'slow') {
    return mobile ? 180 : 240;
  }

  if (mobile) {
    return 400;
  }

  return 500;
};

/** Giới hạn thumbnail cache trong service worker theo chất lượng mạng */
export const getServiceWorkerThumbnailCacheLimit = (): number => {
  const quality = getNetworkQuality();
  if (quality === 'save-data') {
    return 80;
  }

  if (quality === 'slow') {
    return 180;
  }

  if (isCoarsePointer() || isNarrowViewport()) {
    return 280;
  }

  return 400;
};

export const getTimelineLayoutOptions = (viewportWidth = 0): { rowHeight: number; headerHeight: number } => {
  const quality = getNetworkQuality();
  const compact = isNarrowViewport() || isCoarsePointer();

  if (compact) {
    const width = viewportWidth || (browser ? window.innerWidth : 390);
    const columns = gridDensityManager.columns;
    const gap = 2;
    const rowHeight = Math.max(48, Math.round((width - gap * (columns - 1)) / columns));
    return { rowHeight, headerHeight: quality === 'save-data' ? 24 : 32 };
  }

  if (quality === 'save-data') {
    return { rowHeight: 140, headerHeight: 36 };
  }

  if (quality === 'slow') {
    return { rowHeight: 160, headerHeight: 40 };
  }

  return { rowHeight: 235, headerHeight: 48 };
};

/** Tắt CSS transition timeline trên mobile để giảm jank khi scroll */
export const shouldUseTimelineTransitions = (): boolean => {
  return !isCoarsePointer() && !prefersReducedMotion() && getNetworkQuality() === 'fast';
};

export const motionDuration = (durationMs: number): number => {
  return prefersReducedMotion() ? 0 : durationMs;
};

class NetworkManager {
  quality = $state<NetworkQuality>(getNetworkQuality());

  constructor() {
    if (!browser) {
      return;
    }

    this.quality = getNetworkQuality();
    getConnection()?.addEventListener?.('change', () => {
      this.quality = getNetworkQuality();
    });
  }
}

export const networkManager = new NetworkManager();
