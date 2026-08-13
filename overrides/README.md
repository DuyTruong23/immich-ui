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
| `lib/components/asset-viewer/VideoNativeViewer.svelte` | `preload="metadata"`, HLS xhrSetup cross-origin |
| `lib/components/assets/thumbnail/VideoThumbnail.svelte` | `preload="none"` cho hover preview |
| `lib/utils/media-base-url.ts` | Media URL trực tiếp qua `PUBLIC_IMMICH_MEDIA_URL` |

| File (custom routes) | Thay thế |
|---|---|
| `custom/src/routes/(user)/user-settings/UserSettingsList.svelte` | Ẩn mục settings cho non-admin |

Alias trong `config/src/vite.integration.ts` (backup). **Thực tế:** `pnpm prepare:custom` merge `overrides/lib/` → `upstream/web/src/lib/`.
