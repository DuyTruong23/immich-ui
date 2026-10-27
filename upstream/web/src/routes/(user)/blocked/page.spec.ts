import { render } from '@testing-library/svelte';
import BlockedPage from './+page.svelte';

describe('blocked page', () => {
  it('dùng min-h-dvh và màu theme thay cho h-screen/bg-white', () => {
    const { container } = render(BlockedPage);
    const root = container.firstElementChild;

    expect(root).toHaveClass('min-h-dvh', 'bg-(--md-sys-color-surface)', 'text-(--md-sys-color-on-surface)');
    expect(root).not.toHaveClass('h-screen');
    expect(root).not.toHaveClass('bg-white');
  });

  it('có lối thoát: link đăng xuất tới /auth/logout', () => {
    const { getByRole } = render(BlockedPage);

    expect(getByRole('link', { name: 'log_out' })).toHaveAttribute('href', '/auth/logout');
  });

  it('tiêu đề trang là heading', () => {
    const { getByRole } = render(BlockedPage);

    expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
