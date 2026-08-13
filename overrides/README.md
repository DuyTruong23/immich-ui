# Overrides

Mirror cấu trúc `$lib/` upstream để thay component mà không sửa upstream.

## Active overrides

| File | Thay thế |
|---|---|
| `lib/components/shared-components/side-bar/UserSidebar.svelte` | Sidebar với feature flags, ẩn Trash |
| `lib/components/shared-components/side-bar/BottomInfo.svelte` | Ẩn Storage space & Server offline |
| `lib/components/shared-components/side-bar/StorageSpace.svelte` | Sửa dark mode cho Storage space |
| `lib/components/shared-components/search-bar/SearchBar.svelte` | Sửa dark mode cho badge Context trong search bar |
| `lib/modals/AvatarEditModal.svelte` | Upload avatar trực tiếp thay vì chọn màu chữ cái |
| `lib/components/layouts/UserPageLayout.svelte` | Ẩn nút Upload trên navbar |
| `lib/components/asset-viewer/VideoNativeViewer.svelte` | Mobile preload, HLS lazy-load, cross-origin fallback |
| `lib/components/asset-viewer/hls-setup.ts` | hls.js tách chunk, chỉ load trên desktop |
| `lib/components/asset-viewer/PreloadManager.svelte.ts` | Bỏ preload adjacent khi mạng chậm |
| `lib/components/assets/thumbnail/VideoThumbnail.svelte` | `preload="none"` cho hover preview |
| `lib/components/assets/thumbnail/ImageThumbnail.svelte` | `decoding=async`, fetchpriority |
| `lib/managers/auth-manager.svelte.ts` | `sessionKey` cho media cross-subdomain |
| `lib/managers/timeline-manager/internal/intersection-support.svelte.ts` | Buffer viewport nhỏ hơn trên mobile |
| `lib/utils/media-base-url.ts` | Media URL trực tiếp qua `PUBLIC_IMMICH_MEDIA_URL` |
| `lib/utils/mobile-performance.svelte.ts` | Network/save-data, layout và buffer mobile |

| File (custom routes) | Thay thế |
|---|---|
| `custom/src/routes/(user)/user-settings/UserSettingsList.svelte` | Ẩn mục settings cho non-admin |
| `custom/src/routes/(user)/user-settings/AppSettings.svelte` | Cảnh báo data usage trên mobile |
| `custom/src/service-worker/index.ts` | Cache thumbnail cross-origin |

Alias trong `config/src/vite.integration.ts` (backup). **Thực tế:** `pnpm prepare:custom` merge `overrides/lib/` → `upstream/web/src/lib/`.
