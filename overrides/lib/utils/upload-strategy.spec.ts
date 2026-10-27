import { describe, expect, it } from 'vitest';
import {
  buildPickerAccept,
  cloneFileForUpload,
  getHashConcurrency,
  getUploadConcurrency,
  isPayloadTooLarge,
} from './upload-strategy';

describe('getUploadConcurrency', () => {
  it('desktop mạng nhanh: 3 stream', () => {
    expect(getUploadConcurrency('fast', false)).toBe(3);
  });

  it('mobile mạng nhanh: 2 stream', () => {
    expect(getUploadConcurrency('fast', true)).toBe(2);
  });

  it('mạng chậm hoặc save-data: tuần tự', () => {
    expect(getUploadConcurrency('slow', false)).toBe(1);
    expect(getUploadConcurrency('save-data', true)).toBe(1);
  });
});

describe('getHashConcurrency', () => {
  it('chừa 1 core cho UI, tối đa 2 worker', () => {
    expect(getHashConcurrency(8)).toBe(2);
    expect(getHashConcurrency(3)).toBe(2);
    expect(getHashConcurrency(2)).toBe(1);
    expect(getHashConcurrency(1)).toBe(1);
    expect(getHashConcurrency(undefined)).toBe(1);
  });
});

describe('buildPickerAccept', () => {
  it('desktop: chỉ danh sách đuôi file', () => {
    expect(buildPickerAccept(['.jpg', '.mp4'], false)).toBe('.jpg,.mp4');
  });

  it('mobile: image/*, video/*, HEIC/HEIF/MOV rồi tới đuôi file, không trùng', () => {
    expect(buildPickerAccept(['.jpg', '.heic', 'image/heic'], true)).toBe(
      'image/*,video/*,image/heic,image/heif,video/quicktime,.jpg,.heic',
    );
  });
});

describe('cloneFileForUpload', () => {
  it('giữ nguyên tên, MIME và lastModified', () => {
    const source = new File(['x'], 'IMG_1.HEIC', { type: 'image/heic', lastModified: 1_700_000_000_000 });
    const clone = cloneFileForUpload(source);
    expect(clone.name).toBe('IMG_1.HEIC');
    expect(clone.type).toBe('image/heic');
    expect(clone.lastModified).toBe(1_700_000_000_000);
    expect(clone.size).toBe(1);
  });
});

describe('isPayloadTooLarge', () => {
  it('nhận lỗi 413 qua statusCode (ApiError) hoặc status (HttpError)', () => {
    expect(isPayloadTooLarge({ statusCode: 413 })).toBe(true);
    expect(isPayloadTooLarge({ status: 413 })).toBe(true);
    expect(isPayloadTooLarge({ statusCode: 500 })).toBe(false);
    expect(isPayloadTooLarge(new Error('x'))).toBe(false);
    expect(isPayloadTooLarge(undefined)).toBe(false);
  });
});
