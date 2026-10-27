import { UserAvatarColor } from '@immich/sdk';
import { fireEvent, render, screen } from '@testing-library/svelte';
import LikedByStack from './LikedByStack.svelte';
import { describe, expect, it } from 'vitest';

const users = [
  {
    id: 'u1',
    name: 'An',
    email: 'an@example.com',
    profileImagePath: '',
    profileChangedAt: '2026-01-01T00:00:00.000Z',
    avatarColor: UserAvatarColor.Primary,
  },
  {
    id: 'u2',
    name: 'Binh',
    email: 'binh@example.com',
    profileImagePath: '',
    profileChangedAt: '2026-01-01T00:00:00.000Z',
    avatarColor: UserAvatarColor.Pink,
  },
];

describe('LikedByStack', () => {
  it('exposes who liked the asset as an accessible, tappable button', () => {
    render(LikedByStack, { users });
    const button = screen.getByRole('button', { name: 'shared_favorites_liked_by' });
    expect(button).toHaveClass('pg-touch-target', 'relative');
    expect(button).not.toHaveAttribute('aria-expanded');
  });

  it('reveals the names on tap and hides them on Escape', async () => {
    render(LikedByStack, { users });
    const button = screen.getByRole('button', { name: 'shared_favorites_liked_by' });
    await fireEvent.click(button);
    expect(screen.getByTestId('liked-by-caption')).toBeInTheDocument();
    expect(screen.getByTestId('liked-by-caption')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'shared_favorites_liked_by' })).toBe(button);
    await fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByTestId('liked-by-caption')).toBeNull();
  });

  it('renders nothing without users', () => {
    render(LikedByStack, { users: [] });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
