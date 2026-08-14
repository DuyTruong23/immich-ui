const EDGE_PX = 32;
const MIN_DX = 56;
const MAX_DY = 72;

export type SwipeBackOptions = {
  onBack: () => void;
  enabled?: () => boolean;
};

const isRtl = () => document.body.getAttribute('dir') === 'rtl';

/** Vuốt từ mép (LTR trái / RTL phải) — cùng hành vi nút mũi tên trở lại. */
export const swipeBack = (node: HTMLElement, options: SwipeBackOptions) => {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  const enabled = () => options.enabled?.() ?? true;

  const onStart = (event: TouchEvent) => {
    if (!enabled() || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const fromEndEdge = isRtl() && touch.clientX >= window.innerWidth - EDGE_PX;
    const fromStartEdge = !isRtl() && touch.clientX <= EDGE_PX;
    if (!fromStartEdge && !fromEndEdge) {
      return;
    }

    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
  };

  const onMove = (event: TouchEvent) => {
    if (!tracking) {
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startY);
    const towardBack = isRtl() ? dx < -12 : dx > 12;
    if (towardBack && dy < MAX_DY) {
      event.preventDefault();
    }
  };

  const onEnd = (event: TouchEvent) => {
    if (!tracking) {
      return;
    }

    tracking = false;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startY);
    const traveled = isRtl() ? -dx : dx;
    if (traveled >= MIN_DX && dy < MAX_DY) {
      options.onBack();
    }
  };

  node.addEventListener('touchstart', onStart, { passive: true });
  node.addEventListener('touchmove', onMove, { passive: false });
  node.addEventListener('touchend', onEnd, { passive: true });
  node.addEventListener('touchcancel', onEnd, { passive: true });

  return {
    update(next: SwipeBackOptions) {
      options = next;
    },
    destroy() {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    },
  };
};
