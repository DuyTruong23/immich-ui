# Overrides

Mirror cấu trúc `$lib/` upstream để thay component mà không sửa upstream.

## Active overrides

| File | Thay thế |
|---|---|
| `lib/components/shared-components/side-bar/UserSidebar.svelte` | Sidebar với feature flags, ẩn Trash |
| `lib/components/shared-components/side-bar/BottomInfo.svelte` | Ẩn Storage space & Server offline |
| `lib/components/shared-components/side-bar/StorageSpace.svelte` | Sửa dark mode cho Storage space |
| `lib/components/shared-components/search-bar/SearchBar.svelte` | Sửa dark mode cho badge Context trong search bar |
| `lib/components/Image.svelte` | Không abort request thumbnail khi unmount (tránh 204 khi scroll/scrub) |
| `lib/components/assets/thumbnail/Thumbnail.svelte` | Chờ `sessionKey`; `preload={!lazy}` theo `shouldLazyLoadThumbnails()`; giữ thumbhash |
| `lib/components/assets/thumbnail/ImageThumbnail.svelte` | Retry thumbnail có delay (job Immich chưa xong); retry 2 lần trước khi hiện lỗi |
| `lib/components/timeline/Month.svelte` | Tắt `content-visibility` trên mobile (Safari gãy ảnh khi scrub) |
| `lib/components/timeline/UploadListRefresh.svelte` | Sau upload xong: reload timeline, giữ scroll, không đóng viewer |
| `lib/managers/event-manager.svelte.ts` | Event `UploadsComplete` khi batch upload xong |
| `lib/modals/AvatarEditModal.svelte` | Upload avatar trực tiếp thay vì chọn màu chữ cái |
| `lib/components/shared-components/UserAvatar.svelte` | URL avatar kèm `sessionKey` khi media cross-origin |
| `lib/components/layouts/UserPageLayout.svelte` | Navbar upload admin-only; banner thumbnail lỗi trên mobile |
| `lib/components/shared-components/MobileThumbnailHint.svelte` | Dòng alert mobile: ảnh lỗi vẫn bấm xem được |
| `lib/components/shared-components/PwaInstallHint.svelte` | Gợi ý Add to Home Screen, dismiss localStorage, ẩn khi standalone |
| `lib/components/asset-viewer/AssetViewer.svelte` | Ẩn mũi tên prev/next trên mobile; header compact; preview strip dưới media |
| `lib/components/asset-viewer/MobilePreviewStrip.svelte` | Strip vuông bo góc, cuộn ngang, không giới hạn 5 ảnh |
| `lib/components/timeline/TimelineAssetViewer.svelte` | Load ảnh kề cho preview strip |
| `lib/components/shared-components/gallery-viewer/GalleryViewer.svelte` | Cursor + nearby assets cho preview strip |
| `lib/utils/file-uploader.ts` | Upload qua media URL; accept image/*,video/* trên mobile; validate MIME |
| `lib/modals/AssetChangeDateModal.svelte` | Báo lỗi writeback file gốc |
| `lib/modals/AssetSelectionChangeDateModal.svelte` | Báo lỗi writeback file gốc |
| `lib/components/asset-viewer/DetailPanelDescription.svelte` | Báo lỗi writeback file gốc |
| `lib/components/asset-viewer/DetailPanelLocation.svelte` | Báo lỗi writeback file gốc |
| `lib/components/timeline/actions/ChangeDescriptionAction.svelte` | Báo lỗi writeback file gốc |
| `lib/components/timeline/actions/ChangeLocationAction.svelte` | Báo lỗi writeback file gốc |
| `lib/components/asset-viewer/PhotoViewer.svelte` | Vuốt ngang + vuốt xuống đóng; blur backdrop; double-tap zoom |
| `lib/components/asset-viewer/VideoNativeViewer.svelte` | Cùng cử chỉ ảnh; autoplay mobile; progress bar không đè preview strip |
| `lib/components/asset-viewer/VideoWrapperViewer.svelte` | Truyền next/prev + onSwipe xuống video viewer |
| `lib/components/asset-viewer/hls-setup.ts` | hls.js tách chunk, chỉ load trên desktop |
| `lib/components/asset-viewer/PreloadManager.svelte.ts` | Bỏ preload adjacent khi mạng chậm |
| `lib/managers/auth-manager.svelte.ts` | `sessionKey` cho media cross-subdomain; timeout 4s không chặn thumbnail |
| `lib/managers/language-manager.svelte.ts` | Gán `html lang` / `dir` theo locale hệ thống |
| `lib/utils/system-defaults.ts` | Ngôn ngữ mặc định theo máy; theme mặc định `system` |
| `lib/utils/date-format.ts` | Format VN: ngày/tháng/năm, giờ:phút:giây, Tháng năm |
| `lib/utils/timeline-util.ts` | Tiêu đề tháng/ngày timeline theo format VN |
| `lib/utils/date-time.ts` | Khoảng ngày album theo format VN |
| `lib/components/asset-viewer/DetailPanelDate.svelte` | Ngày/giờ chi tiết ảnh theo format VN |
| `lib/managers/timeline-manager/internal/intersection-support.svelte.ts` | Buffer viewport lớn hơn khi đang scrub/scroll |
| `lib/managers/timeline-manager/timeline-day.svelte.ts` | Giữ asset đích trong DOM khi jump-to-date |
| `lib/stores/websocket.ts` | WS trực tiếp tunnel; resume sau bfcache không reload |
| `lib/utils/media-base-url.ts` | Media URL trực tiếp qua `PUBLIC_IMMICH_MEDIA_URL` |
| `lib/utils/server.ts` | Gọi `applyDefaultThemePreference` trước khi init i18n |
| `lib/utils/mobile-performance.svelte.ts` | Network/save-data, layout và buffer mobile (mở rộng khi scrolling) |
| `lib/utils/navigation.ts` | Đóng/đổi ảnh dùng `replaceState` — vuốt back = mũi tên, không reload |
| `lib/utils/mobile-back-navigation.ts` | Intercept popstate/willUnload, đóng viewer SPA |
| `lib/actions/swipe-navigate.svelte.ts` | Vuốt ngang next/back + vuốt xuống đóng; chặn pan-y native trên video |
| `lib/actions/swipe-back.ts` | Gesture vuốt từ mép (LTR/RTL) |
| `lib/components/shared-components/MobileBackGuard.svelte` | Guard back hệ thống trên layout user |
| `lib/components/shared-components/SwipeBackEdge.svelte` | Vùng vuốt back trong asset viewer |
| `lib/services/asset.service.ts` | Favorite ảnh partner + ghi overlay yêu thích chung |
| `lib/components/timeline/actions/FavoriteAction.svelte` | Bulk favorite gồm ảnh partner |

| File (custom routes) | Thay thế |
|---|---|
| `custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/` | Explore URL-sync viewer (`/explore/photos/:id`), back đóng viewer |
| `custom/src/routes/(user)/user-settings/UserSettingsList.svelte` | Ẩn mục settings cho non-admin |
| `custom/src/routes/(user)/user-settings/AppSettings.svelte` | Cảnh báo data usage trên mobile |
| `custom/src/routes/auth/onboarding/OnboardingTheme.svelte` | Thêm lựa chọn theme hệ thống (mặc định) |
| `custom/src/routes/admin/feature-updates/` | Admin tùy chỉnh modal tính năng mới |
| `custom/src/routes/UploadPanel.svelte` | Panel upload full-width trên mobile; emit reload list khi xong |
| `custom/src/components/FeatureUpdatePin.svelte` | Chip What's new + nút `+` upload cho user |
| `custom/src/hooks.client.ts` | bfcache `pageshow`: refresh auth/WS chọn lọc, không reload |
| `custom/src/service-worker/index.ts` | Cache thumbnail `ok` only, key theo `size`+`c` |
| `lib/components/layouts/AdminPageLayout.svelte` | Thêm tab admin **Tính năng cập nhật** |

Alias trong `config/src/vite.integration.ts` (backup). **Thực tế:** `pnpm prepare:custom` merge `overrides/lib/` → `upstream/web/src/lib/`.
