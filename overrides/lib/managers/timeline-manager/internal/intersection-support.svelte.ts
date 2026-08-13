import { getTimelineIntersectionExpand } from '$lib/utils/mobile-performance.svelte';
import { TimelineManager } from '../timeline-manager.svelte';
import type { TimelineMonth } from '../timeline-month.svelte';

export function isIntersecting(regionTop: number, regionBottom: number, otherTop: number, otherBottom: number) {
  return (
    (regionTop >= otherTop && regionTop < otherBottom) ||
    (regionBottom >= otherTop && regionBottom < otherBottom) ||
    (regionTop < otherTop && regionBottom >= otherBottom)
  );
}

export enum ViewportProximity {
  FarFromViewport,
  NearViewport,
  InViewport,
}

export function isInViewport(state: ViewportProximity): boolean {
  return state === ViewportProximity.InViewport;
}

export function isInOrNearViewport(state: ViewportProximity): boolean {
  return state !== ViewportProximity.FarFromViewport;
}

function calculateViewportProximity(regionTop: number, regionBottom: number, windowTop: number, windowBottom: number) {
  const expand = getTimelineIntersectionExpand();
  if (regionBottom < windowTop - expand || regionTop >= windowBottom + expand) {
    return ViewportProximity.FarFromViewport;
  }

  if (regionBottom < windowTop || regionTop >= windowBottom) {
    return ViewportProximity.NearViewport;
  }

  return ViewportProximity.InViewport;
}

export function updateTimelineMonthViewportProximity(timelineManager: TimelineManager, month: TimelineMonth) {
  const proximity = calculateViewportProximity(
    month.top,
    month.top + month.height,
    timelineManager.visibleWindow.top,
    timelineManager.visibleWindow.bottom,
  );

  month.viewportProximity = proximity;
  if (isInOrNearViewport(proximity)) {
    timelineManager.clearDeferredLayout(month);
  }
}
