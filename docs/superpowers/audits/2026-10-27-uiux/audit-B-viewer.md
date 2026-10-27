# Audit B - Media viewing (viewer, timeline, thumbnails)

Paths are relative to `D:\Personal\Coding\Immich-gallery\immich-ui`. Read-only audit.
Note: `diff` of every file in scope against `upstream/web/src/lib/components/...` returned 0 changed lines, so these overrides are currently identical to upstream. Upstream behaviour is therefore inherited, and the mobile Fluent layer (`branding/src/fluent/viewer.css`, `custom/src/styles/*.css`) is the only place where mobile adaptation exists.

## High

### [High] Detail panel has no mobile/tablet layout - fixed 360px column in a 4-col grid
- Where: overrides/lib/components/asset-viewer/AssetViewer.svelte:777-783 (also :858-860 activity panel)
- Device: mobile (and portrait tablet)
- Evidence: `'row-span-4 row-start-1 overflow-y-auto bg-light ...', showDetailPanel ? 'w-90' : 'w-100'` inside `<section class="fixed ... grid grid-cols-4 ... grid-rows-1">` (:620-622)
- Problem: [Inference] The panel has no `col-start`, so it is auto-placed into an implicit 5th grid column of 360px (editor: 400px = `w-100`). On a 360px phone this leaves ~0px for the media, and on 390-430px only 30-70px. `docs/mobile-asset-viewer.md` does not mention the info panel at all, so no intended mobile behaviour exists. Editor `w-100` (400px) is wider than most phones. Activity panel uses `w-90 md:w-115` (460px at md), also wider than 768px-wide portrait tablet usability allows.
- Fix: when `isMobileViewer`, render the panel as a bottom sheet / full-width overlay: `absolute inset-x-0 bottom-0 z-40 max-h-[85dvh] w-full rounded-t-2xl pb-[env(safe-area-inset-bottom)]` (and `col-span-4`), and keep `w-90`/`w-100` only for desktop. Use `w-full max-w-[min(100vw,23rem)]` for activity/editor on phones.

### [High] Detail panel header is covered by the mobile navbar overlay
- Where: overrides/lib/components/asset-viewer/AssetViewer.svelte:636-638 vs :777
- Device: mobile
- Evidence: `'asset-viewer-navbar--overlay absolute inset-x-0 top-0 z-30'` while the detail panel div has no `z-*`/position
- Problem: [Inference] The overlay navbar (z-30, full width, `inset-x-0`) spans the top 3rem+safe-area over whatever column the panel occupies, so the panel's own title/close button at its top (upstream `DetailPanel.svelte:118-128` `p-2` header) sits under the Close/Share/Info buttons. On mobile the panel's content is also not padded for `--safe-area-inset-top`.
- Fix: give the panel `relative z-40 pt-[env(safe-area-inset-top)]` on mobile or hide the navbar overlay while `showDetailPanel` is open.

## Medium

### [Medium] SwipeBackEdge (z-40, touch-action:none) swallows taps on the left 32px, incl. desktop mouse
- Where: overrides/lib/components/shared-components/SwipeBackEdge.svelte:23-27; rendered unconditionally at AssetViewer.svelte:626
- Device: mobile, tablet, desktop
- Evidence: `inset-block: 64px 0; z-index: 40; width: 32px; touch-action: none;`
- Problem: The strip is not gated by `isMobileViewer`, so on desktop it sits over the left 32px of the previous-asset `NavigationArea` (mouse clicks hit the aria-hidden div). On mobile it covers the left 32px of the filmstrip (z-20, first thumb starts at `px-3`=12px), the video chrome play button (`px-4` + `p-2`, `video-mobile-chrome`), and `touch-action:none` prevents scrolling the strip from the edge. In landscape with a notch the edge is also positioned at viewport x=0, ignoring the `padding-left: env(safe-area-inset-left)` (AssetViewer.svelte:904, absolute children ignore parent padding).
- Fix: render only when `isMobileViewer` (add prop), add `pointer-events` only for `pointer-type: touch` via `@media (pointer: coarse)`, start at `inset-block: calc(3rem + env(safe-area-inset-top)) var(--mobile-preview-strip-offset, 0px)` so it does not cover the filmstrip/video controls, and keep touch-action `pan-y` instead of `none`.

