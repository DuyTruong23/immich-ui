import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MobileBottomNav from './MobileBottomNav.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/photos') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$custom/utils/capabilities.svelte', () => ({
  can: () => true,
  isMobileShell: () => true,
  isMobileNavActive: (id: string) => id === 'library',
}));

// Setup dùng chung: các describe thêm sau chỉ cần gọi renderNav()
const renderNav = () => render(MobileBottomNav);

describe('MobileBottomNav', () => {
  it('mỗi mục có aria-label để vẫn có tên khi label bị ẩn ở landscape', () => {
    const { getByRole } = renderNav();

    expect(getByRole('link', { name: 'photos' })).toHaveAttribute('aria-label', 'photos');
    expect(getByRole('link', { name: 'search' })).toHaveAttribute('aria-label', 'search');
    expect(getByRole('link', { name: 'more' })).toHaveAttribute('aria-label', 'more');
    expect(getByRole('button', { name: 'favorites' })).toHaveAttribute('aria-label', 'favorites');
  });
});

describe('MobileBottomNav favorites popup', () => {
  it('là disclosure, không phải ARIA menu', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole, queryAllByRole } = renderNav();

    const trigger = getByRole('button', { name: 'favorites' });
    expect(trigger).not.toHaveAttribute('aria-haspopup');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'pg-mobile-favorites-menu');
    expect(document.querySelector('#pg-mobile-favorites-menu')).toBeInTheDocument();
    expect(queryByRole('menu')).not.toBeInTheDocument();
    expect(queryAllByRole('menuitem')).toHaveLength(0);
    expect(getByRole('button', { name: 'shared_favorites' })).toBeInTheDocument();
  });

  it('đóng bằng Escape và trả focus về nút mở', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderNav();

    const trigger = getByRole('button', { name: 'favorites' });
    await user.click(trigger);
    getByRole('button', { name: 'shared_favorites' }).focus();
    await user.keyboard('{Escape}');

    expect(document.querySelector('#pg-mobile-favorites-menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
