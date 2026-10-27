import TimelineDaySelectToggle from '$lib/components/timeline/TimelineDaySelectToggle.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('TimelineDaySelectToggle', () => {
  it('is a real button with an accessible name and pressed state', () => {
    render(TimelineDaySelectToggle, { selected: true, visible: true, label: 'Select day 1', onSelect: vi.fn() });
    const button = screen.getByRole('button', { name: 'Select day 1' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('stays focusable but collapsed when not visible', () => {
    render(TimelineDaySelectToggle, { selected: false, visible: false, label: 'Select day 2', onSelect: vi.fn() });
    const button = screen.getByRole('button', { name: 'Select day 2' });
    expect(button).toHaveClass('w-0', 'focus-visible:w-8');
    expect(button).not.toHaveAttribute('tabindex');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('expands to 32px (44px on touch) when visible', () => {
    render(TimelineDaySelectToggle, { selected: false, visible: true, label: 'Select day 3', onSelect: vi.fn() });
    expect(screen.getByRole('button', { name: 'Select day 3' })).toHaveClass('w-8', 'pointer-coarse:w-11');
  });

  it('calls onSelect when activated', async () => {
    const onSelect = vi.fn();
    render(TimelineDaySelectToggle, { selected: false, visible: true, label: 'Select day 4', onSelect });
    await fireEvent.click(screen.getByRole('button', { name: 'Select day 4' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
