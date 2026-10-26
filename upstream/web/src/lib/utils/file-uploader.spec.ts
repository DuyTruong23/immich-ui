import {
  AssetMediaStatus,
  AssetUploadAction,
  checkBulkUpload,
  type AssetMediaResponseDto,
  type UserAdminResponseDto,
} from '@immich/sdk';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { uploadManager } from '$lib/managers/upload-manager.svelte';
import { uploadAssetsStore } from '$lib/stores/upload';
import { UploadState } from '$lib/types';
import * as utils from '$lib/utils';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import {
  checkExecutionQueue,
  fileUploadHandler,
  hashExecutionQueue,
  isSupportedUploadFile,
  uploadExecutionQueue,
} from './file-uploader';

// Chỉ thay checkBulkUpload; phần còn lại của SDK giữ nguyên. Mặc định (không ai cấu hình) trả undefined,
// khớp hành vi cũ: trong vitest Worker băm không chạy được nên REST kiểm tra trùng không bao giờ được gọi.
vi.mock('@immich/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@immich/sdk')>();
  return { ...actual, checkBulkUpload: vi.fn() };
});

describe('fileUploader error handling', () => {
  const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
  const mockUserObject = { id: 'user-123', email: 'test@example.com' } as UserAdminResponseDto;
  const mockError = new Error('Upload failed');
  const mockUploadResponse = { id: 'mock-id', status: AssetMediaStatus.Created } as AssetMediaResponseDto;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(uploadManager, 'getExtensions').mockReturnValue(['.jpg']);
    uploadAssetsStore.reset();
    authManager.reset();
  });

  for (const [name, mockUser] of [
    ['logged-in users', true],
    ['anonymous users', false],
  ] as const) {
    describe(`for ${name}`, () => {
      beforeEach(() => {
        if (mockUser) {
          authManager.setUser(mockUserObject);
        }
      });

      it(`should transition successful uploads to done`, async () => {
        vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });

        await fileUploadHandler({ files: [mockFile] });

        const items = get(uploadAssetsStore);
        expect(items.length).toBe(1);
        expect(items[0].state).toBe(UploadState.DONE);
      });

      it('should capture errors', async () => {
        vi.spyOn(utils, 'uploadRequest').mockRejectedValue(mockError);

        await fileUploadHandler({ files: [mockFile] });

        const items = get(uploadAssetsStore);
        expect(items.length).toBe(1);
        expect(items[0].state).toBe(UploadState.ERROR);
      });
    });
  }

  it('should suppress errors on logout', async () => {
    authManager.setUser(mockUserObject);
    authManager.setPreferences(preferencesFactory.build());
    vi.spyOn(utils, 'uploadRequest').mockImplementationOnce(() => {
      authManager.reset();
      return Promise.reject(mockError);
    });

    await fileUploadHandler({ files: [mockFile] });

    const items = get(uploadAssetsStore);
    expect(items.length).toBe(1);
    expect(items[0].state).toBe(UploadState.STARTED);
  });

  it('should accept mobile HEIC by MIME when filename has no matching extension', async () => {
    vi.spyOn(uploadManager, 'getExtensions').mockReturnValue(['.jpg', '.heic', '.mp4', '.mov']);
    vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });
    const heic = new File(['heic'], 'IMG_1234', { type: 'image/heic' });

    await fileUploadHandler({ files: [heic] });

    const items = get(uploadAssetsStore);
    expect(items.length).toBe(1);
    expect(utils.uploadRequest).toHaveBeenCalled();
  });

  it('giữ nguyên MIME type của file khi gửi multipart', async () => {
    const spy = vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });

    await fileUploadHandler({ files: [mockFile] });

    const formData = spy.mock.calls[0][0].data as FormData;
    const sent = formData.get('assetData') as File;
    expect(sent.name).toBe('test.jpg');
    expect(sent.type).toBe('image/jpeg');
  });

  it('báo lỗi tệp quá lớn khi upload trả 413', async () => {
    const tooLarge = Object.assign(new Error('Payload Too Large'), { statusCode: 413 });
    vi.spyOn(utils, 'uploadRequest').mockRejectedValue(tooLarge);

    await fileUploadHandler({ files: [mockFile] });

    const items = get(uploadAssetsStore);
    expect(items[0].state).toBe(UploadState.ERROR);
    expect(String(items[0].error)).toContain('upload_file_too_large');
  });

  it('đưa file đã băm xong về trạng thái chờ cho tới khi có slot upload', async () => {
    const previousConcurrency = uploadExecutionQueue.concurrency;
    uploadExecutionQueue.concurrency = 1;

    const hashedIds = new Set<string>();
    const unsubscribe = uploadAssetsStore.subscribe((items) => {
      for (const item of items) {
        if (item.message === 'asset_hashing') {
          hashedIds.add(item.id);
        }
      }
    });

    try {
      const first = new File(['one'], 'first.jpg', { type: 'image/jpeg', lastModified: 1 });
      const second = new File(['two'], 'second.jpg', { type: 'image/jpeg', lastModified: 2 });
      let releaseFirst: () => void = () => {};
      const spy = vi
        .spyOn(utils, 'uploadRequest')
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              releaseFirst = () => resolve({ status: 200, data: mockUploadResponse });
            }),
        )
        .mockResolvedValue({ status: 200, data: { ...mockUploadResponse, id: 'mock-id-2' } });

      const done = fileUploadHandler({ files: [first, second] });

      // Upload đầu đang treo giữ slot duy nhất; file thứ hai đã băm xong và đang chờ slot.
      await vi.waitFor(() => {
        expect(spy).toHaveBeenCalledTimes(1);
        expect(hashedIds.has('web-second.jpg-2')).toBe(true);
      });

      const waiting = get(uploadAssetsStore).find((item) => item.file.name === 'second.jpg');
      expect(waiting?.state).toBe(UploadState.PENDING);
      expect(waiting?.message).not.toBe('asset_hashing');

      releaseFirst();
      await done;

      const items = get(uploadAssetsStore);
      expect(items.length).toBe(2);
      expect(items.map((item) => item.state)).toEqual([UploadState.DONE, UploadState.DONE]);
    } finally {
      unsubscribe();
      uploadExecutionQueue.concurrency = previousConcurrency;
    }
  });
});

