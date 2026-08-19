<script lang="ts">
  import FaceEditor from '$lib/components/asset-viewer/face-editor/FaceEditor.svelte';
  import PhotoBlurBackdrop from '$lib/components/asset-viewer/PhotoBlurBackdrop.svelte';
  import PhotoSwipeTrack from '$lib/components/asset-viewer/PhotoSwipeTrack.svelte';
  import VideoRemoteViewer from '$lib/components/asset-viewer/VideoRemoteViewer.svelte';
  import { videoPreloadManager } from '$lib/components/asset-viewer/VideoPreloadManager.svelte';
  import { assetViewerFadeDuration } from '$lib/constants';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { castManager } from '$lib/managers/cast-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { mediaCapabilitiesManager } from '$lib/managers/media-capabilities-manager.svelte';
  import { playbackStateManager } from '$lib/managers/playback-state.svelte';
  import { ocrManager } from '$lib/stores/ocr.svelte';
  import { autoPlayVideo, lang, loopVideo as loopVideoPreference } from '$lib/stores/preferences.store';
  import { SlideshowState, slideshowStore } from '$lib/stores/slideshow.store';
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { getAssetHlsSessionUrl, getAssetMediaUrl } from '$lib/utils';
  import { isCrossOriginMediaBase } from '$lib/utils/media-base-url';
  import {
    createVideoDiagnostics,
    getBufferedAhead,
    isInstantPlayReady,
    logVideoDiagnostics,
  } from '$lib/utils/video-buffer-utils';
  import { resolveVideoSource } from '$lib/utils/video-playback-resolver';
  import { motionDuration, networkManager } from '$lib/utils/mobile-performance.svelte';
  import { AssetMediaSize, AssetTypeEnum, getBaseUrl, type AssetResponseDto } from '@immich/sdk';
  import { Icon, LoadingSpinner, shortcuts } from '@immich/ui';
  import {
    mdiCheck,
    mdiChevronLeft,
    mdiChevronRight,
    mdiFullscreen,
    mdiFullscreenExit,
    mdiPause,
    mdiPlay,
    mdiVolumeHigh,
    mdiVolumeLow,
    mdiVolumeMedium,
    mdiVolumeMute,
  } from '@mdi/js';
  import type HlsVideoElement from 'hls-video-element';
  import type Hls from 'hls.js';
  import type { HlsConfig } from 'hls.js';
  import 'media-chrome/media-control-bar';
  import 'media-chrome/media-controller';
  import 'media-chrome/media-fullscreen-button';
  import 'media-chrome/media-mute-button';
  import 'media-chrome/media-play-button';
  import 'media-chrome/media-playback-rate-button';
  import 'media-chrome/media-time-display';
  import 'media-chrome/media-volume-range';
  import 'media-chrome/menu/media-playback-rate-menu';
  import 'media-chrome/menu/media-rendition-menu';
  import 'media-chrome/menu/media-settings-menu';
  import 'media-chrome/menu/media-settings-menu-button';
  import 'media-chrome/menu/media-settings-menu-item';
  import { onDestroy } from 'svelte';
  import type { SwipeCustomEvent } from 'svelte-gestures';
  import { t } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import './immich-time-range';

  interface Props {
    asset: AssetResponseDto;
    assetId: string;
    loopVideo: boolean;
    cacheKey: string | null;
    playOriginalVideo: boolean;
    extendedControls?: boolean;
    nextAsset?: AssetResponseDto;
    previousAsset?: AssetResponseDto;
    onPreviousAsset?: () => void;
    onNextAsset?: () => void;
    onVideoEnded?: () => void;
    onVideoStarted?: () => void;
    onClose?: () => void;
    onSwipe?: (event: SwipeCustomEvent) => void;
    onCommitStart?: (direction: 'next' | 'previous') => void;
    onMediaReady?: () => void;
  }

  let {
    asset,
    assetId,
    loopVideo,
    cacheKey,
    playOriginalVideo,
    extendedControls = false,
    nextAsset,
    previousAsset,
    onPreviousAsset = () => {},
    onNextAsset = () => {},
    onVideoEnded = () => {},
    onVideoStarted = () => {},
    onClose = () => {},
    onSwipe,
    onCommitStart,
    onMediaReady,
  }: Props = $props();

  let videoBuffer0: HTMLVideoElement | undefined = $state();
  let videoBuffer1: HTMLVideoElement | undefined = $state();
  let bufferIndex = $state<0 | 1>(0);
  let bufferLoadedKey0 = $state<string | undefined>();
  let bufferLoadedKey1 = $state<string | undefined>();
  const getBufferEl = (index: 0 | 1) => (index === 0 ? videoBuffer0 : videoBuffer1);
  const getBufferLoadedKey = (index: 0 | 1) => (index === 0 ? bufferLoadedKey0 : bufferLoadedKey1);
  const setBufferLoadedKey = (index: 0 | 1, key: string | undefined) => {
    if (index === 0) {
      bufferLoadedKey0 = key;
    } else {
      bufferLoadedKey1 = key;
    }
  };
  let videoPlayer = $derived(getBufferEl(bufferIndex));
  const inactiveBufferIndex = $derived((bufferIndex === 0 ? 1 : 0) as 0 | 1);
  let isLoading = $state(true);
  let hlsFallback = $state(false);
  let useSameOriginFallback = $state(false);
  // Realtime HLS transcodes per-segment over the network — much slower on mobile/tunnel than pre-transcoded playback.
  const isMobileDevice = $derived(mediaQueryManager.pointerCoarse);
  const videoPreload = $derived(isMobileDevice ? 'auto' : 'metadata');
  const mediaAuthReady = $derived(
    !isCrossOriginMediaBase() || authManager.isSharedLink || 'sessionKey' in authManager.params,
  );
  let resolvedSource = $derived.by(() => {
    networkManager.quality;
    return resolveVideoSource({
      assetId,
      cacheKey,
      playOriginalVideo,
      isMobileDevice,
      hlsFallback,
    });
  });
  let resolvedFileUrl = $derived(resolvedSource.url);
  let assetFileUrl = $derived.by(() => {
    if (!useSameOriginFallback) {
      return resolvedFileUrl;
    }

    const url = new URL(resolvedFileUrl, location.href);
    return getBaseUrl() + url.pathname + url.search;
  });
  const wantsHlsPlayback = $derived(featureFlagsManager.value.realtimeTranscoding && !hlsFallback && !isMobileDevice);
  let hlsRuntimeReady = $state(false);
  const useHlsPlayback = $derived(wantsHlsPlayback && hlsRuntimeReady);
  const aspectRatio = $derived(asset.width && asset.height ? `${asset.width} / ${asset.height}` : undefined);
  let showVideo = $state(true);
  let hasFocused = $state(false);
  let activeSession: { assetId: string; id: string } | undefined;
  let loadedSourceKey: string | undefined;
  let rebuildCount = 0;
  let autoplayAttempted = false;
  let waitingTimer: ReturnType<typeof setTimeout> | undefined;
  let diagnosticsStart = 0;
  let diagnostics = $state<ReturnType<typeof createVideoDiagnostics> | undefined>();
  let playbackSyncCleanup: (() => void) | undefined;

  const LOADING_DEBOUNCE_MS = 350;
  const VIDEO_CLASS = 'h-full object-contain touch-pinch-zoom';
  const posterUrl = $derived(getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Preview, cacheKey }));

  const clearWaitingTimer = () => {
    if (waitingTimer) {
      clearTimeout(waitingTimer);
      waitingTimer = undefined;
    }
  };

  const syncPlaybackFromVideo = (video: HTMLVideoElement) => {
    playbackStateManager.syncFrom(video);
  };

  const wirePlaybackSync = (video: HTMLVideoElement) => {
    playbackSyncCleanup?.();
    const onSync = () => syncPlaybackFromVideo(video);
    video.addEventListener('volumechange', onSync);
    video.addEventListener('ratechange', onSync);
    playbackSyncCleanup = () => {
      video.removeEventListener('volumechange', onSync);
      video.removeEventListener('ratechange', onSync);
    };
  };

  const showLoadingDebounced = () => {
    clearWaitingTimer();
    waitingTimer = setTimeout(() => {
      isLoading = true;
    }, LOADING_DEBOUNCE_MS);
  };

  const hideLoading = () => {
    clearWaitingTimer();
    isLoading = false;
  };

  const MAX_REBUILDS = 1;
  const SESSION_ID_REGEX = /\/video\/stream\/([0-9a-f-]{36})\//;
  let hlsConfig: Partial<HlsConfig> | undefined;
  let HlsApi: typeof Hls | undefined;

  const releaseSession = () => {
    const session = activeSession;
    if (!session) {
      return;
    }
    activeSession = undefined;
    const url = getAssetHlsSessionUrl(session.assetId, session.id);
    void fetch(url, { method: 'DELETE' }).catch(() => console.warn('Failed to release HLS session', session));
  };

  const isHlsElement = (el: HTMLVideoElement | undefined): el is HlsVideoElement => {
    return el?.tagName === 'HLS-VIDEO';
  };

  const wireHlsListeners = (el: HlsVideoElement, assetId: string, resumeTime?: number) => {
    const api = el.api;
    const HlsRuntime = HlsApi;
    if (!api || !HlsRuntime) {
      return;
    }

    // This is a hack to make the rendition menu use `api.currentLevel` instead of `api.nextLevel`.
    // `api.nextLevel` makes the player request the next segment followed by the current segment.
    // That backward request causes the server to restart transcoding for no reason.
    Object.defineProperty(api, 'nextLevel', {
      configurable: true,
      get: () => api.currentLevel,
      set: (level: number) => {
        api.currentLevel = level;
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    api.on(HlsRuntime.Events.MANIFEST_PARSED, async () => {
      // Defer hls.js's first fragment load until we filter out suboptimal variants
      api.stopLoad();
      const id = api.levels[0]?.url[0]?.match(SESSION_ID_REGEX)?.[1];
      if (id) {
        activeSession = { assetId, id };
      }

      const keep = await mediaCapabilitiesManager.efficientLevels(api.levels);
      for (let i = api.levels.length - 1; i >= 0; i--) {
        if (!keep.has(i)) {
          api.removeLevel(i);
        }
      }

      api.startLoad(resumeTime);
    });

    api.on(HlsRuntime.Events.FRAG_LOADED, () => (rebuildCount = 0));

    api.on(HlsRuntime.Events.ERROR, (_, data) => {
      // 404 on a playlist or segment can mean the server-side session has expired. Refetch
      // master for a new session, but give up if it still 404s.
      const isSession404 =
        data.response?.code === 404 &&
        (data.details === HlsRuntime.ErrorDetails.FRAG_LOAD_ERROR ||
          data.details === HlsRuntime.ErrorDetails.LEVEL_LOAD_ERROR);

      if (data.fatal && isSession404 && rebuildCount++ < MAX_REBUILDS) {
        console.warn('HLS session error, starting new session');
        activeSession = undefined;
        resumeTime = el.currentTime;
        el.load();
        // wireHlsListeners must run after el.api is repopulated.
        queueMicrotask(() => wireHlsListeners(el, assetId, resumeTime));
        return;
      }

      if (data.fatal) {
        console.error('HLS error', JSON.stringify(data));
        isLoading = false;
        if (!hlsFallback) {
          console.warn('HLS playback failed, falling back to transcoded file');
          hlsFallback = true;
        }
        return;
      }

      console.warn('HLS error', JSON.stringify(data));
    });
  };

  $effect(() => {
    if (!wantsHlsPlayback || hlsRuntimeReady) {
      return;
    }

    let cancelled = false;
    void import('./hls-setup').then(async (mod) => {
      await mod.loadHlsElement();
      if (cancelled) {
        return;
      }
      HlsApi = mod.Hls;
      hlsConfig = mod.createHlsConfig(() => assetFileUrl);
      hlsRuntimeReady = true;
    });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    assetId;
    hlsFallback = false;
    useSameOriginFallback = false;
  });

  $effect(() => {
    if (isCrossOriginMediaBase() && !authManager.isSharedLink && authManager.authenticated) {
      void authManager.ensureMediaSessionKey();
    }
  });

  $effect(() => {
    // reactive on `assetFileUrl` / asset changes
    if (!assetFileUrl || !mediaAuthReady) {
      return;
    }

    const sourceKey = `${assetId}:${assetFileUrl}`;
    const inactive = inactiveBufferIndex;

    if (getBufferLoadedKey(inactive) === sourceKey) {
      const inactiveEl = getBufferEl(inactive);
      if (inactiveEl) {
        inactiveEl.pause();
        bufferIndex = inactive;
        loadedSourceKey = sourceKey;
        hasFocused = false;
        rebuildCount = 0;
        autoplayAttempted = false;
        diagnosticsStart = performance.now();
        diagnostics = createVideoDiagnostics(assetId, resolvedSource.kind);
        diagnostics.preloadStatus = 'buffer-hit';
        wirePlaybackSync(inactiveEl);
        playbackStateManager.applyTo(inactiveEl, isMobileDevice);
        isLoading = !isInstantPlayReady(inactiveEl);
        if (isInstantPlayReady(inactiveEl)) {
          notifyMediaReady();
        }
        void tryAutoplay(inactiveEl);
        return;
      }
    }

    const activeEl = getBufferEl(bufferIndex);
    if (!activeEl) {
      return;
    }

    if (sourceKey === loadedSourceKey && getBufferLoadedKey(bufferIndex) === sourceKey) {
      return;
    }

    releaseSession();
    activeEl.pause();
    loadedSourceKey = sourceKey;
    setBufferLoadedKey(bufferIndex, sourceKey);
    hasFocused = false;
    rebuildCount = 0;
    autoplayAttempted = false;
    diagnosticsStart = performance.now();
    diagnostics = createVideoDiagnostics(assetId, resolvedSource.kind);
    diagnostics.preloadStatus = videoPreloadManager.isReady(assetId) ? 'pool-warm' : 'miss';

    isLoading = true;
    playbackStateManager.applyTo(activeEl, isMobileDevice);
    wirePlaybackSync(activeEl);
    assignSourceToVideo(activeEl, assetFileUrl);
  });

  $effect(() => {
    if (useHlsPlayback || !nextAsset || nextAsset.type !== AssetTypeEnum.Video) {
      return;
    }

    const inactive = inactiveBufferIndex;
    const inactiveEl = getBufferEl(inactive);
    if (!inactiveEl) {
      return;
    }

    const nextSource = resolveVideoSource({
      assetId: nextAsset.id,
      cacheKey: nextAsset.thumbhash,
      playOriginalVideo,
      isMobileDevice,
    });

    if (nextSource.usesHls) {
      return;
    }

    const nextKey = `${nextAsset.id}:${nextSource.url}`;
    if (getBufferLoadedKey(inactive) === nextKey) {
      return;
    }

    setBufferLoadedKey(inactive, nextKey);
    inactiveEl.preload = 'auto';
    inactiveEl.muted = true;
    inactiveEl.src = nextSource.url;
    inactiveEl.load();
  });

  const onPagehide = (event: PageTransitionEvent) => {
    if (!event.persisted) {
      releaseSession();
    }
  };

  $effect(() => {
    window.addEventListener('pagehide', onPagehide);
    return () => window.removeEventListener('pagehide', onPagehide);
  });

  onDestroy(() => {
    clearWaitingTimer();
    playbackSyncCleanup?.();
    releaseSession();
    loadedSourceKey = undefined;
    for (const el of [videoBuffer0, videoBuffer1]) {
      if (!el) {
        continue;
      }
      syncPlaybackFromVideo(el);
      el.pause();
      el.src = '';
      el.load();
    }
  });

  const isActiveVideo = (video: HTMLVideoElement) => video === getBufferEl(bufferIndex);

  const notifyMediaReady = () => {
    onMediaReady?.();
  };

  const handleLoadedMetadata = (event: Event) => {
    const video = event.currentTarget as HTMLVideoElement;
    if (!isActiveVideo(video)) {
      return;
    }
    if (diagnostics && diagnosticsStart) {
      diagnostics.timeToMetadataMs = performance.now() - diagnosticsStart;
    }
    hideLoading();
    notifyMediaReady();
  };

  const handleLoadedData = (event: Event) => {
    const video = event.currentTarget as HTMLVideoElement;
    if (!isActiveVideo(video)) {
      return;
    }
    if (isMobileDevice) {
      hideLoading();
      notifyMediaReady();
    }
  };

  const handleVideoError = () => {
    if (!useSameOriginFallback && isCrossOriginMediaBase()) {
      console.warn('Cross-origin video failed, falling back to same-origin proxy');
      useSameOriginFallback = true;
      loadedSourceKey = undefined;
      return;
    }

    hideLoading();
    notifyMediaReady();
  };

  const tryAutoplay = async (video: HTMLVideoElement) => {
    if (!$autoPlayVideo) {
      hideLoading();
      notifyMediaReady();
      return;
    }

    if (autoplayAttempted) {
      hideLoading();
      notifyMediaReady();
      return;
    }

    autoplayAttempted = true;
    playbackStateManager.applyTo(video, isMobileDevice);

    try {
      await video.play();
      onVideoStarted();
      if (diagnostics && diagnosticsStart) {
        diagnostics.timeToFirstPlayMs = performance.now() - diagnosticsStart;
        diagnostics.bufferedSeconds = getBufferedAhead(video);
        logVideoDiagnostics(diagnostics);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        await tryForceMutedPlay(video);
        return;
      }
    } finally {
      hideLoading();
      notifyMediaReady();
    }
  };

  const assignSourceToVideo = (video: HTMLVideoElement, url: string) => {
    if (isHlsElement(video) && hlsConfig) {
      video.config = hlsConfig;
      video.src = url;
      const el = video;
      queueMicrotask(() => wireHlsListeners(el, assetId));
    } else {
      video.src = url;
      video.load();
    }
  };

  const handleCanPlay = async (video: HTMLVideoElement) => {
    if (!isActiveVideo(video)) {
      return;
    }
    await tryAutoplay(video);
  };

  const handleWaiting = () => {
    if (!videoPlayer?.paused) {
      showLoadingDebounced();
    }
  };

  const handlePlaying = () => {
    hideLoading();
  };

  const handleStalled = () => {
    if (diagnostics) {
      diagnostics.stalledEvents++;
    }
    if (!videoPlayer?.paused) {
      showLoadingDebounced();
    }
  };

  const handleProgress = () => {
    if (diagnostics && videoPlayer) {
      diagnostics.bufferedSeconds = getBufferedAhead(videoPlayer);
    }
  };

  const tryForceMutedPlay = async (video: HTMLVideoElement) => {
    if (video.muted) {
      return;
    }

    try {
      video.muted = true;
      await video.play();
      onVideoStarted();
    } catch {
      // muted auto-play rejected — keep native play button
    }
  };

  const VIDEO_SWIPE_BLOCK =
    'media-control-bar, immich-time-range, media-settings-menu, media-volume-range, .volume-wrapper, media-play-button, media-mute-button, media-fullscreen-button, media-settings-menu-button, media-time-display, .video-mobile-chrome, .mobile-preview-strip, .mobile-preview-strip-host';

  let isSeeking = $state(false);

  const { slideshowState } = slideshowStore;

  const swipeDisabled = $derived(
    assetViewerManager.zoom > 1 ||
      assetViewerManager.isFaceEditMode ||
      assetViewerManager.isShowEditor ||
      $slideshowState !== SlideshowState.None ||
      ocrManager.showOverlay,
  );

  const canStartVideoSwipe = (event: PointerEvent) => {
    if (isSeeking) {
      return false;
    }
    const target = event.target;
    return !(target instanceof Element && target.closest(VIDEO_SWIPE_BLOCK));
  };

  const handleSwipe = (event: SwipeCustomEvent) => {
    if (onSwipe) {
      onSwipe(event);
      return;
    }
    if (event.detail.direction === 'left') {
      onNextAsset();
    } else if (event.detail.direction === 'right') {
      onPreviousAsset();
    } else if (event.detail.direction === 'bottom') {
      onClose();
    }
  };

  const hideChrome = $derived(
    assetViewerManager.isShowDetailPanel || assetViewerManager.isShowEditor || assetViewerManager.isFaceEditMode,
  );

  let containerWidth = $state(0);
  let containerHeight = $state(0);

  $effect(() => {
    if (assetViewerManager.isFaceEditMode) {
      videoPlayer?.pause();
    }
  });

  $effect(() => {
    if (!videoPlayer) {
      return;
    }
    playbackStateManager.applyTo(videoPlayer, isMobileDevice);
    wirePlaybackSync(videoPlayer);
  });

  const onVideoPlaying = (e: Event) => {
    handlePlaying();
    if (hasFocused) {
      return;
    }
    (e.currentTarget as HTMLElement).focus();
    hasFocused = true;
  };

  // The time is only refreshed on HLS fragment decode by default,
  // so manually emit events on seek to update it immediately.
  const onSeeking = (event: Event) => {
    isSeeking = true;
    event.currentTarget?.dispatchEvent(new Event('timeupdate'));
  };

  const onSeeked = () => {
    isSeeking = false;
  };
</script>

<svelte:body
  use:shortcuts={[
    {
      shortcut: { key: ' ' },
      onShortcut: () => (videoPlayer?.paused ? videoPlayer?.play() : videoPlayer?.pause()),
    },
    {
      shortcut: { shift: true, key: 'ArrowLeft' },
      onShortcut: () =>
        videoPlayer ? (videoPlayer.currentTime = Math.max(videoPlayer.currentTime - 0.4, 0)) : undefined,
    },
    {
      shortcut: { shift: true, key: 'ArrowRight' },
      onShortcut: () =>
        videoPlayer
          ? (videoPlayer.currentTime = Math.min(videoPlayer.currentTime + 0.4, videoPlayer.duration))
          : undefined,
    },
  ]}
/>

{#if showVideo}
  <div
    transition:fade={{ duration: motionDuration(assetViewerFadeDuration) }}
    class="relative flex h-full place-content-center place-items-center select-none"
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
  >
    <PhotoSwipeTrack
      currentId={assetId}
      {nextAsset}
      {previousAsset}
      disabled={swipeDisabled}
      canStart={canStartVideoSwipe}
      onSwipe={handleSwipe}
      {onCommitStart}
    >
      <PhotoBlurBackdrop {asset} />
      {#if castManager.isCasting}
        <div class="h-full place-content-center place-items-center">
          <VideoRemoteViewer
            poster={getAssetMediaUrl({ id: assetId, size: AssetMediaSize.Preview, cacheKey })}
            {onVideoStarted}
            {onVideoEnded}
            {assetFileUrl}
          />
        </div>
      {:else}
        <!-- dir=ltr based on https://github.com/videojs/video.js/issues/949 -->
        <media-controller
          dir="ltr"
          lang={$lang}
          nohotkeys
          autohide={isMobileDevice ? 2 : undefined}
          class="dark mx-auto h-full max-w-full touch-pinch-zoom"
          style:aspect-ratio={aspectRatio}
          defaultduration={asset.duration! / 1000}
        >
          {#if useHlsPlayback}
            <hls-video
              bind:this={videoBuffer0}
              slot="media"
              loop={$loopVideoPreference && loopVideo}
              autoplay={$autoPlayVideo}
              muted={playbackStateManager.initialMutedForAutoplay(isMobileDevice)}
              preload={videoPreload}
              disablePictureInPicture
              playsinline
              controlslist="nodownload nofullscreen noremoteplayback"
              class={VIDEO_CLASS}
              onloadedmetadata={handleLoadedMetadata}
              onloadeddata={handleLoadedData}
              onerror={handleVideoError}
              oncanplay={(e: Event) => handleCanPlay(e.currentTarget as HTMLVideoElement)}
              onwaiting={handleWaiting}
              onstalled={handleStalled}
              onprogress={handleProgress}
              onended={onVideoEnded}
              onseeking={onSeeking}
              onseeked={onSeeked}
              onplaying={onVideoPlaying}
              onclose={onClose}
              poster={posterUrl}
            ></hls-video>
          {:else}
            <video
              bind:this={videoBuffer0}
              slot={bufferIndex === 0 ? 'media' : undefined}
              loop={$loopVideoPreference && loopVideo}
              autoplay={$autoPlayVideo}
              muted={playbackStateManager.initialMutedForAutoplay(isMobileDevice)}
              preload={videoPreload}
              disablePictureInPicture
              playsinline
              controlslist="nodownload nofullscreen noremoteplayback"
              class="{VIDEO_CLASS}{bufferIndex === 0 ? '' : ' pointer-events-none fixed h-0 w-0 opacity-0'}"
              onloadedmetadata={handleLoadedMetadata}
              onloadeddata={handleLoadedData}
              onerror={handleVideoError}
              oncanplay={(e) => handleCanPlay(e.currentTarget)}
              onwaiting={handleWaiting}
              onstalled={handleStalled}
              onprogress={handleProgress}
              onended={onVideoEnded}
              onseeking={onSeeking}
              onseeked={onSeeked}
              onplaying={onVideoPlaying}
              onclose={onClose}
              poster={posterUrl}
            ></video>
            <video
              bind:this={videoBuffer1}
              slot={bufferIndex === 1 ? 'media' : undefined}
              loop={$loopVideoPreference && loopVideo}
              autoplay={$autoPlayVideo}
              muted={playbackStateManager.initialMutedForAutoplay(isMobileDevice)}
              preload="auto"
              disablePictureInPicture
              playsinline
              controlslist="nodownload nofullscreen noremoteplayback"
              class="{VIDEO_CLASS}{bufferIndex === 1 ? '' : ' pointer-events-none fixed h-0 w-0 opacity-0'}"
              onloadedmetadata={handleLoadedMetadata}
              onloadeddata={handleLoadedData}
              onerror={handleVideoError}
              oncanplay={(e) => handleCanPlay(e.currentTarget)}
              onwaiting={handleWaiting}
              onstalled={handleStalled}
              onprogress={handleProgress}
              onended={onVideoEnded}
              onseeking={onSeeking}
              onseeked={onSeeked}
              onplaying={onVideoPlaying}
              onclose={onClose}
              poster={posterUrl}
            ></video>
          {/if}

          {#if extendedControls}
            <media-settings-menu hidden anchor="auto" class="min-w-3xs rounded-xl border border-light-300 shadow-sm">
              <Icon slot="checked-indicator" icon={mdiCheck} class="m-2" />
              <media-settings-menu-item class="mx-1 rounded-lg p-1 ps-2">
                {$t('media_chrome.playback_rate')}
                <Icon slot="suffix" icon={mdiChevronRight} class="m-2" />
                <media-playback-rate-menu slot="submenu" hidden rates="0.5 1 1.5 2">
                  <Icon slot="back-icon" icon={mdiChevronLeft} class="m-2" />
                  <span slot="title">{$t('media_chrome.playback_rate')}</span>
                </media-playback-rate-menu>
              </media-settings-menu-item>
              {#if useHlsPlayback}
                <media-settings-menu-item class="mx-1 rounded-lg p-1 ps-2">
                  {$t('video_quality')}
                  <Icon slot="suffix" icon={mdiChevronRight} class="m-2" />
                  <media-rendition-menu slot="submenu" hidden>
                    <Icon slot="back-icon" icon={mdiChevronLeft} class="m-2" />
                    <span slot="title">{$t('video_quality')}</span>
                  </media-rendition-menu>
                </media-settings-menu-item>
              {/if}
            </media-settings-menu>
          {/if}

          {#if !hideChrome}
            <div
              class="video-mobile-chrome flex h-32 w-full flex-col justify-end bg-linear-to-b to-black/80 px-4 mb-[var(--mobile-preview-strip-offset,0px)]"
            >
              <media-control-bar part="bottom" class="flex h-10 w-full gap-2">
                <media-play-button class="shrink-0 rounded-full p-2 outline-none">
                  <Icon slot="play" icon={mdiPlay} />
                  <Icon slot="pause" icon={mdiPause} />
                </media-play-button>
                <media-time-display showduration class="rounded-lg p-2 outline-none"></media-time-display>

                <span class="grow"></span>

                <div class="volume-wrapper shrink-0 rounded-full bg-transparent transition-colors duration-400">
                  <media-volume-range class="h-full bg-none outline-none"></media-volume-range>
                  <media-mute-button class="bg-none p-2 outline-none">
                    <Icon slot="off" icon={mdiVolumeMute} />
                    <Icon slot="low" icon={mdiVolumeLow} />
                    <Icon slot="medium" icon={mdiVolumeMedium} />
                    <Icon slot="high" icon={mdiVolumeHigh} />
                  </media-mute-button>
                </div>

                {#if extendedControls}
                  <media-fullscreen-button class="shrink-0 rounded-full p-2 outline-none">
                    <Icon slot="enter" icon={mdiFullscreen} />
                    <Icon slot="exit" icon={mdiFullscreenExit} />
                  </media-fullscreen-button>
                  <media-settings-menu-button class="shrink-0 rounded-full p-2 outline-none"
                  ></media-settings-menu-button>
                {/if}
              </media-control-bar>
              <immich-time-range class="h-8 w-full rounded-lg px-2 pb-3 outline-none"></immich-time-range>
            </div>
          {/if}
        </media-controller>

        {#if isLoading}
          <div class="absolute flex flex-col items-center gap-2 text-white/80">
            <LoadingSpinner />
            <span class="text-sm">{$t('loading')}</span>
          </div>
        {/if}

        {#if assetViewerManager.isFaceEditMode && videoPlayer}
          <FaceEditor htmlElement={videoPlayer} {containerWidth} {containerHeight} {assetId} />
        {/if}
      {/if}
    </PhotoSwipeTrack>
  </div>
{/if}

<style>
  media-controller {
    --media-control-background: transparent;
    --media-control-hover-background: var(--md-state-on-video-hover);
    --media-focus-box-shadow: 0 0 0 2px var(--md-state-focus-ring);
    --media-font-family: var(--font-sans);
    --media-font-size: var(--md-sys-typescale-label-large-size);
    --media-font-weight: var(--md-sys-typescale-label-large-weight);
    --media-menu-border-radius: var(--md-sys-shape-corner-medium);
    --media-menu-gap: var(--spacing);
    --media-menu-item-hover-background: var(--md-state-on-surface-hover);
    --media-menu-item-icon-height: 1em;
    --media-menu-item-indicator-height: 1em;
    --media-primary-color: #ffffff;
    --media-text-color: rgba(255, 255, 255, 0.92);
    --media-icon-color: #ffffff;
    --media-time-range-buffered-color: color-mix(in srgb, #ffffff 24%, transparent);
    --media-time-range-hover-bottom: 0;
    --media-time-range-hover-height: 100%;
    --media-range-thumb-box-shadow: none;
    --media-range-thumb-opacity: 0;
    --media-range-thumb-transition: opacity 0.15s ease;
    --media-range-track-border-radius: 2px;
    --media-range-track-height: 3.5px;
    --media-range-padding: 0;
    --media-range-track-background: color-mix(in srgb, #ffffff 32%, transparent);
    --media-range-bar-color: var(--md-sys-color-primary);
    --media-range-thumb-background: #ffffff;
    --media-settings-menu-background: var(--md-sys-color-surface-container-high);
    --media-text-content-height: var(--text-base--line-height);
    --media-tooltip-arrow-display: none;
    --media-tooltip-border-radius: var(--md-sys-shape-corner-extra-small);
    --media-tooltip-background-color: var(--md-sys-color-inverse-surface);
    --media-tooltip-distance: 8px;
    --media-tooltip-padding: 6px 10px;
    --media-tooltip-filter: none;
  }

  media-control-bar media-play-button,
  media-control-bar media-mute-button,
  media-control-bar media-fullscreen-button,
  media-control-bar media-settings-menu-button,
  media-control-bar media-time-display {
    border-radius: var(--md-sys-shape-corner-full);
    transition:
      background-color var(--md-motion-duration-short) var(--md-motion-easing-standard),
      transform 150ms var(--md-motion-easing-standard);
  }

  media-time-display {
    font-variant-numeric: tabular-nums;
  }

  immich-time-range,
  media-volume-range {
    --media-control-hover-background: none;
  }

  immich-time-range:hover,
  media-volume-range:hover {
    --media-range-thumb-opacity: 1;
  }

  *::part(tooltip) {
    --media-font-size: var(--md-sys-typescale-label-medium-size);
    --media-text-content-height: var(--md-sys-typescale-label-medium-line-height);
    --media-font-weight: var(--md-sys-typescale-label-medium-weight);
    --media-primary-color: var(--md-sys-color-inverse-on-surface);
    --media-text-color: var(--md-sys-color-inverse-on-surface);
    --media-tooltip-background-color: var(--md-sys-color-inverse-surface);
    color: var(--md-sys-color-inverse-on-surface);
  }

  *[mediavolumeunavailable] {
    --media-volume-range-display: none;
  }

  .volume-wrapper {
    --media-control-hover-background: none;
  }

  .volume-wrapper:hover {
    background-color: var(--md-state-on-video-hover);
  }

  media-volume-range:has(+ media-mute-button) {
    padding: 0;
    margin: 0;
    width: 0;
    overflow: hidden;
    transition: width 0.4s ease-out;
  }

  /* Expand volume control in all relevant states */
  .volume-wrapper:hover > media-volume-range,
  media-volume-range:has(+ media-mute-button:hover),
  media-volume-range:has(+ media-mute-button:focus),
  media-volume-range:has(+ media-mute-button:focus-within),
  media-volume-range:hover,
  media-volume-range:focus,
  media-volume-range:focus-within {
    padding: 0 calc(var(--spacing) * 2);
    margin-left: calc(var(--spacing) * 2);
    width: 70px;
  }

  video::-webkit-media-controls,
  video::-webkit-media-controls-panel,
  video::-webkit-media-controls-timeline,
  video::-webkit-media-controls-enclosure,
  :global(hls-video)::-webkit-media-controls,
  :global(hls-video)::-webkit-media-controls-panel,
  :global(hls-video)::-webkit-media-controls-timeline {
    display: none !important;
    -webkit-appearance: none;
  }
</style>
