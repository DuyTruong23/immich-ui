import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { goto } from '$app/navigation';
import TestWrapper from '$lib/components/TestWrapper.svelte';
import { albumFactory } from '@test-data/factories/album-factory';
import type { AlbumResponseDto } from '@immich/sdk';
import type { Component } from 'svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import AlbumsTableRow from './AlbumsTableRow.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const renderRow = (album: AlbumResponseDto, onShowContextMenu = vi.fn()) => {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.append(tbody);
  document.body.append(table);
  render(TestWrapper, {
    target: tbody,
    props: { component: AlbumsTableRow as unknown as Component<Record<string, unknown>>, componentProps: { album, onShowContextMenu } },
  });
  return onShowContextMenu;
};

describe('AlbumsTableRow', () => {
  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  afterEach(() => {
    vi.mocked(goto).mockClear();
    document.body.replaceChildren();
  });

  it('exposes the album name as a focusable link to the album', () => {
    const album = albumFactory.build({ shared: false });
    renderRow(album);

    const link = screen.getByRole('link', { name: album.albumName });
    expect(link).toHaveAttribute('href', `/albums/${album.id}`);
  });

  it('opens the context menu from a visible options button without navigating', async () => {
    const user = userEvent.setup();
    const album = albumFactory.build({ shared: false });
    const onShowContextMenu = renderRow(album);

    await user.click(screen.getByRole('button', { name: 'Show album options' }));

    expect(onShowContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      album,
    );
    expect(goto).not.toHaveBeenCalled();
  });

  it('navigates when the row itself is clicked but leaves link clicks to the router', async () => {
    const user = userEvent.setup();
    const album = albumFactory.build({ shared: false });
    renderRow(album);

    await user.click(screen.getByText(`${album.assetCount} items`, { exact: false }));
    expect(goto).toHaveBeenCalledWith(`/albums/${album.id}`);

    vi.mocked(goto).mockClear();
    await user.click(screen.getByRole('link', { name: album.albumName }));
    expect(goto).not.toHaveBeenCalled();
  });
});