/** Worker giả: trả SHA-1 cố định bất đồng bộ, đủ để đi qua giai đoạn băm trong happy-dom. */
class FakeHashWorker {
  private listeners: Array<(event: { data: { result: string } }) => void> = [];

  addEventListener(type: string, listener: (event: { data: { result: string } }) => void) {
    if (type === 'message') {
      this.listeners.push(listener);
    }
  }

  postMessage() {
    setTimeout(() => {
      for (const listener of this.listeners) {
        listener({ data: { result: 'abc' } });
      }
    }, 0);
  }

  terminate() {}
}

describe('fileUploader: kiểm tra trùng tách khỏi hàng đợi băm', () => {
  const mockUploadResponse = { id: 'mock-id', status: AssetMediaStatus.Created } as AssetMediaResponseDto;
  const accept = { results: [{ id: 'x', action: AssetUploadAction.Accept }] };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Worker', FakeHashWorker);
    vi.spyOn(uploadManager, 'getExtensions').mockReturnValue(['.jpg']);
    uploadAssetsStore.reset();
    authManager.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('giới hạn REST kiểm tra trùng ở 4 request song song', () => {
    expect(checkExecutionQueue.concurrency).toBe(4);
  });

  it('băm xong thì hỏi server từng file, không trùng thì upload và lên DONE', async () => {
    vi.mocked(checkBulkUpload).mockResolvedValue(accept);
    const upload = vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });
    const first = new File(['one'], 'first.jpg', { type: 'image/jpeg', lastModified: 1 });
    const second = new File(['two'], 'second.jpg', { type: 'image/jpeg', lastModified: 2 });

    await fileUploadHandler({ files: [first, second] });

    expect(checkBulkUpload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(2);
    const items = get(uploadAssetsStore);
    expect(items.map((item) => item.state)).toEqual([UploadState.DONE, UploadState.DONE]);
  });

  it('server báo trùng: DUPLICATED kèm assetId và không gọi upload', async () => {
    vi.mocked(checkBulkUpload).mockResolvedValue({
      results: [{ id: 'x', action: AssetUploadAction.Reject, assetId: 'dup-1', isTrashed: false }],
    });
    const upload = vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });

    await fileUploadHandler({ files: [new File(['dup'], 'dup.jpg', { type: 'image/jpeg', lastModified: 3 })] });

    const items = get(uploadAssetsStore);
    expect(items.length).toBe(1);
    expect(items[0].state).toBe(UploadState.DUPLICATED);
    expect(items[0].assetId).toBe('dup-1');
    expect(upload).not.toHaveBeenCalled();
  });

  it('REST kiểm tra trùng đang treo không giữ slot của hàng đợi băm', async () => {
    const previousHashConcurrency = hashExecutionQueue.concurrency;
    hashExecutionQueue.concurrency = 1;

    const pendingChecks: Array<() => void> = [];
    vi.mocked(checkBulkUpload).mockImplementation(
      () =>
        new Promise((resolve) => {
          pendingChecks.push(() => resolve(accept));
        }),
    );
    vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });

    try {
      const first = new File(['one'], 'first.jpg', { type: 'image/jpeg', lastModified: 4 });
      const second = new File(['two'], 'second.jpg', { type: 'image/jpeg', lastModified: 5 });
      const done = fileUploadHandler({ files: [first, second] });

      // Hàng đợi băm chỉ có 1 slot, nhưng cả hai file vẫn đi tới bước REST dù lần kiểm tra đầu chưa trả lời.
      await vi.waitFor(() => expect(checkBulkUpload).toHaveBeenCalledTimes(2));

      for (const release of pendingChecks) {
        release();
      }
      await done;

      const items = get(uploadAssetsStore);
      expect(items.map((item) => item.state)).toEqual([UploadState.DONE, UploadState.DONE]);
    } finally {
      hashExecutionQueue.concurrency = previousHashConcurrency;
    }
  });
});

describe('isSupportedUploadFile', () => {
  const extensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.mp4', '.mov'];

  it('accepts jpeg by filename', () => {
    expect(isSupportedUploadFile(new File(['x'], 'photo.JPG', { type: '' }), extensions)).toBe(true);
  });

  it('accepts heic by mime type', () => {
    expect(isSupportedUploadFile(new File(['x'], 'image', { type: 'image/heic' }), extensions)).toBe(true);
  });

  it('accepts mov by mime type', () => {
    expect(isSupportedUploadFile(new File(['x'], 'clip', { type: 'video/quicktime' }), extensions)).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(isSupportedUploadFile(new File(['x'], 'notes.txt', { type: 'text/plain' }), extensions)).toBe(false);
  });
});
