# Đồng bộ Design System

Design System của WeGallery là một artifact trên claude.ai (loại "Design System"): https://claude.ai/artifact/CjV9ZkfSB1CkUHaTgPMeXH — riêng tư cho chủ sở hữu cho tới khi họ chia sẻ. Nó được dựng từ code (không tự đồng bộ), nên sau khi đổi token hay component, cập nhật nó hoặc báo cho dev rằng nó đã lệch.

## Cái gì nằm trong đó

- `project/tokens.json`: màu (`color.themes` = light, dark; `color.tokens` là **danh sách** `{name, value: {light, dark}, usage}`), `type`, `spacing`, `radius`, `shadow`, cùng `opacity`, `motion`, `breakpoint`. Tên token = tên biến CSS bỏ `--`. Giá trị màu phải là hex/`rgb()`/`oklch()` hoặc alias `"{token-khác}"` — `var()`, `color-mix()`, `calc()` không hợp lệ (bỏ và ghi trong mục "Not synced" của README).
- `project/README.md`: brand book tiếng Việt (giọng văn, màu, chữ, spacing, trạng thái, breakpoint, safe-area, icon, mẫu mobile shell, a11y).
- `project/components/<Comp>/README.md` + `preview.html` (bản dựng tĩnh bằng `var(--token)`): Button, IconButton, Input, Chip, Card, Thumbnail, BottomNav, FabCluster, UploadPanel, ViewerSheet, Dialog, EmptyPlaceholder, và `Cover`.
- Không có font SF Pro và logo `icloud-photos-*` — cố ý (giấy phép Apple / nhận diện iCloud Photos). Đừng thêm chúng vào.

## Cách cập nhật (khi môi trường có công cụ Artifact)

1. Đọc trước: `read` artifact với `path` cho từng file sẽ đổi (`project/tokens.json`, `project/README.md`, file component) và `project/design-system.json` (index). Người khác có thể đã sửa trên trang — luôn sửa trên bản vừa đọc.
2. Sửa trong một thư mục tạm, cấu trúc `<dir>/project/<path>`:
   - Đổi token: cập nhật giá trị **cả hai theme** và `usage` (nơi dùng + tỉ lệ tương phản mới nếu là màu chữ/nền).
   - Đổi/thêm component: sửa `README.md` (câu đầu là tóm tắt; khi nào dùng, người dùng cung cấp gì, trạng thái, a11y, nên/không nên, file nguồn) và `preview.html` (dòng 1 `<!-- @dsCard group="…" height=N -->`, chỉ dùng `var(--token)`, không tải gì từ ngoài).
   - Không viết `tokens.css`, `manifest.json`, `api/` — trang tự sinh.
3. Publish một lần với `url` của artifact, `root` = thư mục tạm, chỉ các file đã đổi (`tokens.json` luôn gửi nguyên file). Nếu đổi khóa của index (title, asset) thì đọc lại index ngay trước, giữ nguyên các khóa khác và `createdOnFiles`, cập nhật `lastChange` {by, at, via, note}, gửi index trong lần gọi cuối.
4. Báo cho dev link artifact và những gì đã đổi.

Không có công cụ Artifact: liệt kê cho dev chính xác token/component nào trong Design System đã lệch so với code để họ cập nhật.
