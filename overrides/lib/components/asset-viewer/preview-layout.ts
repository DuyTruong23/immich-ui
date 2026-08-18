import { scaleToFit } from "$lib/utils/container-utils";

/** Previous 2 + current + next 2. Edges may have fewer. */
export const PREVIEW_STRIP_RADIUS = 2;
export const PREVIEW_STRIP_MAX_ITEMS = PREVIEW_STRIP_RADIUS * 2 + 1;
export const PREVIEW_STRIP_THUMB_SIZE = 40;
export const PREVIEW_STRIP_CURRENT_SIZE = 48;

export type PreviewStripItem = {
  id: string;
  thumbhash: string | null;
  originalFileName?: string;
};

export type ContainFitFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Same contain-fit box AdaptiveImage uses, so swipe peek sits where the
 * next/previous photo will land after the gesture commits.
 */
export function containFitFrame(
  media: { width?: number | null; height?: number | null },
  container: { width: number; height: number },
): ContainFitFrame | null {
  const mediaWidth = media.width ?? 0;
  const mediaHeight = media.height ?? 0;
  if (
    mediaWidth <= 0 ||
    mediaHeight <= 0 ||
    container.width <= 0 ||
    container.height <= 0
  ) {
    return null;
  }

  const size = scaleToFit(
    { width: mediaWidth, height: mediaHeight },
    container,
  );
  return {
    width: size.width,
    height: size.height,
    left: (container.width - size.width) / 2,
    top: (container.height - size.height) / 2,
  };
}

/**
 * Strip order: [older-later side … previous, current, next … earlier side].
 * Immediate neighbors always match swipe previous/next, even if the
 * timeline iterator is still catching up.
 */
export function buildPreviewStrip(options: {
  current: PreviewStripItem;
  previous?: PreviewStripItem;
  next?: PreviewStripItem;
  laterItems?: PreviewStripItem[];
  earlierItems?: PreviewStripItem[];
  radius?: number;
}): PreviewStripItem[] {
  const { current } = options;
  const radius = options.radius ?? PREVIEW_STRIP_RADIUS;
  const seen = new Set<string>([current.id]);

  const left: PreviewStripItem[] = [];
  const pushUnique = (list: PreviewStripItem[], item?: PreviewStripItem) => {
    if (!item || seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    list.push(item);
  };

  pushUnique(left, options.previous);
  for (const item of options.laterItems ?? []) {
    pushUnique(left, item);
  }

  const right: PreviewStripItem[] = [];
  pushUnique(right, options.next);
  for (const item of options.earlierItems ?? []) {
    pushUnique(right, item);
  }

  return [
    ...left.toReversed().slice(-radius),
    current,
    ...right.slice(0, radius),
  ];
}

export function windowPreviewStrip<T extends { id: string }>(
  assets: T[],
  currentId: string,
  radius = PREVIEW_STRIP_RADIUS,
): T[] {
  if (assets.length === 0) {
    return assets;
  }

  const index = assets.findIndex((asset) => asset.id === currentId);
  if (index === -1) {
    return assets.slice(0, radius * 2 + 1);
  }

  return assets.slice(Math.max(0, index - radius), index + radius + 1);
}
