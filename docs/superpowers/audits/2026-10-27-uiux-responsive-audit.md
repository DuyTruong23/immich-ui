# Audit UI/UX responsive — 2026-10-27

Phạm vi: `custom/`, `overrides/`, `branding/` (không audit `upstream/` trực tiếp). Phương pháp: đọc code tĩnh bằng 4 agent song song + controller kiểm lại các mục High. **Chưa chạy app trên thiết bị/trình duyệt** — các mục gắn `[Inference]` cần kiểm trên máy thật.

Tổng: **73 finding** — 5 High, 33 Medium, 35 Low. Báo cáo chi tiết (có `path:line` + snippet) ở [2026-10-27-uiux/](2026-10-27-uiux/):

| File | Khu vực | High | Med | Low |
|---|---|---|---|---|
| [audit-A-shell.md](2026-10-27-uiux/audit-A-shell.md) | Layout, nav, sidebar, bottom nav, search bar | 0 | 5 | 10 |
| [audit-B-viewer.md](2026-10-27-uiux/audit-B-viewer.md) | Asset viewer, timeline, thumbnail | 2 | 8 | 5 |
| [audit-C-pages.md](2026-10-27-uiux/audit-C-pages.md) | Trang custom (login, albums, dashboard, admin, upload) | 2 | 12 | 12 |
| [audit-D-tokens.md](2026-10-27-uiux/audit-D-tokens.md) | Modal, form, token theme, contrast | 1 | 8 | 8 |

Ghi chú: agent B diff các override viewer/timeline với upstream → 0 dòng khác, nên lỗi khu vực B là hành vi kế thừa upstream; phần mobile tùy biến nằm ở `branding/src/fluent/viewer.css` và `custom/src/styles/*.css`.

## High — đã kiểm lại

| # | Vấn đề | Vị trí | Thiết bị | Trạng thái |
|---|---|---|---|---|
| H1 | Upload panel mobile nằm dưới cụm FAB: cùng `bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem)`, panel `z-60` + `inset-x-3`, FAB `z-index: 80` → FAB che phần phải panel/bubble | `custom/src/routes/UploadPanel.svelte:77-79`, `custom/src/styles/mobile-shell.css:128-138`, `custom/src/components/FeatureUpdatePin.svelte:159-163` | mobile | Xác minh trong code |
| H2 | Detail panel không có layout mobile/tablet: cột cố định `w-90` (360px) / editor `w-100` trong `grid-cols-4`; `viewer.css` không override kích thước | `overrides/lib/components/asset-viewer/AssetViewer.svelte:620,778-782` | mobile, tablet dọc | Xác minh code; hiển thị thực tế `[Inference]` |
| H3 | Navbar overlay mobile (`z-30`, full width) che header/nút đóng của detail panel | xem audit-B | mobile | `[Inference]` — cần test máy |
| H4 | Chặn pinch-zoom toàn trang: `touch-action: pan-x pan-y` trên `html, body` + upstream `maximum-scale=1, user-scalable=no` (vi phạm WCAG 1.4.4) | `custom/src/styles/custom.css:22-26`, `upstream/web/src/app.html:10` | mobile | **Cố ý** (comment trong code) — cần quyết định |
| H5 | Login: `readonly` mở khóa sau 200ms khi focus (chống autofill) có thể làm iOS không bật bàn phím ở lần chạm đầu | `custom/src/routes/auth/login/+page.svelte:63-73,394-395,421-423` | iOS | `[Inference]`; cơ chế chống autofill là **cố ý** |

## Nhóm sửa đề xuất (theo ưu tiên)

1. **Va chạm phần tử fixed (mobile)** — H1; upload panel full-width trên iPad (`isMobilePanel` theo pointer coarse); bubble thiếu `aria-label`; OCR button/activity status bị filmstrip che.
2. **Viewer mobile/tablet** — H2, H3; `SwipeBackEdge` (`z-40`, `touch-action:none`, 32px) render cả desktop, nuốt click mép trái; navbar/filmstrip `absolute inset-x-0` bỏ qua safe-area ngang; video controls 40px, seek bar 32px.
3. **Touch target < 44px** — header mobile (language/theme), hamburger admin 32px, sidebar item 36px (`!important`), person-filter 36px `!important` đè rule coarse 44px, checkbox row hit-area ~20px, DateInput calendar 20px + `tabindex=-1`, nút xóa shared-favorites 32px; rule toàn cục `min-height:44px` làm nút tròn thành oval.
4. **Hover-only trên touch** — checkbox chọn/preview thumbnail, toggle chọn theo ngày (div không role/tabindex), tooltip avatar.
5. **Landscape & safe-area** — nội dung trang thiếu padding `safe-area-inset-left/right`; label bottom nav `display:none` khi landscape → link chỉ còn icon, không accessible name; MaintenancePage `align-items:center` + `overflow:auto` cắt phần đầu; Blocked page `h-screen` + nền trắng cứng.
6. **Tablet / màn rộng** — grid coarse mặc định 4 cột, tối đa 6 bất kể bề rộng; bảng admin users/library ẩn email/owner/size trên phone và count tới 1023px; dashboard heatmap ~5px ô ở 360px.
7. **A11y & contrast** — focus ring 40% alpha primary ≈1.84:1 (light) / 2.72:1 (dark) `[Inference]` < 3:1; focus input search modal 24% alpha; dashboard `text-*-400` trên nền sáng; album table row không dùng được bằng bàn phím, context menu chỉ `oncontextmenu`; toolbar Albums thiếu tên dưới `md`; `id="version-history"` trùng trong ServerAboutModal. Text/button contrast còn lại đạt AA (chi tiết audit-D).
8. **Form input** — login: `autocomplete="nope"`, password `type="text"`, thiếu `inputmode`/`enterkeyhint`, font 14px (chỉ tránh zoom iOS nhờ `maximum-scale=1` — sẽ zoom nếu bỏ H4); DateInput `inputmode="decimal"` không có `/` `:` trên iOS `[Inference]`.
9. **Dọn dẹp** — nhiều file branding không được import (fluent-tokens, typography, component-overrides, fluent/globals|primitives|forms|admin…), dùng biến `--colorNeutral*` không tồn tại; `scrollIntoView({behavior:'smooth'})` bỏ qua reduced-motion; chuỗi tiếng Việt hard-code bỏ qua i18n; 3 lớp backdrop blur 48px full-viewport trong viewer.

## Ngoài UI nhưng nên sửa

- `custom/src/routes/admin/users/(list)/+layout.svelte:44` gửi access token qua query string (`?list=1&accessToken=...`) → lộ trong log/proxy. Nên chuyển sang header `Authorization`.

## Cần quyết định trước khi sửa

- **H4 (chặn zoom)**: giữ (trải nghiệm kiểu app native) hay bỏ (accessibility)? Bỏ thì phải nâng mọi input lên ≥16px cùng lúc.
- **Login chống autofill**: giữ cơ chế hay cho phép password manager (`autocomplete="username"`/`"current-password"`, `type="password"`)?
