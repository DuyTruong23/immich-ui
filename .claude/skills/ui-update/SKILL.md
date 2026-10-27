---
name: ui-update
description: Quy trình thay đổi giao diện WeGallery (fork Immich Web trong repo immich-ui) — đổi design token (màu, chữ, spacing, bo góc, bóng, motion), cập nhật design system, restyle hoặc override component upstream, thêm component mới, sửa responsive mobile/tablet. Dùng skill này bất cứ khi nào dev muốn đổi màu/theme/dark mode, chỉnh token trong branding/, sửa CSS hay layout của trang/component, đụng tới overrides/lib hoặc custom/src, thêm nút/panel/sheet, hoặc hỏi "đổi màu primary", "sửa nút này trên điện thoại", "thêm component", "cập nhật design system" — kể cả khi họ không nhắc chữ "token" hay "design system". Bao gồm kiểm tra tương phản, touch target, gate lint/typecheck/build, Playwright mobile/tablet và đồng bộ artifact Design System.
---

# Cập nhật UI cho WeGallery

WeGallery là lớp giao diện tùy biến phủ lên Immich Web (SvelteKit 2, Svelte 5 runes, Tailwind CSS 4, `@immich/ui`). Sửa sai chỗ là lỗi hay gặp nhất ở repo này: code ở `upstream/web` phần lớn là **bản copy** sinh ra, và cascade CSS có vài cái bẫy riêng. Skill này cho biết sửa ở đâu, theo thứ tự nào, và kiểm tra ra sao.

## 1. Xác định loại thay đổi

| Dev muốn | Sửa ở đâu | Đọc thêm |
|---|---|---|
| Đổi màu / theme sáng-tối / chữ / spacing / bo góc / bóng / motion | `branding/src/m3/*.css`, `branding/src/tokens/spacing.css` | `references/token-map.md` |
| Đổi cách một component `@immich/ui` hoặc upstream trông (không đổi markup) | CSS trong `branding/src/m3/components.css`, `states.css`, `fluent/responsive.css`, `custom/src/styles/*.css` | `references/components.md` §Restyle |
| Đổi markup/hành vi component upstream | Bản override `overrides/lib/<cùng đường dẫn với upstream/web/src/lib>` | `references/components.md` §Override |
| Thêm component / trang mới | `custom/src/routes/**` (trang, component gắn route) hoặc `overrides/lib/components/**` (component dùng chung) | `references/components.md` §Component mới |
| Sửa riêng mobile / tablet (touch, safe-area, landscape) | `custom/src/styles/mobile-shell.css`, `branding/src/fluent/responsive.css`, `branding/src/fluent/viewer.css` | `references/components.md` §Responsive |
| Cập nhật tài liệu Design System sau khi đổi token/component | Artifact Design System | `references/design-system-sync.md` |

Một yêu cầu thường chạm nhiều hàng (đổi token → kiểm tương phản → cập nhật Design System). Làm theo thứ tự bảng.

## 2. Luật không được phá

Những điều này đến từ cấu trúc repo; phá chúng sẽ bị âm thầm ghi đè hoặc vỡ build.

- **Chỉ sửa nguồn**: `custom/`, `overrides/lib/`, `branding/`, `config/`, `scripts/`. Đừng sửa tay file trong `upstream/web/src` hay `upstream/web/static` — `bash scripts/prepare-custom.sh` sẽ ghi đè. Sau khi sửa nguồn, chạy `bash scripts/prepare-custom.sh` và **commit nguồn cùng bản copy** (copy được track). Ngoại lệ: `upstream/i18n/en.json`, `vi.json` sửa trực tiếp; `branding/src/**` copy sang `upstream/web/static/branding` (bị gitignore) nên chỉ commit nguồn.
- **Patch script có thể ghi đè copy**: `scripts/patch-*.py` và `scripts/restore-upstream-ui.sh` chạy sau bước copy. Nếu dòng bạn đổi nằm trong file mà script chạm tới (Timeline, utils.ts, AccountInfoPanel…), sửa output của script cho khớp và giữ idempotent. Kiểm bằng: sửa → prepare-custom → `git diff` copy đúng như ý.
- **Cascade layer** (bẫy lớn nhất): tên layer là toàn cục. Tailwind và `branding/src/fluent/responsive.css` cùng ở `@layer utilities`, nên **utility Tailwind (specificity 0,1,0) thua `button:not([disabled])` (0,1,1)**. Muốn ghi đè rule toàn cục trên `(pointer: coarse)`, thêm class móc nối và viết rule ≥(0,2,1) trong `responsive.css` (mẫu: `.pg-touch-target`, `button.pg-day-select-toggle:not([disabled])`). CSS không thuộc layer (`custom/src/styles/*.css`, `<style>` của Svelte) thắng mọi rule có layer. Spec jsdom **không** kiểm được cascade — đừng đặt tên test như thể nó kiểm.
- **Quyết định đã chốt của chủ repo**: giữ chặn pinch-zoom toàn trang (`touch-action: pan-x pan-y` trên `html, body`, không đổi viewport meta); trang login giữ thiết kế chống password manager (`autocomplete="nope"` qua hằng số có kiểu, `data-1p-ignore`/`data-lpignore`/`data-bwignore`, `data-form-type="other"`, ô mật khẩu text có mask). Không đảo các quyết định này trừ khi dev yêu cầu rõ.
- **Chuỗi hiển thị qua `$t('key')`**; key mới thêm vào cả `en.json` và `vi.json` (top-level, thụt 2 space, UTF-8, chèn sau `"pg_maintenance_description"`). Không chạy prettier trên file i18n (nó sort lại toàn file). `$t` được type-check theo `en.json`.
- Comment tiếng Việt, khớp mật độ comment xung quanh. File nguồn thường là CRLF — giữ nguyên line ending.

