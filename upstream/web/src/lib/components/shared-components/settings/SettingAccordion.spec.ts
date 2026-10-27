import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SettingAccordion from './SettingAccordion.svelte';

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

describe('SettingAccordion auto-scroll', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('scrolls instantly when the user prefers reduced motion', async () => {
    stubReducedMotion(true);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(SettingAccordion, { props: { title: 'General', key: 'general-reduced', autoScrollTo: true } });

    await user.click(screen.getByRole('button', { name: /General/ }));
    vi.advanceTimersByTime(250);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('keeps smooth scrolling when motion is allowed', async () => {
    stubReducedMotion(false);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(SettingAccordion, { props: { title: 'General', key: 'general-motion', autoScrollTo: true } });

    await user.click(screen.getByRole('button', { name: /General/ }));
    vi.advanceTimersByTime(250);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