### [Medium] Overlay navbar and strip ignore landscape safe-area insets
- Where: overrides/lib/components/asset-viewer/AssetViewer.svelte:636-638, 795-799, 903-905
- Device: mobile (landscape, notch devices)
- Evidence: `.immich-asset-viewer--mobile { padding-left: env(safe-area-inset-left, 0px); padding-right: ... }` but navbar/strip are `absolute inset-x-0`
- Problem: Absolutely positioned children are laid out against the padding box, so the section's side padding does not apply to them. In landscape on iPhone, the Close button (left) and the kebab/Info buttons (right) sit under the notch/rounded corners. Same for `#stack-slideshow` (:822) and the OCR/activity buttons.
- Fix: put side padding on the elements themselves: `.asset-viewer-navbar--overlay, .mobile-preview-strip-host { padding-inline: max(env(safe-area-inset-left), 0px) ... }` or use `inset-inline: env(safe-area-inset-left) env(safe-area-inset-right)`.

### [Medium] OCR button and activity status collide with the mobile filmstrip / ignore safe-area
- Where: overrides/lib/components/asset-viewer/AssetViewer.svelte:747, 759, 795-799
- Device: mobile
- Evidence: `class="absolute inset-e-0 bottom-0 me-6 mb-6 ..."` (OCR), `me-8 mb-20` (activity), strip host `absolute inset-x-0 bottom-0 z-20`
- Problem: Fixed `mb-6` / `mb-20` do not use `--mobile-preview-strip-offset` (4.5rem + safe-area), so the OCR button (no z-index) is covered by the z-20 filmstrip host and by the bottom home indicator.
- Fix: `style="margin-bottom: calc(var(--mobile-preview-strip-offset, 0px) + 1rem)"` for mobile, plus `z-30`.

### [Medium] Video chrome and scrub bar touch targets below 44px; 44px rule not applied to them
- Where: overrides/lib/components/asset-viewer/VideoNativeViewer.svelte:818-848; branding/src/fluent/viewer.css:36-40
- Device: mobile
- Evidence: `<media-control-bar ... class="flex h-10 ...">`, `<media-play-button class="shrink-0 rounded-full p-2 ...">`, `<immich-time-range class="h-8 w-full ...">`
- Problem: Buttons are 40px tall (icon 24 + p-2) and the seek bar hit-area is 32px; the 44px rule in viewer.css only targets `button`/`[role=toolbar] button`, not `media-*-button` custom elements.
- Fix: `h-11` on control bar, `p-2.5` on buttons, `h-11` on `immich-time-range`; add `body.asset-viewer-open media-controller :is(media-play-button,media-mute-button,media-fullscreen-button,media-settings-menu-button) { min-width:44px; min-height:44px }` inside the coarse media query.

### [Medium] Hover-only thumbnail controls (select checkbox, preview) have no touch equivalent; small targets
- Where: overrides/lib/components/assets/thumbnail/Thumbnail.svelte:465, 487-501, 171-173
- Device: tablet / hybrid, mobile
- Evidence: `{#if !readonly && (mouseOver || selected || selectionCandidate)}` ... `class={['absolute z-2 p-2 ...']}` (24px icon + p-2 = 40px); `{#if mouseOver && onPreview}` ... `p-1.5` + 20px icon = 32px; `onMouseEnter` returns early when `usingMobileDevice`
- Problem: On pointer:coarse devices `mouseOver` never becomes true so the select circle is only reachable via 350ms long-press (undiscoverable), and the preview button never shows. Where visible, targets are 40px / 32px. Both have `tabindex={-1}` so keyboard users cannot reach them either; aria-label "Preview asset" and "Thumbnail URL" (:450, :499) are hard-coded English.
- Fix: show the select button when any asset is selected (selection mode) irrespective of hover; use `p-2.5` (44px); replace hard-coded labels with `$t(...)`; expose via `group-focus-visible` too.

### [Medium] Timeline day-header select toggle is hover-only and not keyboard/touch accessible
- Where: overrides/lib/components/timeline/Month.svelte:81, 89-92
- Device: mobile, tablet, desktop (keyboard)
- Evidence: `onmouseenter={() => (hoveredTimelineDay = ...)}` / `class="w-0 overflow-hidden ..." class:w-8={hoveredTimelineDay === ...}` / `onkeydown={() => onTimelineDaySelect(...)}`
- Problem: The check circle is `w-0` until mouse hover (never on touch). It is a `<div>` with click+keydown (any key triggers) but no `role`, `tabindex` or `aria-label`; when visible it is 32px wide.
- Fix: `<button type="button" aria-label=... aria-pressed=...>` always rendered in select mode (`w-8` when `assetInteraction.selectionActive`), `min-h-11 min-w-11` on coarse pointers.

