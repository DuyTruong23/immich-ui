import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
import { timelineAssetFactory } from '@test-data/factories/asset-factory';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const media = vi.hoisted(() => {
  const state = { coarse: false };
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    enumerable: true,
    value: vi.fn().mockImplementation(function (query: string) {
      return {
        get matches() {
          return state.coarse && query.includes('coarse');
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
  return state;
});

vi.mock('$lib/utils/navigation', () => ({
  currentUrlReplaceAssetId: vi.fn(),
  isSharedLinkRoute: vi.fn().mockReturnValue(false),
}));

const buildAsset = () => timelineAssetFactory.build({ livePhotoVideoId: null, isVideo: false, isImage: true });

describe('Thumbnail touch and keyboard affordances', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
  });

  beforeEach(() => {
    media.coarse = false;
  });

  it('shows a 44px select checkbox on touch while selection mode is active', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), selectionMode: true, onSelect: vi.fn() });
    const checkbox = screen.getByRole('checkbox', { name: 'select' });
    expect(checkbox).toHaveClass('pointer-coarse:p-2.5');
    expect(checkbox).toHaveAttribute('tabindex', '-1');
  });

  it('hides the select checkbox on touch outside selection mode', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), onSelect: vi.fn() });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('never shows the select checkbox for readonly thumbnails', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), readonly: true, selectionMode: true });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows the preview button on touch when preview is available', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), selectionMode: true, onPreview: vi.fn() });
    const preview = screen.getByRole('button', { name: 'preview' });
    expect(preview).toHaveClass('pg-touch-target');
    expect(preview).toHaveAttribute('tabindex', '-1');
  });

  it('reveals the select checkbox when the thumbnail gets keyboard focus', async () => {
    const { baseElement } = render(Thumbnail, { asset: buildAsset(), onSelect: vi.fn() });
    expect(screen.queryByRole('checkbox')).toBeNull();
    const container = baseElement.querySelector<HTMLElement>('[data-thumbnail-focus-container]')!;
    container.focus();
    await tick();
    expect(screen.getByRole('checkbox', { name: 'select' })).toBeInTheDocument();
  });

  it('hides the controls when focus moves into a child button and then leaves the thumbnail', async () => {
    const { baseElement } = render(Thumbnail, { asset: buildAsset(), onSelect: vi.fn() });
    const container = baseElement.querySelector<HTMLElement>('[data-thumbnail-focus-container]')!;
    container.focus();
    await tick();
    const checkbox = screen.getByRole('checkbox', { name: 'select' });

    checkbox.focus();
    await tick();
    expect(screen.getByRole('checkbox', { name: 'select' })).toBeInTheDocument();

    checkbox.blur();
    await tick();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
