import { fireEvent, render, screen } from '@testing-library/svelte';
import { isMobileShell } from '$custom/utils/capabilities.svelte';
import MobileThumbnailHint from '$lib/components/shared-components/MobileThumbnailHint.svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$custom/utils/capabilities.svelte', () => ({
  isMobileShell: vi.fn(() => false),
}));

describe('MobileThumbnailHint', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(isMobileShell).mockReturnValue(false);
  });

  it('shows the hint whenever the mobile shell is active, also with a mouse (768-849px)', () => {
    vi.mocked(isMobileShell).mockReturnValue(true);
    render(MobileThumbnailHint);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('stays hidden outside the mobile shell on a fine pointer', () => {
    render(MobileThumbnailHint);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps a 24px close glyph with a 44px touch target', () => {
    vi.mocked(isMobileShell).mockReturnValue(true);
    render(MobileThumbnailHint);
    const close = screen.getByRole('button', { name: 'close' });
    expect(close).toHaveClass('pg-touch-target', 'relative', 'size-6');
  });

  it('dismisses and remembers the choice for the session', async () => {
    vi.mocked(isMobileShell).mockReturnValue(true);
    render(MobileThumbnailHint);
    await fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(sessionStorage.getItem('immich-mobile-thumbnail-hint-dismissed')).toBe('1');
  });
});
