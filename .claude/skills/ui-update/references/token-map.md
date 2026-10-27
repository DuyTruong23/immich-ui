# Bản đồ token

Chuỗi CSS đang chạy là danh sách `@import` ở đầu `custom/src/styles/custom.css` (đọc file đó để xác nhận thứ tự hiện tại). File trong `branding/src` không có trong chuỗi đó là code chết — đừng sửa nó với hy vọng đổi giao diện.

## Màu

| Lớp | File | Vai trò |
|---|---|---|
| Nguồn M3 | `branding/src/m3/tokens.css` | `--md-sys-color-*` cho theme sáng (`html.light, :root:not(.dark)`) và tối (`html.dark, .dark`), trong `@layer base`. **Đổi màu thương hiệu bắt đầu ở đây.** Cũng chứa `--md-sys-state-*` (độ mờ hover/pressed), `--md-motion-*`, `--md-state-focus-ring`. |
| Bridge | `branding/src/m3/immich-bridge.css` | Ánh xạ M3 → biến của `@immich/ui`/Tailwind (`--color-primary-*`, `--color-neutral-*`, `--color-success/danger/warning/info`, `--color-light/dark/subtle`), biến `--immich-*` (bộ ba RGB cũ) và alias fork `--pg-*` (`--pg-text`, `--pg-text-muted`, `--pg-border`, `--pg-surface-raised`…). Đổi M3 thì bridge tự theo, trừ các hex viết thẳng (vd. `--color-neutral-400`, `-600`, thang `primary-*`) — kiểm tra chúng khi đổi palette. |
| Alias RGB | `branding/src/theme-light.css`, `theme-dark.css` | Bộ ba RGB cho CSS upstream cũ; giá trị lấy từ bridge. |
| Ngữ cảnh riêng | `branding/src/m3/media-chrome.css` (control video), `custom/src/styles/custom.css` (`--pg-maintenance-*` minh họa bảo trì) | Màu có scope; không dùng cho UI chung. |

Quy tắc khi đổi màu:
- Đổi ở `tokens.css` cho **cả hai theme**; theme tối không phải đảo màu của theme sáng — chọn lại sao cho chữ trên nền vẫn ≥4.5:1.
- Màu mới dùng trong component lấy qua biến token, không viết hex trong component. Ngoại lệ hiện có (vòng nền check `#d9dcef`/`#232932` trong Thumbnail) là nợ, đừng nhân bản.
- Màu trạng thái (success/danger/warning) luôn đi kèm chữ hoặc icon; danger và success phải khác nhau về độ sáng, không chỉ khác hue.
- Focus ring `--md-state-focus-ring` hiện là `primary` đặc (≥3:1 trên mọi surface ở cả hai theme; thấp nhất 3.26:1 trên nền video đen ở theme sáng). Đổi primary thì tính lại ring.
- Dashboard dùng tông Tailwind: `-700` ở theme sáng, `-400` ở theme tối (`dark:`), nền `-500/10`. Không dùng `-400` trên nền sáng.
- `color-mix()`/`calc()` không biểu diễn được trong tokens.json của Design System — ghi chú nếu thêm.

## Chữ

- `branding/src/fonts.css`: `--font-sans` (SF Pro → `system-ui`). File font SF Pro nằm trong `branding/assets/fonts/SFPro` (giấy phép Apple — không phát hành ra ngoài app).
- `branding/src/m3/typography.css`: thang `--md-sys-typescale-*`. Chỉ `body-large` (mặc định `body`), `body-medium`, `label-large` (ép lên mọi nút bo tròn), `label-medium` đang được đọc; `display/headline/title` khai báo nhưng chưa dùng.
- Mobile shell có cỡ riêng trong `custom/src/styles/mobile-shell.css` (tiêu đề header 22px/700, nhãn bottom nav 11px/600…).
- Ô nhập trên cảm ứng bị ép 16px trong `fluent/responsive.css`.

## Spacing, bo góc, bóng, motion

| Họ | File |
|---|---|
| Spacing | `branding/src/tokens/spacing.css` (lưới 4px: `--spacingHorizontal*`, `--spacingVertical*`, `--spacing2…64`); gutter nội dung trong `fluent/responsive.css`; biến shell (`--mobile-bottom-nav-height` 3.375rem dọc / 2.8125rem landscape thấp, `--pg-mobile-content-gutter`, `--pg-gallery-fabs-*`, `--pg-upload-panel-bottom`) trong `mobile-shell.css` |
| Bo góc | `branding/src/m3/shape.css` (`--md-sys-shape-corner-none … full`). `components.css` ép `corner-full` lên mọi `button[class*='rounded']` |
| Bóng | `branding/src/m3/elevation.css` (`--md-sys-elevation-0…5`, giống nhau hai theme) |
| Motion | `--md-motion-easing-standard`, `--md-motion-duration-short` trong `tokens.css`; reduced-motion toàn cục trong `custom/src/styles/custom.css` |
| Breakpoint | `@theme` trong `upstream/web/src/app.css` (file upstream; không đổi trừ khi thật cần) |

Đổi chiều cao bottom nav/header thì cập nhật biến tương ứng — FAB, UploadPanel, `scroll-padding`, vùng cuộn đều tính từ các biến đó.
