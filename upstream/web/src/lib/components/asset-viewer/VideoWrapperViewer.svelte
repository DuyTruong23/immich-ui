<script lang="ts">
  import VideoNativeViewer from '$lib/components/asset-viewer/VideoNativeViewer.svelte';
  import VideoPanoramaViewer from '$lib/components/asset-viewer/VideoPanoramaViewer.svelte';
  import { ProjectionType } from '$lib/constants';
  import type { AssetResponseDto } from '@immich/sdk';
  import type { SwipeCustomEvent } from 'svelte-gestures';

  interface Props {
    asset: AssetResponseDto;
    assetId?: string;
    projectionType: string | null | undefined;
    cacheKey: string | null;
    loopVideo: boolean;
    playOriginalVideo: boolean;
    extendedControls?: boolean;
    nextAsset?: AssetResponseDto;
    previousAsset?: AssetResponseDto;
    onClose?: () => void;
    onPreviousAsset?: () => void;
    onNextAsset?: () => void;
    onVideoEnded?: () => void;
    onVideoStarted?: () => void;
    onSwipe?: (event: SwipeCustomEvent) => void;
    onCommitStart?: (direction: 'next' | 'previous') => void;
    onMediaReady?: () => void;
  }

  let {
    asset,
    assetId,
    projectionType,
    cacheKey,
    loopVideo,
    playOriginalVideo,
    extendedControls = false,
    nextAsset,
    previousAsset,
    onPreviousAsset,
    onClose,
    onNextAsset,
    onVideoEnded,
    onVideoStarted,
    onSwipe,
    onCommitStart,
    onMediaReady,
  }: Props = $props();

  const effectiveAssetId = $derived(assetId ?? asset.id);
</script>

{#if projectionType === ProjectionType.EQUIRECTANGULAR}
  <VideoPanoramaViewer {asset} />
{:else}
  <VideoNativeViewer
    {loopVideo}
    {cacheKey}
    {asset}
    assetId={effectiveAssetId}
    {playOriginalVideo}
    {extendedControls}
    {nextAsset}
    {previousAsset}
    {onPreviousAsset}
    {onNextAsset}
    {onVideoEnded}
    {onVideoStarted}
    {onClose}
    {onSwipe}
    {onCommitStart}
    {onMediaReady}
  />
{/if}
