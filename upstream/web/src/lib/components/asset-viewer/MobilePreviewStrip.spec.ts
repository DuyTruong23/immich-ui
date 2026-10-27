import { render } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import MobilePreviewStrip from './MobilePreviewStrip.svelte';

const stubReducedMotion = (reduce: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

const assets = [
  { id: 'a', thumbhash: null, originalFileName: 'a.jpg' },
  { id: 'b', thumbhash: null, originalFileName: 'b.jpg' },
];

describe('MobilePreviewStrip', () => {
  const scrollIntoView = vi.fn();

  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('centres the current thumb without smooth scrolling under reduced motion', async () => {
    stubReducedMotion(true);
    render(MobilePreviewStrip, { props: { assets, currentId: 'b', onSelect: vi.fn() } });

    await vi.waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'center', block: 'nearest', behavior: 'auto' }),
    );
  });
});
