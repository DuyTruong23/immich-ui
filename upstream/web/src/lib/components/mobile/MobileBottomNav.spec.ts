import { render } from '@testing-library/svelte';
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
