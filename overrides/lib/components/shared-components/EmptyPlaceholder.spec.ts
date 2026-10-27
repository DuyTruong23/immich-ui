import { render } from '@testing-library/svelte';
import EmptyPlaceholder from './EmptyPlaceholder.svelte';

describe('EmptyPlaceholder', () => {
  it('reserves the 3:2 image box before the SVG loads', () => {
    const { container } = render(EmptyPlaceholder, { props: { text: 'Nothing here' } });

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('width', '500');
    expect(img).toHaveAttribute('height', '333');
    expect(img).toHaveClass('h-auto');
  });
});
