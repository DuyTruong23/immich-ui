import type { NetworkQuality } from '$lib/utils/mobile-performance.svelte';

export type PixelSize = { width: number; height: number };

export type UpgradeToOriginalInput = {
  network: NetworkQuality;
  /** naturalWidth/naturalHeight của ảnh preview đã tải; undefined khi chưa có. */
  preview: PixelSize | undefined;
  /** Vùng hiển thị ảnh sau khi fit (CSS px). */
  display: PixelSize;
  devicePixelRatio: number;
  /** Kích thước ảnh gốc theo metadata asset, nếu biết. */
  original?: { width?: number | null; height?: number | null };
};

/** Preview thiếu dưới 10% pixel so với màn hình thì coi là đủ nét — không tải gốc. */
const UPGRADE_SLACK = 1.1;

/**
 * Chỉ tải ảnh gốc khi nó thực sự nét hơn preview trên màn hình này:
 * mạng nhanh, preview nhỏ hơn vùng hiển thị × DPR (quá ngưỡng 10%), và ảnh gốc lớn hơn preview.
 */
export const shouldUpgradeToOriginal = ({
  network,
  preview,
  display,
  devicePixelRatio,
  original,
}: UpgradeToOriginalInput): boolean => {
  if (network !== 'fast') {
    return false;
  }

  if (!preview || preview.width <= 0 || preview.height <= 0) {
    return false;
  }

  if (display.width <= 0 || display.height <= 0) {
    return false;
  }

  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const neededWidth = display.width * dpr;
  const neededHeight = display.height * dpr;
  const previewSharpEnough =
    preview.width * UPGRADE_SLACK >= neededWidth && preview.height * UPGRADE_SLACK >= neededHeight;
  if (previewSharpEnough) {
    return false;
  }

  const originalWidth = original?.width ?? 0;
  const originalHeight = original?.height ?? 0;
  const originalKnownAndNotLarger =
    originalWidth > 0 && originalHeight > 0 && originalWidth <= preview.width && originalHeight <= preview.height;

  return !originalKnownAndNotLarger;
};
