import { initAppConfig } from '@photo-gallery/config';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderWithTooltips } from '$tests/helpers';
import { init, register, waitLocale } from 'svelte-i18n';
import LoginPage from './+page.svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/managers/feature-flags-manager.svelte', () => ({
  featureFlagsManager: { value: { passwordLogin: true, oauth: false, oauthAutoLaunch: false } },
}));
vi.mock('$lib/managers/server-config-manager.svelte', () => ({
  serverConfigManager: { value: { loginPageMessage: '', isOnboarded: true, oauthButtonText: 'OAuth' } },
}));

const data = { meta: { title: 'Login' }, continueUrl: '/photos' };

describe('login page inputs', () => {
  beforeAll(async () => {
    initAppConfig({});
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  it('keeps anti-autofill markers but never starts read-only', () => {
    renderWithTooltips(LoginPage, { data } as never);

    const email = screen.getByRole('textbox', { name: 'Email' });
    const password = screen.getByRole('textbox', { name: 'Password' });

    expect(email).toHaveAttribute('autocomplete', 'nope');
    expect(email).toHaveAttribute('inputmode', 'email');
    expect(email).toHaveAttribute('enterkeyhint', 'next');
    expect(email).not.toHaveAttribute('readonly');
    expect(email.className).toContain('text-base');

    expect(password).toHaveAttribute('autocomplete', 'nope');
    expect(password).toHaveAttribute('enterkeyhint', 'go');
    expect(password).not.toHaveAttribute('readonly');
    expect(password.className).toContain('text-base');
  });

  it('moves to the password field when Enter is pressed on email with no password', async () => {
    const user = userEvent.setup();
    renderWithTooltips(LoginPage, { data } as never);

    const email = screen.getByRole('textbox', { name: 'Email' });
    await user.type(email, 'a@b.c{Enter}');

    expect(screen.getByRole('textbox', { name: 'Password' })).toHaveFocus();
  });
});