### [Medium] Grid column cap of 6 and default 4 for all coarse/narrow devices - poor tablet sizing
- Where: overrides/lib/stores/grid-density.svelte.ts:3-5; overrides/lib/utils/mobile-performance.svelte.ts:117-124
- Device: tablet (768-1366px coarse pointer) / narrow desktop windows
- Evidence: `GRID_COLUMNS_MAX = 6; GRID_COLUMNS_DEFAULT = 4` ... `const compact = isNarrowViewport() || isCoarsePointer(); ... rowHeight = (width - gap*(columns-1)) / columns`
- Problem: On an iPad (coarse pointer, 1024px wide) the default 4 columns yields ~254px tiles, max 6 columns ~170px; on 1366px tablets tiles are 340px/220px. The width-agnostic column count produces thumbnails far larger than desktop's 235px row height and wastes bandwidth. Desktop mouse path (non-compact) ignores the density store (rowHeight 235) so a narrow desktop window <768px with mouse jumps to 4 columns at 767px.
- Fix: derive default columns from width, e.g. `Math.max(3, Math.round(width / 110))`, raise `GRID_COLUMNS_MAX` to `8` when `width >= 768`, and store user preference as a delta from the width-based default.

### [Medium] Viewport meta disables user zoom
- Where: upstream/web/src/app.html:10 and (duplicated at runtime) custom/src/hooks.client.ts:43
- Device: mobile
- Evidence: `content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"`
- Problem: Blocks pinch-zoom on every page, including detail panel text and settings (WCAG 1.4.4 resize text). `custom.css:23-27` additionally sets `html, body { touch-action: pan-x pan-y }`. Intended to give the viewer its own pinch, but disables low-vision zoom elsewhere. [Inference] iOS Safari ignores `user-scalable=no` since iOS 10, Android honours it.
- Fix: drop `maximum-scale=1, user-scalable=no`; keep `touch-action: pan-x pan-y` only on `#asset-grid`/viewer (already exists at custom.css:30-32) and rely on `touch-action: pinch-zoom` for the viewer.

### [Medium] Three blurred (48px) full-viewport backdrops stacked in the mobile photo viewer
- Where: overrides/lib/components/asset-viewer/PhotoBlurBackdrop.svelte:20; used in PhotoViewer.svelte:305, PhotoSwipePeek.svelte:22 (x2 via PhotoSwipeTrack.svelte:107-118)
- Device: mobile (perf)
- Evidence: `class="absolute -inset-[22%] saturate-150" style="filter: blur(48px); transform: translateZ(0);"`
- Problem: Current + previous + next asset each render an oversize (144%) layer with `blur(48px)` and `saturate`, plus the dismiss scale/opacity transform on the parent (`will-change-transform`). Only `networkQuality === 'save-data'` disables it, not reduced motion/low-power or `slow`. [Inference] Expensive for GPU memory on low-end Android, may cause jank during swipe.
- Fix: render blur only for the current asset and use thumbhash-only (no `Image`) for peeks; also gate on `networkManager.quality !== 'fast'` / `prefersReducedMotion()`.

## Low

### [Low] Video chrome offset reserved even when no filmstrip is rendered
- Where: overrides/lib/components/asset-viewer/AssetViewer.svelte:903; VideoNativeViewer.svelte:818
- Device: mobile
- Evidence: `--mobile-preview-strip-offset: calc(4.5rem + env(safe-area-inset-bottom, 0px));` / `mb-[var(--mobile-preview-strip-offset,0px)]`
- Problem: Offset is set whenever `.immich-asset-viewer--mobile`, but the strip renders only if `showNavigation && filmstripAssets.length > 1` (or skeleton). Single-item views, shared links without navigation, and the editor leave video controls floating 72px above the bottom; also the real strip height (44 + 6 + 2 = 52px) differs from 4.5rem (72px) leaving a gap (docs say offset should track strip).
- Fix: set the variable only when `showMobilePreviewStrip || showMobilePreviewStripSkeleton`, and compute from `FILMSTRIP_THUMB_SIZE` (`calc(52px + env(safe-area-inset-bottom))`).

