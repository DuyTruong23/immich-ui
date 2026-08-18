#!/usr/bin/env python3
"""Apply mobile-performance patches to upstream files after override merge."""

from __future__ import annotations

import pathlib
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'Cannot find {label}')
    return text.replace(old, new, 1)


def insert_after(text: str, marker: str, insertion: str, label: str) -> str:
    if insertion in text:
        return text
    if marker not in text:
        raise SystemExit(f'Cannot find {label}')
    return text.replace(marker, marker + insertion, 1)


def remove_once(text: str, old: str) -> str:
    if old not in text:
        return text
    return text.replace(old, '', 1)


def patch_timeline(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    if "from '$lib/actions/pinch-grid.svelte'" not in text:
        text = insert_after(
            text,
            "  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';\n",
            "  import { pinchGrid } from '$lib/actions/pinch-grid.svelte';\n"
            "  import { gridDensityManager } from '$lib/stores/grid-density.svelte';\n",
            'Timeline pinch-grid import',
        )
    if "from '$lib/utils/mobile-performance.svelte'" not in text:
        text = insert_after(
            text,
            "  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';\n",
            "  import { getTimelineLayoutOptions, networkManager } from '$lib/utils/mobile-performance.svelte';\n",
            'Timeline mediaQueryManager import',
        )
    density_effect = """  $effect(() => {
    maxMd;
    networkManager.quality;
    gridDensityManager.columns;
    timelineManager.viewportWidth;
    timelineManager.setLayoutOptions(getTimelineLayoutOptions(timelineManager.viewportWidth));
  });
"""
    for old in (
        """  $effect(() => {
    maxMd;
    networkManager.quality;
    timelineManager.setLayoutOptions(getTimelineLayoutOptions());
  });
""",
        """  $effect(() => {
    const layoutOptions = maxMd
      ? {
          rowHeight: 100,
          headerHeight: 32,
        }
      : {
          rowHeight: 235,
          headerHeight: 48,
        };
    timelineManager.setLayoutOptions(layoutOptions);
  });
""",
    ):
        if density_effect in text:
            break
        if old in text:
            text = text.replace(old, density_effect, 1)
            break
    else:
        if density_effect not in text:
            raise SystemExit('Cannot find Timeline layout options')
    if 'use:pinchGrid' not in text:
        text = text.replace(
            "  onscroll={() => (handleTimelineScroll(), timelineManager.updateSlidingWindow(), updateIsScrolling())}\n>",
            "  onscroll={() => (handleTimelineScroll(), timelineManager.updateSlidingWindow(), updateIsScrolling())}\n  use:pinchGrid\n>",
            1,
        )
    text = insert_after(
        text,
        "  import TimelineAssetViewer from '$lib/components/timeline/TimelineAssetViewer.svelte';\n",
        "  import UploadListRefresh from '$lib/components/timeline/UploadListRefresh.svelte';\n",
        'Timeline UploadListRefresh import',
    )
    if '<UploadListRefresh {timelineManager} />' not in text:
        if '<TimelineKeyboardActions\n' not in text:
            raise SystemExit('Cannot find TimelineKeyboardActions')
        text = text.replace(
            '<TimelineKeyboardActions\n',
            '<UploadListRefresh {timelineManager} />\n\n<TimelineKeyboardActions\n',
            1,
        )
    path.write_text(text, encoding='utf-8')


def patch_thumbnail(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = insert_after(
        text,
        "  import { locale, playVideoThumbnailOnHover } from '$lib/stores/preferences.store';\n",
        "  import { networkManager, shouldLazyLoadThumbnails, shouldPlayVideoThumbnailOnHover } from '$lib/utils/mobile-performance.svelte';\n",
        'Thumbnail mobile-performance import',
    )
    text = insert_after(
        text,
        '  let usingMobileDevice = $derived(mediaQueryManager.pointerCoarse);\n',
        '  const lazyThumbnails = $derived.by(() => {\n'
        '    networkManager.quality;\n'
        '    return shouldLazyLoadThumbnails();\n'
        '  });\n'
        '  const allowVideoHover = $derived.by(() => {\n'
        '    networkManager.quality;\n'
        '    return shouldPlayVideoThumbnailOnHover() && $playVideoThumbnailOnHover;\n'
        '  });\n',
        'Thumbnail derived mobile flags',
    )
    if 'preload={!lazyThumbnails}' not in text:
        text = replace_once(
            text,
            '        curve={selected}\n        onComplete={(errored) => {',
            '        curve={selected}\n        preload={!lazyThumbnails}\n        onComplete={(errored) => {',
            'Thumbnail ImageThumbnail preload',
        )
    if 'enablePlayback={mouseOver && allowVideoHover}' not in text:
        text = text.replace(
            'enablePlayback={mouseOver && $playVideoThumbnailOnHover}',
            'enablePlayback={mouseOver && allowVideoHover}',
        )
    path.write_text(text, encoding='utf-8')


def patch_gallery_viewer(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        "  import { TUNABLES } from '$lib/utils/tunables';\n",
        "  import { getTimelineIntersectionExpand, getTimelineLayoutOptions } from '$lib/utils/mobile-performance.svelte';\n",
        'GalleryViewer tunables import',
    )
    text = remove_once(
        text,
        """  const {
    TIMELINE: { INTERSECTION_EXPAND_TOP, INTERSECTION_EXPAND_BOTTOM },
  } = TUNABLES;

""",
    )
    text = replace_once(
        text,
        '      rowHeight: Math.floor(viewport.width) < 850 ? 100 : 235,\n',
        '      rowHeight: getTimelineLayoutOptions().rowHeight,\n',
        'GalleryViewer rowHeight',
    )
    text = replace_once(
        text,
        """    const top = (scrollTop || 0) - slidingWindowOffset - INTERSECTION_EXPAND_TOP;
    const bottom = top + viewport.height + slidingWindowOffset + INTERSECTION_EXPAND_BOTTOM;
""",
        """    const expand = getTimelineIntersectionExpand();
    const top = (scrollTop || 0) - slidingWindowOffset - expand;
    const bottom = top + viewport.height + slidingWindowOffset + expand;
""",
        'GalleryViewer slidingWindow expand',
    )
    path.write_text(text, encoding='utf-8')


def patch_timeline_day(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        "import { TUNABLES } from '$lib/utils/tunables';\n",
        "import { getTimelineIntersectionExpand } from '$lib/utils/mobile-performance.svelte';\n",
        'timeline-day tunables import',
    )
    text = remove_once(
        text,
        """const {
  TIMELINE: { INTERSECTION_EXPAND_TOP, INTERSECTION_EXPAND_BOTTOM },
} = TUNABLES;

""",
    )
    text = replace_once(
        text,
        """    const expandedTop = visibleWindow.top - headerHeight - INTERSECTION_EXPAND_TOP - dayOffset;
    const expandedBottom = visibleWindow.bottom + headerHeight + INTERSECTION_EXPAND_BOTTOM - dayOffset;
""",
        """    const expand = getTimelineIntersectionExpand({ scrolling: manager.scrolling });
    const expandedTop = visibleWindow.top - headerHeight - expand - dayOffset;
    const expandedBottom = visibleWindow.bottom + headerHeight + expand - dayOffset;
""",
        'timeline-day expand usage',
    )
    path.write_text(text, encoding='utf-8')


def patch_utils_target_size(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = insert_after(
        text,
        "import { alwaysLoadOriginalFile, lang } from '$lib/stores/preferences.store';\n",
        "import { getNetworkQuality } from '$lib/utils/mobile-performance.svelte';\n",
        'utils.ts mobile-performance import',
    )
    text = replace_once(
        text,
        """export const targetImageSize = (asset: AssetResponseDto, forceOriginal: boolean) => {
  if (forceOriginal || get(alwaysLoadOriginalFile) || forceUseOriginal(asset)) {
""",
        """export const targetImageSize = (asset: AssetResponseDto, forceOriginal: boolean) => {
  if (!forceOriginal && getNetworkQuality() !== 'fast' && !forceUseOriginal(asset)) {
    return AssetMediaSize.Preview;
  }
  if (forceOriginal || get(alwaysLoadOriginalFile) || forceUseOriginal(asset)) {
""",
        'utils.ts targetImageSize',
    )
    path.write_text(text, encoding='utf-8')


def patch_app_html(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        '<html class="dark">',
        '<html>',
        'app.html default html class',
    )
    text = replace_once(
        text,
        """    <script>
      try {
        const preference = JSON.parse(localStorage.getItem('immich-ui-theme'));
        const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
        if (preference === 'light' || (preference !== 'dark' && !prefersDark)) {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      } catch {
        // noop
      }
    </script>""",
        """    <script>
      try {
        const rawTheme = localStorage.getItem('immich-ui-theme');
        let preference = null;
        if (rawTheme) {
          preference = JSON.parse(rawTheme);
          if (preference && typeof preference === 'object') {
            preference = preference.system ? 'system' : preference.value;
          }
        }
        const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
        const useDark =
          preference === 'dark' || ((preference === 'system' || preference == null) && prefersDark);
        document.documentElement.classList.add(useDark ? 'dark' : 'light');
        const lang = localStorage.getItem('lang');
        if (lang) {
          document.documentElement.lang = String(lang).split('_').join('-');
        }
      } catch {
        try {
          document.documentElement.classList.add(
            globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          );
        } catch {
          document.documentElement.classList.add('dark');
        }
      }
    </script>""",
        'app.html system theme FOUC',
    )
    locked_viewport = (
        '<meta\n'
        '      name="viewport"\n'
        '      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"\n'
        '    />'
    )
    if locked_viewport not in text:
        text = text.replace(
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
            locked_viewport,
            1,
        )
    text = replace_once(
        text,
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />',
        locked_viewport + '\n'
        '    <meta name="mobile-web-app-capable" content="yes" />\n'
        '    <meta name="apple-mobile-web-app-capable" content="yes" />\n'
        '    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
        'app.html viewport',
    )
    text = replace_once(
        text,
        """      #stencil {
        --stencil-width: 150px;
        display: flex;
        width: var(--stencil-width);
        margin-left: auto;
        margin-right: auto;
        margin-top: calc(50vh - var(--stencil-width) / 2);
        margin-bottom: 100vh;
        place-items: center;
        justify-content: center;
        overflow: hidden;
        visibility: hidden;
        animation:
          0s linear 0.3s forwards delayedVisibility,
          loadspin 8s linear infinite;
      }""",
        """      html:has(#stencil),
      html:has(#stencil) body {
        overflow: hidden;
        height: 100%;
      }

      #stencil {
        --stencil-width: 150px;
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        margin: 0;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        visibility: hidden;
        animation: 0s linear 0.3s forwards delayedVisibility;
      }

      #stencil svg {
        width: var(--stencil-width);
        height: auto;
        animation: loadspin 8s linear infinite;
      }""",
        'app.html stencil loading scroll fix',
    )
    path.write_text(text, encoding='utf-8')


def patch_preferences_system_language(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        "import { defaultLang } from '$lib/constants';\n"
        "import { convertBCP47, getPreferredLocale } from '$lib/utils/i18n';\n",
        "import { convertBCP47 } from '$lib/utils/i18n';\n"
        "import { resolveDefaultLanguage } from '$lib/utils/system-defaults';\n",
        'preferences.store language imports',
    )
    text = replace_once(
        text,
        "const preferredLocale = browser ? getPreferredLocale() : undefined;\n"
        "export const lang = persisted<string>('lang', preferredLocale || defaultLang.code, {\n",
        "export const lang = persisted<string>('lang', resolveDefaultLanguage(), {\n",
        'preferences.store default language',
    )
    path.write_text(text, encoding='utf-8')


def patch_layout_head(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    extra = (
        '  <meta name="apple-mobile-web-app-title" content="Photos" />\n'
        '  <meta name="format-detection" content="telephone=no" />\n'
    )
    if 'apple-mobile-web-app-title' in text:
        return
    text = replace_once(
        text,
        '  <link rel="manifest" href="/manifest.json" crossorigin="use-credentials" />\n',
        '  <link rel="manifest" href="/manifest.json" crossorigin="use-credentials" />\n' + extra,
        '+layout.svelte PWA meta',
    )
    path.write_text(text, encoding='utf-8')


def patch_thumbnail_media_auth(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    if 'const thumbnailUrl = $derived.by' in text:
        return
    text = insert_after(
        text,
        "  import { getAssetMediaUrl, getAssetPlaybackUrl } from '$lib/utils';\n",
        "  import { isCrossOriginMediaBase } from '$lib/utils/media-base-url';\n",
        'Thumbnail media-base-url import',
    )
    text = insert_after(
        text,
        '  const allowVideoHover = $derived.by(() => {\n'
        '    networkManager.quality;\n'
        '    return shouldPlayVideoThumbnailOnHover() && $playVideoThumbnailOnHover;\n'
        '  });\n',
        '  const mediaAuthReady = $derived(\n'
        '    !isCrossOriginMediaBase() || authManager.isSharedLink || \'sessionKey\' in authManager.params,\n'
        '  );\n'
        '  const thumbnailUrl = $derived.by(() => {\n'
        '    if (!mediaAuthReady) {\n'
        '      return;\n'
        '    }\n\n'
        '    return getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Thumbnail, cacheKey: asset.thumbhash });\n'
        '  });\n'
        '  const playbackUrl = $derived.by(() => {\n'
        '    if (!mediaAuthReady) {\n'
        '      return;\n'
        '    }\n\n'
        '    return getAssetPlaybackUrl({ id: asset.id, cacheKey: asset.thumbhash });\n'
        '  });\n'
        '  const livePhotoPlaybackUrl = $derived.by(() => {\n'
        '    if (!mediaAuthReady || !asset.livePhotoVideoId) {\n'
        '      return;\n'
        '    }\n\n'
        '    return getAssetPlaybackUrl({ id: asset.livePhotoVideoId, cacheKey: asset.thumbhash });\n'
        '  });\n'
        '  const gifUrl = $derived.by(() => {\n'
        '    if (!mediaAuthReady) {\n'
        '      return;\n'
        '    }\n\n'
        '    return getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Original, cacheKey: asset.thumbhash });\n'
        '  });\n\n'
        '  $effect(() => {\n'
        '    if (isCrossOriginMediaBase() && !authManager.isSharedLink && authManager.authenticated) {\n'
        '      void authManager.ensureMediaSessionKey();\n'
        '    }\n'
        '  });\n\n',
        'Thumbnail media auth derived',
    )
    text = replace_once(
        text,
        """      <ImageThumbnail
        class={['absolute group-focus-visible:rounded-lg', { 'rounded-xl': selected }, imageClass]}
        brokenAssetClass={['z-1 absolute group-focus-visible:rounded-lg', selected && 'rounded-2xl', brokenAssetClass]}
        url={getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Thumbnail, cacheKey: asset.thumbhash })}
        altText={$getAltText(asset)}
        widthStyle="{width}px"
        heightStyle="{height}px"
        curve={selected}
        preload={!lazyThumbnails}
        onComplete={(errored) => {
          const rect = element?.getBoundingClientRect();
          skipFade = !rect || rect.bottom < 0 || rect.top > window.innerHeight;
          loaded = true;
          thumbError = errored;
        }}
      />
      {#if asset.isVideo}
        <div class="pointer-events-none absolute size-full group-focus-visible:rounded-lg">
          <VideoThumbnail
            class="group-focus-visible:rounded-lg"
            url={getAssetPlaybackUrl({ id: asset.id, cacheKey: asset.thumbhash })}
""",
        """      {#if thumbnailUrl}
        <ImageThumbnail
          class={['absolute group-focus-visible:rounded-lg', { 'rounded-xl': selected }, imageClass]}
          brokenAssetClass={['z-1 absolute group-focus-visible:rounded-lg', selected && 'rounded-2xl', brokenAssetClass]}
          url={thumbnailUrl}
          altText={$getAltText(asset)}
          widthStyle="{width}px"
          heightStyle="{height}px"
          curve={selected}
          preload={!lazyThumbnails}
          onComplete={(errored) => {
            const rect = element?.getBoundingClientRect();
            skipFade = !rect || rect.bottom < 0 || rect.top > window.innerHeight;
            loaded = true;
            thumbError = errored;
          }}
        />
      {/if}
      {#if asset.isVideo && playbackUrl}
        <div class="pointer-events-none absolute size-full group-focus-visible:rounded-lg">
          <VideoThumbnail
            class="group-focus-visible:rounded-lg"
            url={playbackUrl}
""",
        'Thumbnail media auth markup',
    )
    text = replace_once(
        text,
        """      {:else if asset.isImage && asset.livePhotoVideoId}
        <div class="pointer-events-none absolute size-full group-focus-visible:rounded-lg">
          <VideoThumbnail
            class="group-focus-visible:rounded-lg"
            url={getAssetPlaybackUrl({ id: asset.livePhotoVideoId, cacheKey: asset.thumbhash })}
""",
        """      {:else if asset.isImage && asset.livePhotoVideoId && livePhotoPlaybackUrl}
        <div class="pointer-events-none absolute size-full group-focus-visible:rounded-lg">
          <VideoThumbnail
            class="group-focus-visible:rounded-lg"
            url={livePhotoPlaybackUrl}
""",
        'Thumbnail live photo media auth',
    )
    text = replace_once(
        text,
        """      {:else if asset.isImage && asset.duration && mouseOver}
        <!-- GIF -->
        <div class="pointer-events-none absolute size-full">
          <ImageThumbnail
            class={imageClass}
            {brokenAssetClass}
            url={getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Original, cacheKey: asset.thumbhash })}
""",
        """      {:else if asset.isImage && asset.duration && mouseOver && gifUrl}
        <!-- GIF -->
        <div class="pointer-events-none absolute size-full">
          <ImageThumbnail
            class={imageClass}
            {brokenAssetClass}
            url={gifUrl}
""",
        'Thumbnail gif media auth',
    )
    path.write_text(text, encoding='utf-8')


def patch_image_thumbnail_reset(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = insert_after(
        text,
        '  let loaded = $state(false);\n  let errored = $state(false);\n',
        '\n  $effect(() => {\n    url;\n    loaded = false;\n    errored = false;\n  });\n',
        'ImageThumbnail url reset effect',
    )
    text = replace_once(
        text,
        """{:else}
  <Image
    src={url}
""",
        """{:else}
  {#key url}
    <Image
      src={url}
""",
        'ImageThumbnail key url open',
    )
    text = replace_once(
        text,
        """    fetchpriority={preload ? 'high' : 'low'}
  />
{/if}
""",
        """    fetchpriority={preload ? 'high' : 'low'}
    />
  {/key}
{/if}
""",
        'ImageThumbnail key url close',
    )
    path.write_text(text, encoding='utf-8')


def patch_force_compressed_media(web: pathlib.Path) -> None:
    preferences = web / 'src/lib/stores/preferences.store.ts'
    text = preferences.read_text(encoding='utf-8')
    text = insert_after(
        text,
        "export const showDeleteModal = persisted<boolean>('delete-confirm-dialog', true, {});\n",
        """
if (browser) {
  localStorage.setItem('always-load-original-file', 'false');
  localStorage.setItem('always-load-original-video', 'false');
}

""",
        'preferences force original media off',
    )
    preferences.write_text(text, encoding='utf-8')

    navbar = web / 'src/lib/components/asset-viewer/AssetViewerNavBar.svelte'
    text = navbar.read_text(encoding='utf-8')
    text = replace_once(
        text,
        """  const PlayOriginalVideo: ActionItem = $derived({
    title: isPlayingOriginalVideo ? $t('play_transcoded_video') : $t('play_original_video'),
    icon: mdiVideoOutline,
    $if: () => asset.type === AssetTypeEnum.Video,
""",
        """  const PlayOriginalVideo: ActionItem = $derived({
    title: isPlayingOriginalVideo ? $t('play_transcoded_video') : $t('play_original_video'),
    icon: mdiVideoOutline,
    $if: () => false,
""",
        'hide play original video action',
    )
    navbar.write_text(text, encoding='utf-8')

    viewer = web / 'src/lib/components/asset-viewer/AssetViewer.svelte'
    text = viewer.read_text(encoding='utf-8')
    text = replace_once(
        text,
        '  let isPlayingOriginalVideo = $state($alwaysLoadOriginalVideo);\n',
        '  let isPlayingOriginalVideo = $state(false);\n',
        'AssetViewer force transcoded video',
    )
    viewer.write_text(text, encoding='utf-8')


def patch_auth_manager_media_session(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = remove_once(
        text,
        """      AuthLogin: (user) => {
        if (isCrossOriginMediaBase() && user.accessToken) {
          this.#mediaSessionKey = user.accessToken;
        }
      },
""",
    )
    text = replace_once(
        text,
        """  async load() {
    if (authManager.authenticated) {
      return;
    }
""",
        """  async load() {
    if (authManager.authenticated) {
      await this.ensureMediaSessionKey();
      return;
    }
""",
        'auth-manager ensure media session on load',
    )
    path.write_text(text, encoding='utf-8')


def patch_asset_viewer_swipe_back(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = insert_after(
        text,
        "  import SlideshowMetadataOverlay from './SlideshowMetadataOverlay.svelte';\n",
        "  import SwipeBackEdge from '$lib/components/shared-components/SwipeBackEdge.svelte';\n",
        'AssetViewer SwipeBackEdge import',
    )
    text = replace_once(
        text,
        """  bind:this={assetViewerHtmlElement}
>
  <!-- Top navigation bar -->
""",
        """  bind:this={assetViewerHtmlElement}
>
  <SwipeBackEdge
    onBack={closeViewer}
    enabled={$slideshowState === SlideshowState.None && !assetViewerManager.isShowEditor && !assetViewerManager.isFaceEditMode}
  />
  <!-- Top navigation bar -->
""",
        'AssetViewer SwipeBackEdge markup',
    )
    if "event.detail.direction === 'bottom'" not in text:
        text = text.replace(
            """    if (event.detail.direction === 'left') {
      navigateAsset('next');
    } else if (event.detail.direction === 'right') {
      navigateAsset('previous');
    }
""",
            """    if (event.detail.direction === 'left') {
      navigateAsset('next');
    } else if (event.detail.direction === 'right') {
      navigateAsset('previous');
    } else if (event.detail.direction === 'bottom') {
      closeViewer();
    }
""",
        )
    if 'nextAsset={cursor.nextAsset}' not in text:
        text = text.replace(
            '        playOriginalVideo={isPlayingOriginalVideo}\n',
            '        playOriginalVideo={isPlayingOriginalVideo}\n'
            '        nextAsset={cursor.nextAsset}\n'
            '        previousAsset={cursor.previousAsset}\n'
            '        {onSwipe}\n',
        )
    path.write_text(text, encoding='utf-8')


def patch_viewport_dvh(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    updated = text.replace('100vh', '100dvh')
    if updated == text:
        return
    path.write_text(updated, encoding='utf-8')


def patch_user_layout_back_guard(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = insert_after(
        text,
        "  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';\n",
        "  import MobileBackGuard from '$lib/components/shared-components/MobileBackGuard.svelte';\n",
        'user layout MobileBackGuard import',
    )
    text = replace_once(
        text,
        """<div class:display-none={assetViewerManager.isViewing}>
  {@render children?.()}
</div>
<UploadCover />
""",
        """<MobileBackGuard />
<div class:display-none={assetViewerManager.isViewing}>
  {@render children?.()}
</div>
<UploadCover />
""",
        'user layout MobileBackGuard markup',
    )
    path.write_text(text, encoding='utf-8')


def patch_timeline_manager_refresh(path: pathlib.Path) -> None:
    text = path.read_text(encoding='utf-8')
    upsert = """        if (assets.length > 0) {
          this.upsertAssets(assets.map((asset) => toTimelineAsset(asset)));
        }
"""
    upsert_with_refresh = """        if (assets.length > 0) {
          this.upsertAssets(assets.map((asset) => toTimelineAsset(asset)));
          void this.#refreshUploadedThumbnails(assetIds);
        }
"""
    thumbnail_poll = """
  async #refreshUploadedThumbnails(assetIds: string[]) {
    const pending = new Set(assetIds);
    for (const delay of [2500, 5000, 10_000]) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (pending.size === 0) {
        return;
      }

      const assets = (
        await Promise.all([...pending].map((id) => getAssetInfo({ ...authManager.params, id }).catch(() => null)))
      ).filter((asset): asset is AssetResponseDto => !!asset);
      const ready = assets.filter((asset) => Boolean(asset.thumbhash));
      if (ready.length === 0) {
        continue;
      }

      this.upsertAssets(ready.map((asset) => toTimelineAsset(asset)));
      for (const asset of ready) {
        pending.delete(asset.id);
      }
    }
  }

"""
    if '#refreshUploadedThumbnails' not in text and upsert in text:
        text = text.replace(upsert, upsert_with_refresh, 1)
        marker = "  async #syncMonthsFromBuckets() {\n"
        if marker in text:
            text = text.replace(marker, thumbnail_poll + marker, 1)
        path.write_text(text, encoding='utf-8')
        return

    if 'async refreshAfterUpload(' in text:
        return
    marker = """    this.albumAssets.clear();
    this.updateViewportGeometry(false);
  }

  async updateOptions(options: TimelineManagerOptions) {
"""
    insertion = """    this.albumAssets.clear();
    this.updateViewportGeometry(false);
  }

  async refreshAfterUpload(assetIds: string[] = []) {
    if (!this.isInitialized) {
      return;
    }

    const scrollTop = this.scrollTop;
    const keepTop = scrollTop < 80;
    const anchor = this.viewportTopMonthIntersection;
    const anchorKey = anchor?.month
      ? `${anchor.month.yearMonth.year}-${anchor.month.yearMonth.month}`
      : undefined;
    const anchorRatio = anchor?.viewportTopRatioInMonth ?? 0;

    this.suspendTransitions = true;
    try {
      await this.#syncMonthsFromBuckets();

      if (assetIds.length > 0) {
        const assets = (
          await Promise.all(assetIds.map((id) => getAssetInfo({ ...authManager.params, id }).catch(() => null)))
        ).filter((asset): asset is AssetResponseDto => !!asset);
        if (assets.length > 0) {
          this.upsertAssets(assets.map((asset) => toTimelineAsset(asset)));
        }
      }

      for (const month of this.months) {
        if (!month.isLoaded && month.getFirstAsset()) {
          month.timelineDays = [];
          await month.loader?.reset();
        }
      }

      this.updateViewportGeometry(true);
      this.#createScrubberMonths();

      if (keepTop) {
        this.scrollTo(0);
        return;
      }

      const month = anchorKey
        ? this.months.find((item) => `${item.yearMonth.year}-${item.yearMonth.month}` === anchorKey)
        : undefined;
      this.scrollTo(month ? month.top + anchorRatio * month.height : scrollTop);
    } finally {
      this.suspendTransitions = false;
    }
  }

  async #syncMonthsFromBuckets() {
    const timebuckets = await getTimeBuckets({
      ...authManager.params,
      ...this.#options,
    });

    const existingByKey = new Map(
      this.months.map((month) => [`${month.yearMonth.year}-${month.yearMonth.month}`, month] as const),
    );

    this.months = timebuckets.map((timeBucket) => {
      const date = new SvelteDate(timeBucket.timeBucket);
      const yearMonth = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
      const key = `${yearMonth.year}-${yearMonth.month}`;
      return (
        existingByKey.get(key) ??
        new TimelineMonth(this, yearMonth, timeBucket.count, false, this.#options.order, this.#options.orderBy)
      );
    });
  }

  async updateOptions(options: TimelineManagerOptions) {
"""
    if marker not in text:
        raise SystemExit('Cannot find timeline-manager updateOptions insertion point')
    path.write_text(text.replace(marker, insertion, 1), encoding='utf-8')


def override_exists(root: pathlib.Path, relative: str) -> bool:
    return (root / 'overrides/lib' / relative).is_file()


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    web = root / 'upstream/web'
    patch_timeline(web / 'src/lib/components/timeline/Timeline.svelte')

    # Keep timeline thumbnails on override Image/Thumbnail; video-detail tweaks live in overrides.
    print('==> Skip Thumbnail/ImageThumbnail patches (overrides handle media auth + scroll-to-date thumbs)')

    if override_exists(root, 'managers/auth-manager.svelte.ts'):
        print('==> Skip auth-manager patch (override present)')
    else:
        patch_auth_manager_media_session(web / 'src/lib/managers/auth-manager.svelte.ts')

    if override_exists(root, 'components/shared-components/gallery-viewer/GalleryViewer.svelte'):
        print('==> Skip GalleryViewer patch (override present)')
    else:
        patch_gallery_viewer(web / 'src/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte')
    if override_exists(root, 'managers/timeline-manager/timeline-day.svelte.ts'):
        print('==> Skip timeline-day patch (override present)')
    else:
        patch_timeline_day(web / 'src/lib/managers/timeline-manager/timeline-day.svelte.ts')
    patch_utils_target_size(web / 'src/lib/utils.ts')
    patch_force_compressed_media(web)
    if override_exists(root, 'stores/preferences.store.ts'):
        print('==> Skip preferences.store language patch (override present)')
    else:
        patch_preferences_system_language(web / 'src/lib/stores/preferences.store.ts')
    patch_app_html(web / 'src/app.html')
    patch_layout_head(web / 'src/routes/+layout.svelte')
    if override_exists(root, 'components/asset-viewer/AssetViewer.svelte'):
        print('==> Skip AssetViewer swipe-back patch (override present)')
    else:
        patch_asset_viewer_swipe_back(web / 'src/lib/components/asset-viewer/AssetViewer.svelte')
    if override_exists(root, 'managers/timeline-manager/timeline-manager.svelte.ts'):
        print('==> Skip timeline-manager refresh patch (override present)')
    else:
        patch_timeline_manager_refresh(web / 'src/lib/managers/timeline-manager/timeline-manager.svelte.ts')
    patch_user_layout_back_guard(web / 'src/routes/(user)/+layout.svelte')
    patch_viewport_dvh(web / 'src/routes/(user)/memory/[[photos=photos]]/[[assetId=id]]/MemoryViewer.svelte')
    patch_viewport_dvh(web / 'src/lib/components/asset-viewer/editor/transform-tool/CropArea.svelte')


if __name__ == '__main__':
    main()
