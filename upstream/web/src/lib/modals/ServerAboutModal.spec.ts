import { render, screen, waitFor } from '@testing-library/svelte';
import type { ServerAboutResponseDto, ServerVersionHistoryResponseDto } from '@immich/sdk';
import { init, register, waitLocale } from 'svelte-i18n';
import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
import ServerAboutModal from './ServerAboutModal.svelte';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const info = {
  version: 'v2.0.0',
  versionUrl: 'https://example.com/release',
  licensed: false,
  nodejs: 'v22.0.0',
  exiftool: '13.0',
  libvips: '8.16',
  imagemagick: '7.1',
  ffmpeg: '7.1',
} as ServerAboutResponseDto;

const versions = [
  { id: 'v2', createdAt: '2026-01-02T00:00:00.000Z', version: 'v2.0.0' },
  { id: 'v1', createdAt: '2025-12-01T00:00:00.000Z', version: 'v1.9.0' },
] as ServerVersionHistoryResponseDto[];

describe('ServerAboutModal', () => {
  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  beforeEach(() => {
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    Element.prototype.animate = getAnimateMock();
  });

  afterAll(async () => {
    await waitFor(() => {
      expect(document.body.style.pointerEvents).not.toBe('none');
    });
  });

  it('names the version history list and keeps ids unique', async () => {
    render(ServerAboutModal, { props: { onClose: vi.fn(), info, versions } });

    const list = await screen.findByRole('list', { name: 'Version History' });
    expect(list.querySelectorAll('li')).toHaveLength(2);
    expect(document.querySelectorAll('[id="version-history"]')).toHaveLength(0);
    expect(document.querySelectorAll('[id="version-history-label"]')).toHaveLength(1);
  });
});
