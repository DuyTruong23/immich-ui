let lockCount = 0;
let lockedScrollY = 0;

const clearInlineLock = (body: HTMLElement, root: HTMLElement) => {
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  root.style.overflow = '';
};

export const lockViewerPageScroll = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const { body, documentElement } = document;
  if (lockCount === 0) {
    lockedScrollY = window.scrollY;
    body.classList.add('asset-viewer-open');
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    documentElement.style.overflow = 'hidden';
  }

  lockCount += 1;
};

export const unlockViewerPageScroll = () => {
  if (typeof document === 'undefined' || lockCount === 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount > 0) {
    return;
  }

  const { body, documentElement } = document;
  body.classList.remove('asset-viewer-open');
  clearInlineLock(body, documentElement);
  window.scrollTo(0, lockedScrollY);
};

/** Reset scroll lock when viewer closes — tránh lockCount lệch sau dismiss / video. */
export const resetViewerPageScrollLock = () => {
  if (typeof document === 'undefined') {
    return;
  }

  lockCount = 0;
  const { body, documentElement } = document;
  body.classList.remove('asset-viewer-open');
  clearInlineLock(body, documentElement);
  window.scrollTo(0, lockedScrollY);
};
