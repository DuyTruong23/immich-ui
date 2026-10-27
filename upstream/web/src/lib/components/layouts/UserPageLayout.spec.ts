import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import UserPageLayout from './UserPageLayout.svelte';

const shell = vi.hoisted(() => ({ mobile: true }));

vi.mock('$custom/utils/capabilities.svelte', () => ({
  can: () => true,
  isMobileShell: () => shell.mobile,
}));

const buttons = createRawSnippet(() => ({ render: () => '<span>toolbar-buttons</span>' }));
const sidebar = createRawSnippet(() => ({ render: () => '<aside>sidebar</aside>' }));

const getParts = (container: HTMLElement) => ({
  content: container.querySelector(':scope main > .overflow-y-auto'),
  toolbar: container.querySelector(':scope main > .absolute.flex'),
});

describe('UserPageLayout', () => {
  afterEach(() => {
    shell.mobile = true;
  });

  it('mobile shell: toolbar cao 3rem (h-12) và nội dung bắt đầu ở top-12', () => {
    const { container } = render(UserPageLayout, { hideNavbar: true, buttons });
    const { content, toolbar } = getParts(container);

    expect(content).toHaveClass('top-12', 'pg-mobile-content');
    expect(content).not.toHaveClass('top-16');
    expect(toolbar).toHaveClass('h-12', 'pg-mobile-toolbar');
    expect(toolbar).not.toHaveClass('h-16');
  });

  it('desktop giữ toolbar h-16 và nội dung top-16', () => {
    shell.mobile = false;
    const { container } = render(UserPageLayout, { hideNavbar: true, buttons, sidebar });
    const { content, toolbar } = getParts(container);

    expect(content).toHaveClass('top-16');
    expect(content).not.toHaveClass('pg-mobile-content');
    expect(toolbar).toHaveClass('h-16');
    expect(toolbar).not.toHaveClass('pg-mobile-toolbar');
  });
});
