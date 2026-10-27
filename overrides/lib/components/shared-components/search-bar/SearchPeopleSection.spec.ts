import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { initAppConfig } from '@photo-gallery/config';
import { personFactory } from '@test-data/factories/person-factory';
import { init, register, waitLocale } from 'svelte-i18n';
import type { Component } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import TestWrapper from '$lib/components/TestWrapper.svelte';
import { getResizeObserverMock } from '$lib/__mocks__/resize-observer.mock';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import SearchPeopleSection from './SearchPeopleSection.svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SearchPeopleSection', () => {
  beforeAll(async () => {
    initAppConfig({});
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', getResizeObserverMock());
  });

  it('exposes the selected state of a person tile', async () => {
    const user = userEvent.setup();
    const person = personFactory.build({ name: 'Ada Lovelace' });
    sdkMock.getAllPeople.mockResolvedValue({ people: [person], total: 1, hidden: 0 });

    render(TestWrapper, {
      props: { component: SearchPeopleSection as unknown as Component<Record<string, unknown>>, componentProps: { selectedPeople: new SvelteSet<string>() } },
    });

    const tile = await screen.findByRole('button', { name: 'Ada Lovelace' });
    expect(tile).toHaveAttribute('aria-pressed', 'false');

    await user.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'true');
  });
});
