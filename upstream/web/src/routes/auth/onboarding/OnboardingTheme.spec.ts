import { render, screen } from '@testing-library/svelte';
import OnboardingTheme from './OnboardingTheme.svelte';
import { describe, expect, it } from 'vitest';

describe('OnboardingTheme', () => {
  it('mỗi lựa chọn theme có aria-pressed và đúng một lựa chọn đang bật', () => {
    render(OnboardingTheme);

    const options = screen.getAllByRole('button');
    expect(options).toHaveLength(3);
    for (const option of options) {
      expect(option).toHaveAttribute('aria-pressed');
    }
    expect(options.filter((option) => option.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });
});
