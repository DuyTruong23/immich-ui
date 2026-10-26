import { describe, expect, it } from 'vitest';
import type { ImageLoaderStatus } from '$lib/utils/adaptive-image-loader.svelte';
import { isImageBroken, shouldUpgradeToOriginal } from './image-quality';

const base = {
  network: 'fast' as const,
  preview: { width: 1440, height: 1080 },
  display: { width: 1440, height: 1080 },
  devicePixelRatio: 1,
  original: { width: 6000, height: 4500 },
};

describe('shouldUpgradeToOriginal', () => {
  it('không nâng khi mạng chậm hoặc save-data', () => {
    expect(shouldUpgradeToOriginal({ ...base, network: 'slow', devicePixelRatio: 2 })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, network: 'save-data', devicePixelRatio: 2 })).toBe(false);
  });

  it('không nâng khi preview đã phủ đủ vùng hiển thị (DPR 1)', () => {
    expect(shouldUpgradeToOriginal(base)).toBe(false);
  });

  it('nâng khi màn hình DPR 2 cần nhiều pixel hơn preview', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2 })).toBe(true);
  });

  it('không nâng khi preview chỉ thiếu trong ngưỡng 10%', () => {
    expect(shouldUpgradeToOriginal({ ...base, display: { width: 1560, height: 1170 } })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, display: { width: 1600, height: 1200 } })).toBe(true);
  });

  it('không nâng khi ảnh gốc không lớn hơn preview', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, original: { width: 1440, height: 1080 } })).toBe(
      false,
    );
  });

  it('nâng khi không biết kích thước gốc nhưng preview thiếu pixel', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, original: undefined })).toBe(true);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, original: { width: null, height: null } })).toBe(
      true,
    );
  });

  it('giới hạn DPR hiệu dụng ở 2: điện thoại DPR 3 không tải gốc khi preview đã đủ nét ở DPR 2', () => {
    expect(
      shouldUpgradeToOriginal({
        ...base,
        display: { width: 430, height: 573 },
        preview: { width: 1080, height: 1440 },
        original: { width: 3024, height: 4032 },
        devicePixelRatio: 3,
      }),
    ).toBe(false);
  });

  it('nâng trên laptop DPR 2 khi preview không đủ phủ vùng hiển thị', () => {
    expect(
      shouldUpgradeToOriginal({
        ...base,
        display: { width: 1200, height: 800 },
        preview: { width: 1440, height: 960 },
        original: { width: 6000, height: 4000 },
        devicePixelRatio: 2,
      }),
    ).toBe(true);
  });

  it('không nâng khi thiếu preview hoặc vùng hiển thị bằng 0', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, preview: undefined })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, preview: { width: 0, height: 0 } })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, display: { width: 0, height: 0 } })).toBe(false);
  });
});

describe('isImageBroken', () => {
  const status = (
    quality: Partial<ImageLoaderStatus['quality']>,
    hasError: boolean,
  ): Pick<ImageLoaderStatus, 'hasError' | 'quality'> => ({
    hasError,
    quality: { thumbnail: 'unloaded', preview: 'unloaded', original: 'unloaded', ...quality },
  });

  it('không báo lỗi khi preview đã hiện còn bản gốc tự nâng bị lỗi', () => {
    expect(isImageBroken(status({ thumbnail: 'success', preview: 'success', original: 'error' }, true))).toBe(false);
  });

  it('báo lỗi khi không có preview/gốc nào hiện được', () => {
    expect(isImageBroken(status({ thumbnail: 'success', preview: 'error', original: 'error' }, true))).toBe(true);
  });

  it('không báo lỗi khi bản gốc đã tải xong', () => {
    expect(isImageBroken(status({ thumbnail: 'error', preview: 'error', original: 'success' }, true))).toBe(false);
  });

  it('không báo lỗi khi loader không có lỗi', () => {
    expect(isImageBroken(status({ thumbnail: 'success', preview: 'success', original: 'success' }, false))).toBe(false);
    expect(isImageBroken(status({}, false))).toBe(false);
  });
});
