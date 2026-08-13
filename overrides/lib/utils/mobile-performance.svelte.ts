import { browser } from '$app/environment';

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

export const shouldPreloadAdjacentAssets = (): boolean => {
  return getNetworkQuality() === 'fast' && !prefersReducedMotion();
};

export const getTimelineIntersectionExpand = (): number => {
  const quality = getNetworkQuality();
  if (quality === 'save-data') {
    return 80;
  }

  if (quality === 'slow' || isNarrowViewport() || isCoarsePointer()) {
    return 250;
  }

  return 500;
};

export const getTimelineLayoutOptions = (): { rowHeight: number; headerHeight: number } => {
  const quality = getNetworkQuality();
  const compact = isNarrowViewport();

  if (quality === 'save-data' || quality === 'slow') {
    return compact
      ? { rowHeight: 80, headerHeight: 28 }
      : { rowHeight: 160, headerHeight: 40 };
  }

  return compact
    ? { rowHeight: 100, headerHeight: 32 }
    : { rowHeight: 235, headerHeight: 48 };
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
