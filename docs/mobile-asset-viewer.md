# Mobile Photo / Video Detail Viewer

Fullscreen viewer khi tap ảnh/video trên mobile, UX gần Apple Photos trên iOS. Desktop giữ behavior cũ.

## Phạm vi

- **Mobile:** `pointer: coarse` **hoặc** `max-width: 767px` (`mediaQueryManager.pointerCoarse || mediaQueryManager.maxMd`)
- **Desktop:** mũi tên prev/next, keyboard, zoom wheel, layout grid header 64px — không đổi

## Luồng

```text
Grid → tap → fullscreen viewer (nền đen, media contain)
     → swipe trái/phải / pinch / double-tap / thumbnail
     → video autoplay khi ready
     → swipe xuống → về grid
```

## Layout mobile

- Media chiếm toàn viewport; header overlay phía trên (safe-area notch / Dynamic Island).
- Preview strip tối đa **5** thumbnail: previous 2 + current + next 2. Đầu/cuối list có thể ít hơn.
- Landscape + `max-height: 500px`: ẩn strip, ưu tiên media (`--mobile-preview-strip-offset` chỉ còn safe-area).
- Video controls / progress nằm **trên** strip qua `--mobile-preview-strip-offset`.

## Gesture

`SwipeNavigate` (`overrides/lib/actions/swipe-navigate.svelte.ts`) + `PhotoSwipeTrack`:

| Gesture | Điều kiện | Hành vi |
|---|---|---|
| Swipe left / right | zoom = 1, không seek video | next / previous |
| Swipe down | zoom = 1, không phải swipe ngang | media theo ngón, fade nền, vượt threshold thì đóng |
| Pinch / double-tap | photo | zoom; khi zoom > 1 swipe = pan, không đổi asset |
| Seek / chrome video | target trong `.video-mobile-chrome` | không swipe |

## Video

- Autoplay khi `canplay` (muted trên mobile nếu browser block). Promise rejection được bắt.
- Đổi asset: `pause` video cũ, đổi `src`, load video mới, autoplay khi ready.
- Loading: spinner + `$t('loading')`.
- Tap: media-chrome `autohide` trên mobile, chrome fade khi `userinactive`.

## Scroll lock

`lockViewerPageScroll` / `unlockViewerPageScroll` — `position: fixed` trên `body` khi viewer mở, restore `scrollY` khi đóng. Class `asset-viewer-open` dùng cho CSS `overscroll-behavior`.

## Module chính (overrides)

| File | Vai trò |
|---|---|
| `lib/components/asset-viewer/AssetViewer.svelte` | Shell, ẩn mũi tên desktop trên mobile, overlay header, strip |
| `lib/components/asset-viewer/MobilePreviewStrip.svelte` | 5 thumbnail |
| `lib/components/asset-viewer/preview-layout.ts` | `PREVIEW_STRIP_RADIUS = 2`, `buildPreviewStrip`, `windowPreviewStrip` |
| `lib/components/asset-viewer/PhotoViewer.svelte` | Pinch, double-tap, swipe track |
| `lib/components/asset-viewer/PhotoSwipeTrack.svelte` | Swipe ngang + dismiss scale/fade |
| `lib/components/asset-viewer/VideoNativeViewer.svelte` | Autoplay, chrome, swipe block khi seek |
| `lib/actions/swipe-navigate.svelte.ts` | Gesture engine |
| `lib/utils/viewer-scroll-lock.ts` | Khóa/restore scroll trang |
| `branding/src/fluent/viewer.css` | Body lock CSS, touch target 44px |

Không thêm backend/API.
