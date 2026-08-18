import { describe, expect, it } from 'vitest';
import { buildPreviewStrip, containFitFrame, PREVIEW_STRIP_MAX_ITEMS, windowPreviewStrip } from './preview-layout';

const item = (id: string) => ({ id, thumbhash: null });

describe('containFitFrame', () => {
  it('letterboxes a landscape photo in a portrait viewer like AdaptiveImage', () => {
    expect(containFitFrame({ width: 4000, height: 2000 }, { width: 400, height: 800 })).toEqual({
      width: 400,
      height: 200,
      left: 0,
      top: 300,
    });
  });

  it('letterboxes a portrait photo in a landscape viewer', () => {
    expect(containFitFrame({ width: 1000, height: 2000 }, { width: 800, height: 400 })).toEqual({
      width: 200,
      height: 400,
      left: 300,
      top: 0,
    });
  });

  it('returns null when media or container size is missing', () => {
    expect(containFitFrame({ width: 0, height: 100 }, { width: 400, height: 800 })).toBeNull();
    expect(containFitFrame({ width: 100, height: 100 }, { width: 0, height: 800 })).toBeNull();
  });
});

describe('buildPreviewStrip', () => {
  it('places swipe previous immediately left and next immediately right', () => {
    const strip = buildPreviewStrip({
      current: item('c'),
      previous: item('p'),
      next: item('n'),
      laterItems: [item('p2'), item('p3')],
      earlierItems: [item('n2'), item('n3')],
    });

    expect(strip.map((entry) => entry.id)).toEqual(['p2', 'p', 'c', 'n', 'n2']);
  });

  it('caps the strip at five items around the current asset', () => {
    const strip = buildPreviewStrip({
      current: item('3'),
      previous: item('2'),
      next: item('4'),
      laterItems: [item('2'), item('1'), item('0')],
      earlierItems: [item('4'), item('5'), item('6')],
    });

    expect(strip.map((entry) => entry.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(strip).toHaveLength(PREVIEW_STRIP_MAX_ITEMS);
  });

  it('keeps fewer than five items at the start and end of the list', () => {
    expect(
      buildPreviewStrip({
        current: item('1'),
        next: item('2'),
        earlierItems: [item('2'), item('3')],
      }).map((entry) => entry.id),
    ).toEqual(['1', '2', '3']);

    expect(
      buildPreviewStrip({
        current: item('10'),
        previous: item('9'),
        laterItems: [item('9'), item('8')],
      }).map((entry) => entry.id),
    ).toEqual(['8', '9', '10']);
  });

  it('returns a single item when the gallery has one asset', () => {
    expect(buildPreviewStrip({ current: item('1') }).map((entry) => entry.id)).toEqual(['1']);
  });

  it('forces previous/next beside current when the iterator order is stale', () => {
    const strip = buildPreviewStrip({
      current: item('c'),
      previous: item('real-prev'),
      next: item('real-next'),
      laterItems: [item('stale-left'), item('real-prev')],
      earlierItems: [item('stale-right'), item('real-next')],
    });

    const currentIndex = strip.findIndex((entry) => entry.id === 'c');
    expect(strip[currentIndex - 1]?.id).toBe('real-prev');
    expect(strip[currentIndex + 1]?.id).toBe('real-next');
    expect(strip.map((entry) => entry.id)).toEqual(['stale-left', 'real-prev', 'c', 'real-next', 'stale-right']);
  });

  it('dedupes current from the side lists', () => {
    const strip = buildPreviewStrip({
      current: item('c'),
      laterItems: [item('c'), item('p')],
      earlierItems: [item('c'), item('n')],
    });

    expect(strip.map((entry) => entry.id)).toEqual(['p', 'c', 'n']);
  });
});

describe('windowPreviewStrip', () => {
  const assets = ['1', '2', '3', '4', '5', '6', '7'].map(item);

  it('windows the middle of a long list to five items', () => {
    expect(windowPreviewStrip(assets, '4').map((entry) => entry.id)).toEqual(['2', '3', '4', '5', '6']);
  });

  it('does not pad the start or end to five items', () => {
    expect(windowPreviewStrip(assets, '1').map((entry) => entry.id)).toEqual(['1', '2', '3']);
    expect(windowPreviewStrip(assets, '7').map((entry) => entry.id)).toEqual(['5', '6', '7']);
  });
});
