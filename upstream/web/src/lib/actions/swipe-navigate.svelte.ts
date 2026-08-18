import { motionDuration } from '$lib/utils/mobile-performance.svelte';

export type SwipeNavigateDirection = 'next' | 'previous';

type SwipeNavigateOptions = {
  getWidth: () => number;
  getHeight?: () => number;
  canStart: (event: PointerEvent) => boolean;
  hasNext: () => boolean;
  hasPrevious: () => boolean;
  onCommit: (direction: SwipeNavigateDirection) => void;
  onCommitStart?: (direction: SwipeNavigateDirection) => void;
  onDismiss?: () => void;
};

const LOCK_PX = 10;
const COMMIT_RATIO = 0.22;
const COMMIT_VELOCITY = 0.5;
const DISMISS_PX = 96;
const DISMISS_VELOCITY = 0.45;
const DISMISS_FADE_PX = 280;
const DISMISS_SCALE_PX = 1800;
const DISMISS_SCALE_MIN = 0.84;
const RUBBER = 0.34;
const SETTLE_MS = 280;

export const swipeDismissProgress = (offsetY: number) => Math.min(1, Math.max(0, offsetY) / DISMISS_FADE_PX);

export const swipeDismissScale = (offsetY: number) =>
  offsetY > 0 ? Math.max(DISMISS_SCALE_MIN, 1 - offsetY / DISMISS_SCALE_PX) : 1;

export class SwipeNavigate {
  offset = $state(0);
  offsetY = $state(0);
  animating = $state(false);

  #options: SwipeNavigateOptions;
  #pointerId: number | null = null;
  #startX = 0;
  #startY = 0;
  #startTime = 0;
  #lock: 'h' | 'v' | null = null;
  #commitTimer: ReturnType<typeof setTimeout> | undefined;
  #touchGuard: HTMLElement | undefined;

  constructor(options: SwipeNavigateOptions) {
    this.#options = options;
  }

  get dragging() {
    return this.#lock === 'h';
  }

  destroy() {
    this.#clearCommit();
    this.#unbindTouchGuard();
  }

  /** iOS: native video/photo pan-y is passive; lock cần preventDefault trên touchmove. */
  bindTouchGuard = (node: HTMLElement) => {
    this.#unbindTouchGuard();
    this.#touchGuard = node;
    node.addEventListener('touchmove', this.#onTouchMove, { passive: false });
    return {
      destroy: () => this.#unbindTouchGuard(),
    };
  };

  #unbindTouchGuard() {
    this.#touchGuard?.removeEventListener('touchmove', this.#onTouchMove);
    this.#touchGuard = undefined;
  }

  #onTouchMove = (event: TouchEvent) => {
    if (this.#lock) {
      event.preventDefault();
    }
  };

  onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    if (!this.#options.canStart(event)) {
      return;
    }

    this.#clearCommit();
    this.animating = false;
    this.#pointerId = event.pointerId;
    this.#startX = event.clientX;
    this.#startY = event.clientY;
    this.#startTime = performance.now();
    this.#lock = null;
  };

  onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.#pointerId) {
      if (!event.isPrimary && this.#pointerId !== null) {
        this.#cancel();
      }
      return;
    }

    const dx = event.clientX - this.#startX;
    const dy = event.clientY - this.#startY;

    if (!this.#lock) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) {
        return;
      }

      this.#lock = Math.abs(dx) >= Math.abs(dy) * 1.1 ? 'h' : 'v';
      if (this.#lock === 'v' && !this.#options.onDismiss) {
        return;
      }

      event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (this.#lock === 'v') {
      if (dy <= 0) {
        this.offsetY = 0;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.offsetY = dy * 0.62;
      return;
    }

    if (this.#lock !== 'h') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.offset = this.#rubber(dx);
  };

  onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    const lock = this.#lock;
    this.#pointerId = null;
    this.#lock = null;

    if (lock === 'v') {
      const elapsed = Math.max(performance.now() - this.#startTime, 1);
      const velocityY = (event.clientY - this.#startY) / elapsed;
      const shouldDismiss =
        Boolean(this.#options.onDismiss) && (this.offsetY >= DISMISS_PX || velocityY >= DISMISS_VELOCITY);

      this.animating = true;
      if (shouldDismiss) {
        const height = Math.max(this.#options.getHeight?.() ?? 0, 1);
        this.offsetY = height;
        this.#commitTimer = setTimeout(() => {
          this.#commitTimer = undefined;
          this.#options.onDismiss?.();
        }, motionDuration(SETTLE_MS));
        return;
      }

      this.offsetY = 0;
      return;
    }

    if (lock !== 'h') {
      this.offset = 0;
      this.offsetY = 0;
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const width = Math.max(this.#options.getWidth(), 1);
    const elapsed = Math.max(performance.now() - this.#startTime, 1);
    const velocity = (event.clientX - this.#startX) / elapsed;
    const ratio = this.offset / width;

    let direction: SwipeNavigateDirection | null = null;
    if ((ratio <= -COMMIT_RATIO || velocity <= -COMMIT_VELOCITY) && this.#options.hasNext()) {
      direction = 'next';
    } else if ((ratio >= COMMIT_RATIO || velocity >= COMMIT_VELOCITY) && this.#options.hasPrevious()) {
      direction = 'previous';
    }

    this.animating = true;

    if (!direction) {
      this.offset = 0;
      return;
    }

    this.offset = direction === 'next' ? -width : width;
    this.#options.onCommitStart?.(direction);
    this.#commitTimer = setTimeout(() => {
      this.#commitTimer = undefined;
      this.#options.onCommit(direction);
    }, motionDuration(SETTLE_MS));
  };

  onPointerCancel = (event: PointerEvent) => {
    if (event.pointerId === this.#pointerId) {
      this.#cancel();
    }
  };

  reset() {
    this.#clearCommit();
    this.#pointerId = null;
    this.#lock = null;
    this.animating = false;
    this.offset = 0;
    this.offsetY = 0;
  }

  #rubber(dx: number) {
    if ((dx < 0 && !this.#options.hasNext()) || (dx > 0 && !this.#options.hasPrevious())) {
      return dx * RUBBER;
    }

    return dx;
  }

  #cancel() {
    this.#clearCommit();
    this.#pointerId = null;
    this.#lock = null;
    this.animating = true;
    this.offset = 0;
    this.offsetY = 0;
  }

  #clearCommit() {
    if (this.#commitTimer) {
      clearTimeout(this.#commitTimer);
      this.#commitTimer = undefined;
    }
  }
}
