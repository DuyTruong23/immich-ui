# Component: restyle, override, thêm mới, responsive

## Restyle (không đổi markup)

Dùng khi chỉ đổi hình thức của component `@immich/ui` hoặc upstream.

- Rule toàn cục theo vai trò: `branding/src/m3/components.css` (nút, thẻ, dialog, input `.immich-form-input`), `branding/src/m3/states.css` (hover/pressed/focus), `branding/src/m3/shell.css`, `timeline.css`, `admin.css`, `search-filter.css`.
- Rule cảm ứng: `branding/src/fluent/responsive.css` (khối `@media (pointer: coarse)` trong `@layer utilities`); viewer: `branding/src/fluent/viewer.css`; mobile shell: `custom/src/styles/mobile-shell.css` (không layer, nên thắng rule có layer).
- Component của `@immich/ui` không sửa được (node_modules). Bám vào cấu trúc ổn định nhất của markup đã render (attribute, quan hệ anh em như `button:has(+ a)`, id vùng chứa như `#sidebar`) thay vì chuỗi class Tailwind; đọc markup trong `upstream/web/node_modules/@immich/ui/dist/components/**` trước khi viết selector.
- Rule thẻ trong `components.css` dùng `!important` và khớp `[class*='rounded-2xl'].border` / `[class*='rounded-3xl'].border` — một phần tử có `rounded-3xl` + `border` sẽ bị đổi góc/nền dù bạn không định. Kiểm tra khi thêm class.
- Nhớ bẫy layer (SKILL.md §2): utility Tailwind thua rule toàn cục có specificity cao hơn trong cùng `utilities`.

## Override component upstream

Dùng khi phải đổi markup hoặc logic.

1. Copy file upstream **nguyên văn** sang `overrides/lib/<cùng đường dẫn tương đối dưới upstream/web/src/lib>`; commit bước copy riêng (để diff sau cho thấy đúng phần bạn đổi).
2. Sửa trong override; chạy `bash scripts/prepare-custom.sh` (nó copy override đè lên `upstream/web/src/lib/...`).
3. Kiểm tra `scripts/patch-mobile-performance.py` / `restore-upstream-ui.sh` có bỏ qua hoặc vá file này không (log prepare-custom in "Skip … (override present)").
4. Override che mọi thay đổi upstream sau này của file đó — chỉ override khi không restyle được.

File fork đang nằm thẳng trong `upstream/web` mà không có nguồn là nợ cần chuyển về `overrides/`/`custom/` khi chạm tới.

## Component / trang mới

- Component gắn với một trang: đặt cạnh trang trong `custom/src/routes/<route>/` (được copy sang `upstream/web/src/routes`, spec chạy được). Mẫu: `custom/src/routes/(user)/albums/AlbumGroupToggles.svelte`, `.../shared-favorites/.../LikedByStack.svelte`.
- Component dùng chung: `overrides/lib/components/<nhóm>/Ten.svelte`, import bằng `$lib/components/...`. Mẫu: `overrides/lib/components/timeline/TimelineDaySelectToggle.svelte`.
- `custom/src/components/*` được import qua `$custom` và **không** được copy — spec đặt ở đó không chạy, eslint của upstream không lint nó. Tránh thêm component mới vào đây nếu cần test.
- Svelte 5 runes (`$props`, `$state`, `$derived`), props có kiểu, comment tiếng Việt.
- Dùng primitive của `@immich/ui` (`Button`, `IconButton`, `Icon`, `Field`, `Input`, `Modal`…) và icon `@mdi/js` thay vì tự vẽ; icon trang trí `aria-hidden="true"`, nút chỉ có icon phải có `aria-label` (+ `title` khi đứng một mình).
- Không tạo markup trùng ở hai breakpoint — dùng `{#snippet}` hoặc component chung, điều khiển hiển thị bằng class do nơi gọi truyền vào.
- Chuỗi qua `$t`; key mới vào cả `en.json`/`vi.json`.

## Responsive

- Kiểm cả ba nhóm: phone (~360–430px, coarse), tablet (768–1180px, coarse — layout desktop nhưng ngón tay), desktop (fine). iPad ngang hiện layout có sidebar nhưng vẫn là cảm ứng.
- Panel/sheet trên phone: `absolute inset-x-0 bottom-0` + `rounded-t-2xl` + `max-h-[…dvh]` + safe-area + nền đặc; từ 768px thành drawer cạnh cuối. Mẫu: `overrides/lib/components/asset-viewer/viewer-panel-layout.ts` (`getViewerPanelLayoutClass`).
- Phần tử fixed mới: chọn tầng z-index trong bậc hiện có (SKILL.md §3), đặt đáy bằng biến offset, kiểm tra không chồng bottom nav/FAB/UploadPanel ở landscape thấp (`(orientation: landscape) and (max-height: 500px)`).
- Nội dung cuộn nằm trong `.pg-mobile-content` hoặc scroller `#asset-grid` (không phải `html`) — `scroll-padding` đặt trên các scroller đó.
- Kiểm bằng Playwright (SKILL.md §5) rồi xem ảnh chụp; ghi rõ cái gì chưa kiểm được trên thiết bị thật.
