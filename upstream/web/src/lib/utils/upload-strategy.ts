import type { NetworkQuality } from '$lib/utils/mobile-performance.svelte';

/**
 * Số file upload song song. Nhiều stream giúp lô file nhỏ (giới hạn bởi latency qua tunnel),
 * không tăng băng thông cho một file lớn. Mạng chậm / save-data: tuần tự.
 */
export const getUploadConcurrency = (quality: NetworkQuality, coarsePointer: boolean): number => {
  if (quality !== 'fast') {
    return 1;
  }
  return coarsePointer ? 2 : 3;
};

/** Băm SHA-1 trong Worker — chừa 1 core cho UI, tối đa 2 worker. */
export const getHashConcurrency = (hardwareConcurrency: number | undefined): number => {
  const cores = hardwareConcurrency && hardwareConcurrency > 0 ? hardwareConcurrency : 2;
  return Math.max(1, Math.min(2, cores - 1));
};

/**
 * Picker mobile: ngoài image/* + video/*, liệt kê rõ HEIC/HEIF/MOV.
 * [Unverified] Một số bản iOS chuyển HEIC→JPEG khi accept chỉ có image/*; liệt kê rõ MIME là vô hại.
 */
const MOBILE_ACCEPT = ['image/*', 'video/*', 'image/heic', 'image/heif', 'video/quicktime'];

export const buildPickerAccept = (extensions: string[], mobile: boolean): string => {
  const list = mobile ? [...MOBILE_ACCEPT, ...extensions] : [...extensions];
  return [...new Set(list)].join(',');
};

/** Bọc File giữ nguyên MIME type + lastModified để multipart part có đúng Content-Type. */
export const cloneFileForUpload = (file: File): File =>
  new File([file], file.name, { type: file.type, lastModified: file.lastModified });

/** HTTP 413 — proxy/tunnel hoặc server từ chối vì file quá lớn. */
export const isPayloadTooLarge = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { statusCode, status } = error as { statusCode?: unknown; status?: unknown };
  return statusCode === 413 || status === 413;
};
