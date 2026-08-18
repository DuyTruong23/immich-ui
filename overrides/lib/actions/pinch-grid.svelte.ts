import { gridDensityManager } from '$lib/stores/grid-density.svelte';
import { isCoarsePointer, isNarrowViewport } from '$lib/utils/mobile-performance.svelte';

const STEP_SCALE = 0.22;

const isAssetViewerOpen = () => Boolean(document.getElementById('immich-asset-viewer'));

const touchDistance = (event: TouchEvent) => {
  const first = event.touches[0];
  const second = event.touches[1];
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

/** Pinch 2 ngón trên mobile: chum lại = nhiều ảnh hơn, xoè ra = ít ảnh hơn (3–6). */
export const pinchGrid = (node: HTMLElement) => {
  if (!isCoarsePointer() && !isNarrowViewport()) {
    return {};
  }

  let pinching = false;
  let startDistance = 0;
  let startColumns = gridDensityManager.columns;

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2 || isAssetViewerOpen()) {
      pinching = false;
      return;
    }

    pinching = true;
    startDistance = touchDistance(event);
    startColumns = gridDensityManager.columns;
    node.classList.add('pg-grid-pinching');
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!pinching || event.touches.length !== 2 || startDistance <= 0) {
      return;
    }

    event.preventDefault();
    const scale = touchDistance(event) / startDistance;
    const steps = Math.round((scale - 1) / STEP_SCALE);
    gridDensityManager.setColumns(startColumns - steps);
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length < 2) {
      pinching = false;
      node.classList.remove('pg-grid-pinching');
    }
  };

  node.addEventListener('touchstart', onTouchStart, { passive: true });
  node.addEventListener('touchmove', onTouchMove, { passive: false });
  node.addEventListener('touchend', onTouchEnd, { passive: true });
  node.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return {
    destroy() {
      node.classList.remove('pg-grid-pinching');
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    },
  };
};