### [Low] Stack thumbnails strip and slideshow overlay lack safe-area-bottom and notch handling
- Where: overrides/lib/components/asset-viewer/AssetViewer.svelte:822; SlideshowMetadataOverlay.svelte:51-53
- Device: mobile
- Evidence: `<div id="stack-slideshow" class="absolute bottom-0 col-span-4 ... w-fit max-w-full">`; `class="absolute inset-x-0 bottom-0 z-10"` / `px-6 py-4`
- Problem: Neither adds `env(safe-area-inset-bottom)`; the stack strip is also at `bottom-0` while the filmstrip host is shifted with `mb-16` (:797-799) - fixed 64px not matching thumbnail size; no z-index so it can overlap OCR/chrome.
- Fix: `pb-[env(safe-area-inset-bottom)]` on both; replace `mb-16` with `mb-[calc(var(--stack-strip-height)+...)]`.

### [Low] Filmstrip button hit area is 44px but visual-only affordance: `hover:opacity-90` and no `focus-visible` style
- Where: overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte:~150-155
- Device: desktop-touch laptops / keyboard
- Evidence: `'opacity-70 hover:opacity-90'` on a `<button class="relative shrink-0 overflow-hidden rounded-full ...">`
- Problem: No `focus-visible:ring` for non-current thumbs, strip is only used when `isMobileViewer` but includes touch-laptops with keyboard; `justify-start sm:justify-center` at `sm` means a 13-item strip (13*44+12*6=644px) centres at 640-768 but overflows with `min-w-full` correctly - OK, no overflow problem.
- Fix: add `focus-visible:ring-2 focus-visible:ring-white`.

### [Low] JS smooth scroll ignores `prefers-reduced-motion`
- Where: overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte:46, 108; overrides/lib/components/timeline/Timeline.svelte:~595 (`scrollBy({ behavior: 'smooth' })`)
- Device: all
- Evidence: `scrollCurrentIntoView('smooth')`, `scrollableElement?.scrollBy({ top: amount, behavior: 'smooth' })`
- Problem: Global CSS `scroll-behavior: auto !important` (branding/src/fluent/globals.css:54-61) does not override an explicit JS `behavior: 'smooth'`. Svelte `fly`/`fade` at AssetViewer.svelte:777,858 and Thumbnail.svelte:459-460,497 also do not use `motionDuration()` (PhotoSwipeTrack and VideoNativeViewer do), so they rely only on the CSS override.
- Fix: use `prefersReducedMotion() ? 'auto' : 'smooth'` and `duration: motionDuration(150)`.

### [Low] `MobilePreviewStrip` `aria-label="Filmstrip"` and fallback labels hard-coded English; skeleton items mismatch
- Where: overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte (nav `aria-label="Filmstrip"`, button `aria-label` with "(video, ...)")
- Device: all
- Problem: Not localized (the app uses `$t`), and per-thumb labels fall back to raw `asset.id`.
- Fix: `$t('filmstrip')`, `$t('video')`; fall back to localized "photo N of M".

## Checked, no issue
- AssetViewer.svelte `<section>` uses `fixed ... size-full` (not `100vh`); no `100vh` anywhere in the scope.
- Top-of-viewer overlay uses `padding-top: env(safe-area-inset-top)` and strip uses `padding-bottom: env(safe-area-inset-bottom)` (AssetViewer.svelte:910, 920); landscape + `max-height: 500px` hides strip as docs state.
- PhotoViewer.svelte:105 toggles `touch-action` (`pinch-zoom` at zoom=1, `none` when zoomed) consistent with docs; PhotoSwipeTrack uses `touch-pinch-zoom` + non-passive touchmove guard (swipe-navigate.svelte.ts:63) for iOS; multi-touch resets swipe.
- Swipe-down dismiss/ pinch / double-tap behaviour matches docs table; `lockViewerPageScroll` and `overscroll-behavior: none` present (viewer.css:9-17; custom.css `[data-viewer-content]`).
- AdaptiveImage.svelte / Image.svelte / ImageThumbnail.svelte set explicit width/height or `aspect-square`; Thumbnail container has fixed `width/height` px, so no CLS; thumbhash placeholders and justified layout (GalleryViewer.svelte:90-95) are pre-sized.
- Month/Timeline use `contain`, `content-visibility`, transform-positioned virtualization; transitions disabled on coarse/reduced motion via `shouldUseTimelineTransitions()`.
- Filmstrip thumbs are 44px (preview-layout.ts:13), `touch-pan-x`, `overscroll-x-contain`, shimmer animation has a `prefers-reduced-motion` guard; navbar buttons get 44px min under coarse pointer (viewer.css:36-40).
- Global `prefers-reduced-motion` CSS override exists (globals.css:54, custom.css:53) for CSS transitions/animations.
