import { describe, expect, it } from 'vitest';
import { shouldUpgradeToOriginal } from './image-quality';

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

  it('không nâng khi thiếu preview hoặc vùng hiển thị bằng 0', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, preview: undefined })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, preview: { width: 0, height: 0 } })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, display: { width: 0, height: 0 } })).toBe(false);
  });
});
