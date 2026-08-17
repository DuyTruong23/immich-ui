import { AssetMediaStatus, type AssetMediaResponseDto, type UserAdminResponseDto } from '@immich/sdk';
import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { uploadManager } from '$lib/managers/upload-manager.svelte';
import { uploadAssetsStore } from '$lib/stores/upload';
import { UploadState } from '$lib/types';
import * as utils from '$lib/utils';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { fileUploadHandler, isSupportedUploadFile } from './file-uploader';

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
