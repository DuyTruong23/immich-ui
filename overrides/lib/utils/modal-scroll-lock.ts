type LockedSurface = {
  el: HTMLElement;
  scrollTop: number;
  overflow: string;
  touchAction: string;
  overscrollBehavior: string;
};

let lockCount = 0;
const lockedSurfaces: LockedSurface[] = [];
let touchMoveBlocker: ((event: TouchEvent) => void) | undefined;

const MAIN_SCROLL_SELECTOR = 'main > .overflow-y-auto';

const findScrollSurfaces = (): HTMLElement[] => {
  const surfaces: HTMLElement[] = [];
  const mainScroll = document.querySelector<HTMLElement>(MAIN_SCROLL_SELECTOR);
  if (mainScroll) {
    surfaces.push(mainScroll);
  }

  document.querySelectorAll<HTMLElement>('.pg-mobile-content').forEach((el) => {
    if (!surfaces.includes(el)) {
      surfaces.push(el);
    }
  });

  return surfaces;
};

const isInsideScrollableModal = (target: EventTarget | null) => {
  if (!(target instanceof Node)) {
    return false;
  }

  const scrollRoot = document.querySelector<HTMLElement>(
    '.ant-search-filter-modal__body, .pg-search-filter-modal__scroll',
  );
  return Boolean(scrollRoot?.contains(target));
};

export const lockModalBackgroundScroll = () => {
  if (typeof document === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    findScrollSurfaces().forEach((el) => {
      lockedSurfaces.push({
        el,
        scrollTop: el.scrollTop,
        overflow: el.style.overflow,
        touchAction: el.style.touchAction,
        overscrollBehavior: el.style.overscrollBehavior,
      });
      el.style.overflow = 'hidden';
      el.style.touchAction = 'none';
      el.style.overscrollBehavior = 'none';
    });

    touchMoveBlocker = (event: TouchEvent) => {
      if (isInsideScrollableModal(event.target)) {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener('touchmove', touchMoveBlocker, { passive: false });

    document.documentElement.dataset.modalScrollLock = 'true';
  }

  lockCount += 1;
};

export const unlockModalBackgroundScroll = () => {
  if (typeof document === 'undefined' || lockCount === 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount > 0) {
    return;
  }

  if (touchMoveBlocker) {
    document.removeEventListener('touchmove', touchMoveBlocker);
    touchMoveBlocker = undefined;
  }

  lockedSurfaces.forEach(({ el, scrollTop, overflow, touchAction, overscrollBehavior }) => {
    el.style.overflow = overflow;
    el.style.touchAction = touchAction;
    el.style.overscrollBehavior = overscrollBehavior;
    el.scrollTop = scrollTop;
  });
  lockedSurfaces.length = 0;

  delete document.documentElement.dataset.modalScrollLock;
};