## 3. Chuẩn UX bắt buộc cho mọi thay đổi

- **Vùng chạm ≥44×44px trên `(pointer: coarse)`**. Glyph nhỏ hơn: thêm `pg-touch-target` (phần tử phải `relative`/`absolute`; class không tự đặt `position`), `::before` mở rộng vùng chạm mà không đổi kích thước nhìn thấy. Nút icon tròn/vuông được rule vuông nâng cả `min-width` để không thành oval. Khoảng cách giữa hai vùng chạm liền kề ≥8px khi bố cục cho phép. Nếu 44px gây chồng vùng chạm khác, chồng là tệ hơn: giữ ≥24px (WCAG 2.2 SC 2.5.8) và ghi lý do trong comment.
- **Không phụ thuộc hover**: affordance chỉ hiện khi hover phải hiện cả khi `:focus-visible`/`:focus-within` và luôn dùng được trên cảm ứng.
- **Safe-area**: thanh cố định cộng `env(safe-area-inset-*, 0px)` bọc trong `max()`. Full-height mobile dùng `dvh`/`svh`, không `vh`/`h-screen`.
- **Phần tử cố định không chồng nhau**: bậc z-index hiện tại — sidebar 20, navbar viewer 30, sheet viewer 40, menu Yêu thích 51, UploadPanel 60, cụm FAB 80, bottom nav 90, modal 100. Vị trí đáy dùng biến `--mobile-bottom-nav-offset`, `--pg-gallery-fabs-height` + `--pg-gallery-fabs-gap`, `--pg-upload-panel-bottom` thay vì số cứng.
- **Tương phản**: chữ ≥4.5:1 (3:1 cho chữ ≥24px hoặc đậm ≥19px), viền control/focus ring/icon mang nghĩa ≥3:1, ở **cả hai theme**. Chạy `node .claude/skills/ui-update/scripts/contrast.mjs <fg> <bg> …` (xem §5).
- **Ô nhập ≥16px trên cảm ứng** (đã có rule chung trong `responsive.css`; đừng ghi đè xuống).
- **Reduced motion**: animation/transition mới dùng `motionDuration(ms)`, cuộn mượt dùng `prefersReducedMotion()` (cả hai ở `overrides/lib/utils/mobile-performance.svelte.ts`). Rule CSS toàn cục trong `custom/src/styles/custom.css` không chạm được transition Svelte 5 (chạy qua `element.animate()`).
- **Breakpoint của fork lệch 1px**: `sm` 639, `md` 767, `lg` 1023, `xl` 1279, `2xl` 1535, `sidebar` 850. Mobile viewer = `(pointer: coarse), (max-width: 767px)`; mobile shell = `html[data-mobile-shell]`. Dùng `(pointer: coarse)` để đoán cảm ứng, đừng đoán bằng bề rộng (iPad rộng vẫn là coarse).

## 4. Test

