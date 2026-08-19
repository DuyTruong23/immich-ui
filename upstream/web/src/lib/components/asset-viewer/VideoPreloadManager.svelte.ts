import { browser } from '$app/environment';
import {
  getBufferedAhead,
  isPreloadReady,
  PRELOAD_MIN_SECONDS,
  PRELOAD_TARGET_SECONDS,
} from '$lib/utils/video-buffer-utils';
import {
  isVideoAsset,
  resolveVideoSource,
  type ResolvedVideoSource,
} from '$lib/utils/video-playback-resolver';
import { shouldPreloadAdjacentAssets } from '$lib/utils/mobile-performance.svelte';
import type { AssetResponseDto } from '@immich/sdk';

export type PreloadTier = 'buffer' | 'metadata';

type PreloadSlot = {
  assetId: string;
  video: HTMLVideoElement;
  url: string;
  tier: PreloadTier;
  source: ResolvedVideoSource;
  onProgress?: () => void;
};

type AssetCursor = {
  current: AssetResponseDto;
  nextAsset?: AssetResponseDto;
  previousAsset?: AssetResponseDto;
};

const HIDDEN_CONTAINER_ID = 'immich-video-preload-pool';

export class VideoPreloadManager {
  private slots = new Map<string, PreloadSlot>();
  private container: HTMLElement | undefined;

  private ensureContainer(): HTMLElement {
    if (!browser) {
      throw new Error('VideoPreloadManager requires browser');
    }
    if (this.container) {
      return this.container;
    }
    const existing = document.getElementById(HIDDEN_CONTAINER_ID);
    if (existing) {
      this.container = existing;
      return existing;
    }
    const el = document.createElement('div');
    el.id = HIDDEN_CONTAINER_ID;
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;z-index:-1';
    document.body.appendChild(el);
    this.container = el;
    return el;
  }

  private createVideoElement(tier: PreloadTier): HTMLVideoElement {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = tier === 'buffer' ? 'auto' : 'metadata';
    video.setAttribute('playsinline', '');
    return video;
  }

  private releaseSlot(assetId: string) {
    const slot = this.slots.get(assetId);
    if (!slot) {
      return;
    }
    slot.video.removeEventListener('progress', slot.onProgress ?? (() => {}));
    slot.video.pause();
    slot.video.removeAttribute('src');
    slot.video.load();
    slot.video.remove();
    this.slots.delete(assetId);
  }

  private startPreload(
    asset: AssetResponseDto,
    tier: PreloadTier,
    playOriginalVideo: boolean,
    isMobileDevice: boolean,
  ) {
    if (!shouldPreloadAdjacentAssets() || !isVideoAsset(asset)) {
      return;
    }

    const assetId = asset.id;
    const existing = this.slots.get(assetId);
    if (existing?.tier === tier || (existing && tier === 'metadata')) {
      return;
    }

    this.releaseSlot(assetId);

    const source = resolveVideoSource({
      assetId,
      cacheKey: asset.thumbhash,
      playOriginalVideo,
      isMobileDevice,
    });

    if (source.usesHls) {
      return;
    }

    const container = this.ensureContainer();
    const video = this.createVideoElement(tier);
    video.poster = '';
    video.src = source.url;

    const slot: PreloadSlot = { assetId, video, url: source.url, tier, source };
    this.slots.set(assetId, slot);

    if (tier === 'buffer') {
      slot.onProgress = () => {
        if (isPreloadReady(video)) {
          video.removeEventListener('progress', slot.onProgress!);
          slot.onProgress = undefined;
        }
      };
      video.addEventListener('progress', slot.onProgress);
      video.addEventListener(
        'loadeddata',
        () => {
          if (video.paused && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            void video.play().then(() => {
              const target = Math.min(PRELOAD_TARGET_SECONDS, video.duration || PRELOAD_TARGET_SECONDS);
              const checkBuffer = () => {
                const buffered = video.buffered;
                if (buffered.length > 0 && buffered.end(buffered.length - 1) >= target) {
                  video.pause();
                  video.currentTime = 0;
                  return;
                }
                if (getBufferedAhead(video) >= PRELOAD_MIN_SECONDS) {
                  video.pause();
                  video.currentTime = 0;
                  return;
                }
                requestAnimationFrame(checkBuffer);
              };
              checkBuffer();
            }).catch(() => {
              // Autoplay blocked on hidden element — metadata + partial buffer still helps via preload=auto
            });
          }
        },
        { once: true },
      );
    }

    container.appendChild(video);
    video.load();
  }

  /** Take a preloaded element for immediate playback; removes it from the pool. */
  consume(assetId: string): HTMLVideoElement | null {
    const slot = this.slots.get(assetId);
    if (!slot) {
      return null;
    }
    slot.video.removeEventListener('progress', slot.onProgress ?? (() => {}));
    this.slots.delete(assetId);
    slot.video.pause();
    return slot.video;
  }

  isReady(assetId: string): boolean {
    const slot = this.slots.get(assetId);
    if (!slot) {
      return false;
    }
    if (slot.tier === 'metadata') {
      return slot.video.readyState >= HTMLMediaElement.HAVE_METADATA;
    }
    return isPreloadReady(slot.video);
  }

  getSource(assetId: string): ResolvedVideoSource | undefined {
    return this.slots.get(assetId)?.source;
  }

  syncWithCursor(
    cursor: AssetCursor,
    playOriginalVideo: boolean,
    isMobileDevice: boolean,
  ) {
    if (!browser || !shouldPreloadAdjacentAssets()) {
      return;
    }

    const keepIds = new Set<string>();
    const currentIsVideo = isVideoAsset(cursor.current);

    if (currentIsVideo) {
      if (cursor.nextAsset && isVideoAsset(cursor.nextAsset)) {
        keepIds.add(cursor.nextAsset.id);
        this.startPreload(cursor.nextAsset, 'buffer', playOriginalVideo, isMobileDevice);
      }
      if (cursor.previousAsset && isVideoAsset(cursor.previousAsset)) {
        keepIds.add(cursor.previousAsset.id);
        this.startPreload(cursor.previousAsset, 'metadata', playOriginalVideo, isMobileDevice);
      }
    }

    for (const assetId of this.slots.keys()) {
      if (!keepIds.has(assetId) && assetId !== cursor.current.id) {
        this.releaseSlot(assetId);
      }
    }
  }

  cancelBeforeNavigation(direction: 'previous' | 'next') {
    if (direction === 'next') {
      for (const [id, slot] of this.slots) {
        if (slot.tier === 'metadata') {
          this.releaseSlot(id);
        }
      }
    } else {
      for (const [id, slot] of this.slots) {
        if (slot.tier === 'buffer') {
          this.releaseSlot(id);
        }
      }
    }
  }

  destroy() {
    for (const assetId of [...this.slots.keys()]) {
      this.releaseSlot(assetId);
    }
    this.container?.remove();
    this.container = undefined;
  }
}

export const videoPreloadManager = new VideoPreloadManager();
