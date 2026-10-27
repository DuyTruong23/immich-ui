import { describe, expect, it } from 'vitest';
import { getViewerPanelLayoutClass, isSwipeBackEnabled, type SwipeBackState } from './viewer-panel-layout';

const KINDS = ['detail', 'editor', 'activity'] as const;

describe('getViewerPanelLayoutClass', () => {
  it('desktop giữ cột cạnh media như upstream', () => {
    expect(getViewerPanelLayoutClass('detail', false)).toBe('row-span-4 row-start-1 w-90 dark:border-l');
    expect(getViewerPanelLayoutClass('editor', false)).toBe('row-span-4 row-start-1 w-100 dark:border-l');
    expect(getViewerPanelLayoutClass('activity', false)).toBe('row-span-5 row-start-1 w-90 md:w-115 dark:border-l');
  });

  it('mobile: overlay absolute z-40 (trên navbar overlay z-30), không còn là cột grid', () => {
    for (const kind of KINDS) {
      const classes = getViewerPanelLayoutClass(kind, true).split(' ');
      expect(classes).toEqual(
        expect.arrayContaining(['asset-viewer-sheet', 'absolute', 'z-40', 'inset-x-0', 'bottom-0', 'w-full']),
      );
      expect(classes).not.toContain('w-90');
      expect(classes).not.toContain('w-100');
      expect(classes.some((name) => name.startsWith('row-'))).toBe(false);
    }
  });

  it('phone: bottom sheet theo dvh; tablet cảm ứng (md): drawer cạnh cuối với bề rộng desktop', () => {
    const detail = getViewerPanelLayoutClass('detail', true).split(' ');
    const editor = getViewerPanelLayoutClass('editor', true).split(' ');
    const activity = getViewerPanelLayoutClass('activity', true).split(' ');

    expect(detail).toEqual(expect.arrayContaining(['max-h-[85dvh]', 'md:max-h-none', 'md:w-90', 'md:inset-e-0']));
    expect(editor).toEqual(expect.arrayContaining(['h-[50dvh]', 'md:h-auto', 'md:w-100']));
    expect(activity).toEqual(expect.arrayContaining(['h-[70dvh]', 'md:h-auto', 'md:w-115']));
  });

  it('mobile: nền đặc bg-light, không dark:border-l trên bottom sheet full-width', () => {
    for (const kind of KINDS) {
      const classes = getViewerPanelLayoutClass(kind, true).split(' ');
      expect(classes).toContain('bg-light');
      expect(classes).not.toContain('dark:border-l');
    }
  });

  it('desktop: dark:border-l ở nhánh desktop, không thêm nền', () => {
    for (const kind of KINDS) {
      const classes = getViewerPanelLayoutClass(kind, false).split(' ');
      expect(classes).toContain('dark:border-l');
      expect(classes).not.toContain('bg-light');
    }
  });
});

describe('isSwipeBackEnabled', () => {
  const idle: SwipeBackState = {
    isMobileViewer: true,
    slideshowIdle: true,
    isShowEditor: false,
    isFaceEditMode: false,
    isPanelOpen: false,
  };

  it('bật trên mobile viewer khi không có slideshow/editor/panel', () => {
    expect(isSwipeBackEnabled(idle)).toBe(true);
  });

  it('tắt trên desktop để không nuốt click mép trái', () => {
    expect(isSwipeBackEnabled({ ...idle, isMobileViewer: false })).toBe(false);
  });

  it('tắt khi slideshow đang chạy', () => {
    expect(isSwipeBackEnabled({ ...idle, slideshowIdle: false })).toBe(false);
  });

  it.each(['isShowEditor', 'isFaceEditMode', 'isPanelOpen'] as const)('tắt khi %s', (key) => {
    expect(isSwipeBackEnabled({ ...idle, [key]: true })).toBe(false);
  });
});