- Spec đặt cạnh component trong `overrides/lib/**` hoặc `custom/src/routes/**`, **import tường minh** `import { describe, expect, it, vi } from 'vitest'` (thư mục nguồn không có tsconfig khai `vitest/globals`, thiếu import thì editor báo TS2304). Spec chỉ chạy sau prepare-custom; `custom/src/components/*` không được copy nên spec đặt ở đó không bao giờ chạy.
- Chạy: `pnpm --filter immich-web exec vitest run <đường dẫn tương đối upstream/web>` từ gốc repo (không `cd upstream/web && pnpm …`). Component cần `Tooltip.Provider` → render qua `$lib/components/TestWrapper.svelte`.
- Baseline fail có sẵn, không phải lỗi của bạn: `src/lib/i18n.spec.ts` (77), `timeline-manager.svelte.spec.ts` (26), `ImageThumbnail.spec.ts` (3), `AssetViewerNavBar.spec.ts` (2), suite `asset.service.spec.ts`.
- Đổi chỉ CSS: không cần spec jsdom; kiểm bằng grep + Playwright (§5).

## 5. Kiểm tra trước khi commit

Chạy theo thứ tự, tất cả phải exit 0:

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec eslint --max-warnings 0 <file đã đổi dưới upstream/web>
pnpm --filter immich-web exec svelte-check --no-tsconfig --fail-on-warnings --compiler-warnings state_referenced_locally:ignore
pnpm --filter immich-web exec tsc --noEmit
pnpm build
```

eslint toàn repo (`eslint .`) chậm (vài phút); chạy trên file đã đổi khi lặp, chạy toàn repo một lần trước khi mở PR. Node 24 in cảnh báo "Unsupported engine" — bỏ qua.

**Tương phản** cho token đã đổi:

```bash
node .claude/skills/ui-update/scripts/contrast.mjs md-sys-color-on-surface/md-sys-color-surface md-sys-color-primary/md-sys-color-surface-container
```

Script đọc giá trị light và dark từ `branding/src/m3/tokens.css` + `immich-bridge.css` (theo alias `var()`), in tỉ lệ từng theme và đánh dấu cặp dưới ngưỡng. Truyền thẳng mã hex cũng được (`#ffffff/#6750a4`).

**Responsive mobile/tablet bằng Playwright** — làm khi đổi layout, touch, safe-area, token ảnh hưởng kích thước:

1. Chạy app ở UI dev mode (dữ liệu mock, không cần server Immich): `upstream/web/.env.local` cần `PUBLIC_UI_DEV_MODE=true` (copy từ `.env.local.example`), rồi start `pnpm dev:local` (port 5283) bằng công cụ chạy server của môi trường (preview/launch config), không chạy server trong Bash nền.
2. Cài Playwright **ngoài repo** (thư mục tạm) để không đụng `package.json`: `npm i -D playwright@1.54.2 && npx playwright install chromium webkit`.
3. `node .claude/skills/ui-update/scripts/responsive-check.mjs` (chạy với cwd là thư mục tạm có playwright; `BASE_URL`, `OUT_DIR` tùy chọn). Script chạy 6 khung nhìn (iPhone 13 dọc/ngang, Pixel 7, iPad dọc/ngang, desktop 1440) × 8 trang, báo: tràn ngang, vùng chạm <44px trên coarse, ô nhập <16px, phần tử fixed chồng nhau, control thiếu tên, lỗi console; lưu ảnh chụp. **Nó thoát mã khác 0 nếu có trang không tải được** — đừng đọc kết quả "sạch" khi trang không load.
4. Lưu ý: đừng chạy `prepare-custom.sh` khi dev server đang chạy (Vite có thể crash). Vite 8 trên Node 24 Windows đôi khi crash native (`0xC0000409`) — khởi động lại server rồi chạy lại. UI dev mode có lỗi 401 console từ API không giả lập và mock timeline chưa hiện ảnh (chưa test được viewer) — đó là giới hạn môi trường, không phải lỗi UI.
5. Sau khi xong: dừng server, khôi phục `.claude/launch.json` nếu đã sửa tạm, `git checkout -- upstream/web` nếu chỉ còn thay đổi line-ending do prepare-custom.

## 6. Commit và báo cáo

- Conventional Commits, mô tả tiếng Việt (`fix(touch): …`, `feat(ui): …`, `style(theme): …`), stage đúng nguồn + copy.
- Báo cho dev: đã đổi gì, những thay đổi người dùng sẽ thấy (màu, kích thước, hành vi), kết quả gate, kết quả Playwright, và cái gì **chưa** kiểm (thiết bị thật, viewer trong dev mode).
- Nếu token hoặc component trong Design System đổi: cập nhật artifact theo `references/design-system-sync.md`, hoặc nói rõ cho dev biết nó đã lệch.
