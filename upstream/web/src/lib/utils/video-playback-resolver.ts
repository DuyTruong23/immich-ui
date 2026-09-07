import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
import { getAssetHlsUrl, getAssetMediaUrl, getAssetPlaybackUrl } from '$lib/utils';
import { getNetworkQuality } from '$lib/utils/mobile-performance.svelte';
import { AssetMediaSize, AssetTypeEnum, type AssetResponseDto } from '@immich/sdk';

export type VideoSourceKind = 'hls' | 'original' | 'playback';

export interface ResolvedVideoSource {
  url: string;
  kind: VideoSourceKind;
  /** HLS realtime transcode — skip MP4 preload pool. */
  usesHls: boolean;
}

export interface ResolveVideoSourceOptions {
  assetId: string;
  cacheKey: string | null;
  playOriginalVideo: boolean;
  isMobileDevice: boolean;
  hlsFallback?: boolean;
}

export const resolveVideoSource = (options: ResolveVideoSourceOptions): ResolvedVideoSource => {
  const { assetId, cacheKey, playOriginalVideo, isMobileDevice, hlsFallback = false } = options;

  if (featureFlagsManager.value.realtimeTranscoding && !hlsFallback && !isMobileDevice) {
    return {
      url: getAssetHlsUrl(assetId),
      kind: 'hls',
      usesHls: true,
    };
  }

  if (playOriginalVideo && getNetworkQuality() === 'fast') {
    return {
      url: getAssetMediaUrl({ id: assetId, size: AssetMediaSize.Original, cacheKey }),
      kind: 'original',
      usesHls: false,
    };
  }

  return {
    url: getAssetPlaybackUrl({ id: assetId, cacheKey }),
    kind: 'playback',
    usesHls: false,
  };
};

export const isVideoAsset = (asset: AssetResponseDto | undefined): boolean =>
  asset?.type === AssetTypeEnum.Video;
