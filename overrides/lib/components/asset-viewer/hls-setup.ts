import { authManager } from '$lib/managers/auth-manager.svelte';
import Hls, { AbrController, Events, type FragLoadedData, type FragLoadingData, type HlsConfig } from 'hls.js';

class NoAbandonAbrController extends AbrController {
  private switchTarget = -1;

  protected override onFragLoading(_event: Events.FRAG_LOADING, data: FragLoadingData) {
    if (data.frag.sn === 'initSegment') {
      this.switchTarget = data.frag.level;
    }
  }

  protected override onFragLoaded(event: Events.FRAG_LOADED, data: FragLoadedData) {
    if (data.frag.sn !== 'initSegment') {
      this.switchTarget = -1;
    }
    super.onFragLoaded(event, data);
  }

  override get nextAutoLevel(): number {
    const level = super.nextAutoLevel;
    const target = this.hls.levels[this.switchTarget];
    if (target && level < this.switchTarget && target.loadError === 0 && target.fragmentError === 0) {
      return this.switchTarget;
    }
    return level;
  }

  override set nextAutoLevel(level: number) {
    super.nextAutoLevel = level;
  }
}

export const loadHlsElement = async () => {
  await import('hls-video-element');
};

export const createHlsConfig = (getAssetFileUrl: () => string): Partial<HlsConfig> => ({
  abrController: NoAbandonAbrController,
  highBufferWatchdogPeriod: 10,
  detectStallWithCurrentTimeMs: 10_000,
  maxBufferHole: 0.5,
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 30_000,
      maxLoadTimeMs: 60_000,
      timeoutRetry: { maxNumRetry: 5, retryDelayMs: 100, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  },
  levelLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 30_000,
      maxLoadTimeMs: 60_000,
      timeoutRetry: { maxNumRetry: 5, retryDelayMs: 100, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  },
  useMediaCapabilities: false,
  xhrSetup: (xhr: XMLHttpRequest, url: string) => {
    const authenticatedUrl = new URL(url, getAssetFileUrl() || location.href);
    for (const [key, value] of Object.entries(authManager.params)) {
      if (value) {
        authenticatedUrl.searchParams.set(key, value as string);
      }
    }
    xhr.open('GET', authenticatedUrl.href);
  },
});

export { Hls };
