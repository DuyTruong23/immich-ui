import { render, screen } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import { locale } from '$lib/stores/preferences.store';
import DateInput from './DateInput.svelte';
import DateTimeField from './DateTimeField.svelte';

describe('DateInput (Vietnamese text mode)', () => {
  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  beforeEach(() => {
    locale.set('vi');
  });

  afterEach(() => {
    locale.set('default');
  });

  it('uses a keyboard that can type "/" and ":" and a Done key', () => {
    render(DateInput, { props: { type: 'datetime-local', value: '', id: 'when' } });

    const input = document.querySelector('#when');
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('enterkeyhint', 'done');
  });

  it('keeps the calendar button in the tab order with a translated name', () => {
    render(DateInput, { props: { type: 'date', value: '' } });

    const picker = screen.getByRole('button', { name: 'Select date' });
    expect(picker).not.toHaveAttribute('tabindex');
  });

  it('passes aria-labelledby from DateTimeField to the text input', () => {
    render(DateTimeField, { props: { id: 'start', 'aria-labelledby': 'start-label' } });

    expect(document.querySelector('#start')).toHaveAttribute('aria-labelledby', 'start-label');
  });
});
