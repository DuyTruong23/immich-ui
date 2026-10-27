import { initAppConfig } from '@photo-gallery/config';
import { assetFactory } from '@test-data/factories/asset-factory';
import { render } from '@testing-library/svelte';
import PhotoBlurBackdrop from './PhotoBlurBackdrop.svelte';
import { beforeAll, describe, expect, it } from 'vitest';

describe('PhotoBlurBackdrop', () => {
  beforeAll(() => {
    initAppConfig({});
  });

  it('keeps the 48px blur layer for the current asset', () => {
    const { container } = render(PhotoBlurBackdrop, { props: { asset: assetFactory.build({ thumbhash: null }) } });

    expect(container.querySelector('[style*="blur(48px)"]')).not.toBeNull();
  });

  it('renders no blur layer and no image for swipe peeks', () => {
    const { container } = render(PhotoBlurBackdrop, {
      props: { asset: assetFactory.build({ thumbhash: null }), peek: true },
    });

    expect(container.querySelector('[style*="blur("]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
