import { browser, dev } from '$app/environment';

export const BUFFER_TARGET_SECONDS = 8;
export const BUFFER_MIN_SECONDS = 3;
export const BUFFER_MAX_SECONDS = 12;
export const PRELOAD_TARGET_SECONDS = 8;
export const PRELOAD_MIN_SECONDS = 5;

/** Seconds of media buffered ahead of currentTime. */
export const getBufferedAhead = (video: HTMLVideoElement): number => {
  const time = video.currentTime;
  const { buffered } = video;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= time && buffered.end(i) > time) {
      return buffered.end(i) - time;
    }
  }
  if (buffered.length > 0 && time === 0) {
    return buffered.end(0);
  }
  return 0;
};

export const isPreloadReady = (video: HTMLVideoElement): boolean =>
  video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ||
  getBufferedAhead(video) >= PRELOAD_MIN_SECONDS;

export const isInstantPlayReady = (video: HTMLVideoElement): boolean =>
  video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA ||
  getBufferedAhead(video) >= BUFFER_MIN_SECONDS;

export type VideoDiagnostics = {
  assetId: string;
  sourceKind: string;
  timeToMetadataMs?: number;
  timeToFirstPlayMs?: number;
  bufferedSeconds: number;
  waitingEvents: number;
  stalledEvents: number;
  preloadStatus?: string;
};

const diagnosticsLog = new Map<string, VideoDiagnostics>();

export const createVideoDiagnostics = (assetId: string, sourceKind: string): VideoDiagnostics => {
  const entry: VideoDiagnostics = {
    assetId,
    sourceKind,
    bufferedSeconds: 0,
    waitingEvents: 0,
    stalledEvents: 0,
  };
  diagnosticsLog.set(assetId, entry);
  return entry;
};

export const logVideoDiagnostics = (entry: VideoDiagnostics) => {
  if (!dev || !browser) {
    return;
  }
  console.debug('[video-playback]', entry);
};

export const clearVideoDiagnostics = (assetId: string) => {
  diagnosticsLog.delete(assetId);
};
