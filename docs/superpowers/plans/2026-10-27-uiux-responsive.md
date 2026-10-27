# UI/UX Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa các vấn đề UI/UX responsive (mobile, tablet, desktop) mà audit 2026-10-27 tìm ra, theo 9 nhóm ưu tiên.

**Architecture:** Chỉ sửa nguồn trong `custom/`, `overrides/lib/`, `branding/`; `scripts/prepare-custom.sh` sinh lại bản copy tracked trong `upstream/web`. Ưu tiên CSS theo `(pointer: coarse)` / `html[data-mobile-shell]` có sẵn; logic mới đặt vào helper nhỏ có spec vitest.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind CSS 4.3, @immich/ui 0.83, vitest + @testing-library/svelte.

**Spec:** `docs/superpowers/audits/2026-10-27-uiux-responsive-audit.md` (+ chi tiết `docs/superpowers/audits/2026-10-27-uiux/audit-{A-shell,B-viewer,C-pages,D-tokens}.md`).

## Global Constraints

- Quyết định của user (bắt buộc): GIỮ chặn pinch-zoom toàn trang — không đổi `touch-action: pan-x pan-y` trên `html, body` trong `custom/src/styles/custom.css`, không đổi viewport meta.
- Quyết định của user (bắt buộc): Login GIỮ thiết kế chống password manager (`autocomplete="nope"`, `data-1p-ignore`/`data-lpignore`/`data-bwignore`, `data-form-type="other"`, ô mật khẩu text có mask); BỎ cơ chế `readonly` mở khóa trễ (`blockAutofill` / `scheduleUnlockAutofill`); thêm `enterkeyhint`, `inputmode="email"` cho email; font-size input ≥16px.
- Chỉ sửa nguồn trong `custom/`, `overrides/lib/`, `branding/`, `config/`, `scripts/`. Sau khi sửa chạy `bash scripts/prepare-custom.sh`; commit nguồn + bản copy tracked trong `upstream/web` cùng nhau. `upstream/web/static/branding/` bị gitignore → sửa `branding/src/**` chỉ commit nguồn. `custom/src/components/*` không được copy.
- Không sửa tay file trong `upstream/web/` không phải bản copy của prepare-custom.
- Quy ước mobile viewer: `(pointer: coarse), (max-width: 767px)`. Mobile shell: `html[data-mobile-shell]`.
- Touch target ≥44×44 CSS px dưới `(pointer: coarse)`; glyph có thể nhỏ hơn — mở rộng vùng chạm bằng padding hoặc pseudo-element, không làm méo nút tròn.
- Safe area: `env(safe-area-inset-*, 0px)` với `max()`/`calc()`. Full-height mobile dùng `dvh`/`svh`, không `vh`/`h-screen`.
- Animation / smooth scroll mới phải tôn trọng `prefers-reduced-motion: reduce`.
- Affordance chỉ-hover phải hiện cả khi `:focus-visible`/`:focus-within` và dùng được trên cảm ứng.
- Chuỗi hiển thị qua `$t('key')`; key mới thêm vào cả `upstream/i18n/en.json` và `upstream/i18n/vi.json` (key top-level, 2-space indent); KHÔNG chạy prettier trên file i18n JSON.
- Test: `pnpm --filter immich-web exec vitest run <path tương đối upstream/web>` từ repo root. Spec mới đặt trong `overrides/lib/**` hoặc `custom/src/routes/**` và chỉ chạy sau `prepare-custom.sh`. Baseline fail được bỏ qua: `src/lib/i18n.spec.ts` (77), `timeline-manager.svelte.spec.ts` (26), `ImageThumbnail.spec.ts` (3), `AssetViewerNavBar.spec.ts` (2), suite `asset.service.spec.ts`.
- svelte-check: `pnpm --filter immich-web exec svelte-check` — baseline 30 errors / 1 warning, không thêm lỗi. ESLint `--max-warnings 0` trên file đã sửa.
- Commit: Conventional Commits, mô tả tiếng Việt, kết thúc bằng dòng trống + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Khớp style và mật độ comment của code xung quanh (comment tiếng Việt).
- Task chạy tuần tự 1→19; task sau thấy thay đổi của task trước. Neo chỉnh sửa theo selector/markup, không theo số dòng.

## Bảng đánh số task

Plan được ghép từ 3 bản nháp; trong thân task, "Task X-y" là nhãn nhóm cũ. Bảng quy đổi:

| Task | Nhóm cũ | Nội dung |
|---|---|---|
| 1 | 1 | Va chạm upload panel vs cụm FAB |
| 2 | 2-a | Viewer: detail/editor/activity panel, SwipeBackEdge |
| 3 | 2-b | Viewer: safe-area, OCR/activity vs filmstrip, video controls |
| 4 | 3 | Touch target < 44px |
| 5 | 4-a | Hover-only: thumbnail select/preview, toggle chọn theo ngày |
| 6 | 4-b | Hover-only: shared-favorites "liked by", FAB hint |
| 7 | 5-a | Landscape & safe-area: mobile shell |
| 8 | 5-b | MaintenancePage, Blocked page |
| 9 | 6-a | Số cột grid theo bề rộng |
| 10 | 6-b | Bảng admin, dashboard, email dài |
| 11 | 6-c | Albums, explore, cột shared-favorites |
| 12 | 7-a | Focus ring, input focus, tone dashboard |
| 13 | 7-b | Album list bàn phím/touch, tên toolbar, ServerAbout, person tiles |
| 14 | 7-c | Ngữ nghĩa shell & trang custom |
| 15 | 8 | Form input (login, DateInput, search) |
| 16 | 9-a | Xóa file branding không import |
| 17 | 9-b | Reduced-motion cho JS scroll & transition Svelte |
| 18 | 9-c | Chuỗi hard-code → i18n |
| 19 | 9-d | Blur, CLS EmptyPlaceholder, selector modal, `vh` |

## Controller rulings (áp dụng đè lên thân task)

- R1 — `FeatureUpdatePin.svelte`: Task 1 sở hữu container `.pg-gallery-fabs` (bỏ `role="group"`/`aria-label`, `inset-inline-end`, `max-width` theo safe-area). Task 6 bỏ qua 3 chỉnh sửa đó nếu `rg` cho thấy Task 1 đã làm; chỉ làm `title` cho pin bị cắt và trạng thái `:focus-visible` = hover.
- R2 — `UploadPanel.svelte` badge: Task 1 sở hữu vị trí và kích thước badge của bubble. Task 14 chỉ thêm `aria-label` cho 3 nút bubble và bỏ `aria-labelledby` sai, áp lên markup Task 1 để lại; không đổi class badge.
- R3 — Số cột grid mặc định trên phone (Task 9): sửa lỗi `Number(null) === 0` để mặc định đúng `GRID_COLUMNS_DEFAULT = 4` như hằng số thể hiện.
- R4 — i18n: key mới chèn theo thứ tự chữ cái hoặc sau dòng `pg_maintenance_description` đều chấp nhận; trước khi chèn kiểm tra key chưa tồn tại.
- R5 — `branding/src/fluent/navigation.css` không được import: không task nào sửa file này; Task 16 xóa nó.

## Phụ lục — ghi chú planner, finding bị bỏ, chồng lấn giữa task

### Ghi chú từ planner — nhóm 1-2-5

Nguồn: `docs/superpowers/audits/2026-10-27-uiux-responsive-audit.md` + `audit-A-shell.md`, `audit-B-viewer.md`, `audit-C-pages.md`.
Mọi finding dưới đây đã được mở lại file gốc trên branch `feature/uiux-responsive-2026-10` (HEAD `9c0b2d440`) và xác nhận còn đúng, trừ phần ghi ở **Dropped findings**.

Ghi chú chung cho cả 5 section:

- Spec mới phải nằm dưới `upstream/web/src/**` mới được vitest chạy (`include: ['src/**/*.{test,spec}.{js,ts}']` trong `upstream/web/vite.config.ts`). Vì vậy spec đặt ở `overrides/lib/**` hoặc `custom/src/routes/**` (được prepare-custom copy sang) — giống `overrides/lib/components/asset-viewer/preview-layout.spec.ts`. Spec đặt ở `custom/src/components/` hay `custom/src/utils/` sẽ **không** được chạy.
- Do đó Step 2 (chạy test FAIL) phải chạy `bash scripts/prepare-custom.sh` trước để spec có mặt trong `upstream/web`.
- `branding/src/**` được copy sang `upstream/web/static/branding/` — thư mục này bị `.gitignore` (dòng 11), nên chỉ commit file nguồn `branding/src/...`.
- `custom/src/styles/mobile-shell.css` → `upstream/web/static/mobile-shell.css` (tracked, copy nguyên). `custom/src/styles/custom.css` → `upstream/web/static/custom.css` (tracked, qua `sed` chỉ đổi dòng `@import`).
- `custom/src/components/*.svelte` **không** được copy (import qua alias `$custom`) → không có copy để commit, eslint của `upstream/web` không lint được file này (nằm ngoài base path) — `[Unverified]` svelte-check có báo lỗi cho file ngoài workspace hay không.
- Không có `scripts/patch-*.py` nào rewrite các dòng sửa ở đây: `patch-mobile-performance.py` bỏ qua AssetViewer khi có override (`override_exists(... 'components/asset-viewer/AssetViewer.svelte')` → "Skip AssetViewer swipe-back patch"), các patch còn lại không chạm UploadPanel, UserPageLayout, MobileBottomNav, SwipeBackEdge, SlideshowMetadataOverlay, MobilePreviewStrip, blocked page, mobile-shell.css, custom.css.
- ESLint `upstream/web` có `eslint-plugin-better-tailwindcss` (recommended) cho `*.svelte` + `--max-warnings 0`. Nếu eslint báo thứ tự class: chạy `--fix` trên **copy**, rồi `cp <copy> <source>` để nguồn khớp copy, chạy lại prepare-custom và xác nhận `git diff --stat` của copy không đổi thêm.
- Tests dùng `$t` không có message → trả về key (setup `init({ fallbackLocale: 'dev' })`), nên aria-label trong spec là key i18n (giống `AssetViewer.spec.ts`: `getByLabelText('to_favorite')`).
- `[Inference]` Các spec render component (UploadPanel, MobileBottomNav, UserPageLayout, blocked page) chưa được chạy thử trong lúc lập plan (repo read-only). Nếu một spec lỗi ở bước import/mount vì lý do không liên quan (ví dụ module thiếu mock), bổ sung `vi.mock` cho module đó rồi mới đánh giá FAIL/PASS.

---


### Ghi chú từ planner — nhóm 3-4-6

Drafted from `docs/superpowers/audits/2026-10-27-uiux-responsive-audit.md` + `audit-{A,B,C,D}`. Every cited file was re-opened on branch `feature/uiux-responsive-2026-10` (HEAD `9c0b2d440`). Code-only verification; no device/browser run. Anything that depends on rendering is marked `[Inference]`.

Facts established while verifying (they change several fixes, read before implementing):

1. **`branding/src/fluent/navigation.css` is dead code.** `custom/src/styles/custom.css:1-20` is the only import chain and it does not import it (grep of `custom/ branding/ overrides/ scripts/ config/ upstream/web/src` finds no import). The live touch rule is `branding/src/fluent/responsive.css:5-17` (`@layer utilities`, `(pointer: coarse)`: `button:not([disabled]), [role='button']:not([disabled]), a[role='menuitem'] { min-height: 44px }` and `#dashboard-navbar button, #sidebar a { min-height: 44px }`).
2. Because that rule is **layered**, any **unlayered** rule (`custom/src/styles/*.css`, Svelte `<style>` blocks) that sets `min-height` wins over it, and any `!important` in `@layer components` (e.g. `branding/src/m3/search-filter.css`) also wins. Where a component sets no `min-height`, the 44px rule already applies on coarse pointers.
3. `@immich/ui` 0.83.0 `IconButton` uses `internal/Button.svelte` `iconSize` = `h-6 w-6 | h-8 w-8 | h-10 w-10 | h-12 w-12`; `m3/components.css:7-10` forces `border-radius: full` on every `button[class*='rounded']`. With only `min-height:44px`, a `small` (32px) or `medium` (40px) round icon button renders 32×44 / 40×44 (oval) on coarse pointers.
4. Tailwind is 4.3.3 (has the `pointer-coarse:` variant). Custom breakpoints in `upstream/web/src/app.css:27-33`: `sm 639px`, `md 767px`, `lg 1023px`, `xl 1279px`, `2xl 1535px`, `sidebar 850px`.
5. `upstream/web/static/branding/` is git-ignored; `upstream/web/static/custom.css` and `upstream/web/static/mobile-shell.css` are tracked copies. Editing `branding/src/**` produces no tracked copy; editing `custom/src/styles/mobile-shell.css` does (`upstream/web/static/mobile-shell.css`).
6. No `scripts/patch-*.py` rewrites the lines changed below. `patch-mobile-performance.py:patch_timeline` only touches Timeline imports, the layout `$effect`, `use:pinchGrid` and `UploadListRefresh` (all idempotent, guarded by `not in text`); Thumbnail/GalleryViewer patches are skipped because overrides exist (`main()` lines 859-872).
7. Fork i18n keys live directly in `upstream/i18n/en.json` and `upstream/i18n/vi.json` as top-level keys in alphabetical order (e.g. `shared_favorites_liked_by` at en.json:2030, `upload_skipped_duplicates` at en.json:2291). In vitest, `$t('key')` returns the key string (see `DeleteAction.spec.ts` asserting `getByLabelText('delete')`).
8. Spec files placed in `overrides/lib/**` or `custom/src/routes/**` are only run after `prepare-custom.sh` copies them under `upstream/web/src/**` (vitest `include: ['src/**/*.{test,spec}.{js,ts}']`). So every "run, expect FAIL" step below runs `bash scripts/prepare-custom.sh` first. Precedent for a spec inside a route directory: `upstream/web/src/routes/(user)/albums/[albumId=id]/[[photos=photos]]/[[assetId=id]]/AlbumDescription.spec.ts`.
9. `upstream/web/src/lib/components/assets/thumbnail/__test__/Thumbnail.spec.ts` (upstream, not a copy) asserts the Thumbnail container is the only tabbable element. New thumbnail buttons keep `tabindex={-1}`. The new Thumbnail spec gets a different file name so it does not overwrite that upstream spec on copy.

Common commands (all from repo root):

- Copies: `bash scripts/prepare-custom.sh`
- Tests: `pnpm --filter immich-web exec vitest run <path relative to upstream/web>`
- Type-check gate: `pnpm --filter immich-web exec svelte-check 2>&1 | tail -3` → must still report `30 errors and 1 warning` (baseline), no new file in the error list.
- Lint: `pnpm --filter immich-web exec eslint --max-warnings 0 <paths relative to upstream/web>` (CSS files are not linted by eslint).
- Format: `pnpm --filter immich-web exec prettier --check <paths relative to upstream/web>`.

If `git status --short` after `prepare-custom.sh` shows paths not listed in a task's Step 4, they are pre-existing prepare-custom drift: do not stage them; stop and report.

---


### Ghi chú từ planner — nhóm 7-8-9

Author: planner for Tasks 7–9. Every finding below was re-checked against the current tree (branch `feature/uiux-responsive-2026-10`, HEAD `9c0b2d440`). Line numbers in audit C / D are often off; anchors below use the real code. Statements I could not verify by running code are labelled `[Inference]` / `[Unverified]`.

Facts checked during planning (they shape several steps):

- **Branding CSS has no tracked copy.** `prepare-custom.sh` copies `branding/src/` to `upstream/web/static/branding/`, but `.gitignore` lists that folder. The only tracked CSS copies are `upstream/web/static/custom.css` (sed copy of `custom/src/styles/custom.css`) and `upstream/web/static/mobile-shell.css`. When you change `branding/src/**`, you commit only the source.
- **`custom/src/components/*` is not copied.** It is imported through `$custom`, and vitest only collects `upstream/web/src/**/*.spec.ts`. So `MaintenancePage.svelte` gets grep verification, not a spec.
- **Where specs go.** A spec under `overrides/lib/**` or `custom/src/routes/**` is copied next to its component by prepare-custom and becomes tracked. To run a new spec, run `bash scripts/prepare-custom.sh` first.
- **i18n keys are typed.** `upstream/web/src/app.d.ts:66` sets `Translations = NestedKeys<typeof en>`, so svelte-check fails if a `$t()` key is missing from `upstream/i18n/en.json`. The fork's own keys are flat top-level `pg_*` keys in `upstream/i18n/{en,vi}.json`, for example `pg_maintenance_title`. Those files are not sorted. `i18n.spec.ts` compares the file with `JSON.stringify(…, null, 2)`, so keep 2-space indentation and raw UTF-8. Insert new keys right after the `"pg_maintenance_description"` line in each file. The working copy uses CRLF and `core.autocrlf=true` normalises it on commit.
- **Svelte 5 transitions bypass the CSS rule.** They run through `element.animate()` (`upstream/web/node_modules/svelte/src/internal/client/dom/elements/transitions.js:405,466`), so the global `@media (prefers-reduced-motion)` rule in `custom.css` does **not** shorten them. Audit D said it did; that was wrong. Helpers that already exist: `prefersReducedMotion()` and `motionDuration(ms)` in `overrides/lib/utils/mobile-performance.svelte.ts:42,143`.
- **Python patches do not touch my lines.** `scripts/patch-*.py` never rewrites the lines changed below. `patch_timeline` edits the `Timeline.svelte` copy, but only if certain imports or effects are missing. The override already has the `mobile-performance.svelte` import, so adding a name to that import is safe. Step 4 of 9-b still diffs the copy to confirm.

- **Do not run prettier on the i18n JSON.** `upstream/web/.prettierrc` sets `jsonRecursiveSort: true`, which would re-sort all of `upstream/i18n/*.json`. ESLint uses `eslint-config-prettier` only, so it does not enforce formatting; formatting the `.svelte`/`.ts` files with prettier is optional.

Common commands (from repo root):

- Tests: `pnpm --filter immich-web exec vitest run <path relative to upstream/web>`
- svelte-check: `pnpm --filter immich-web exec svelte-check`. Expect 30 errors / 1 warning (baseline); no new errors.
- Lint: `pnpm --filter immich-web exec eslint --max-warnings 0 <paths relative to upstream/web>`

---


### Dropped / cross-task — nhóm 1-2-5
#### Dropped findings

| Finding (nguồn) | Phần bỏ | Lý do |
|---|---|---|
| B (Medium) Overlay navbar and strip ignore landscape safe-area insets | Phần `.mobile-preview-strip-host`, `#stack-slideshow`, OCR/activity | `[Inference]` theo CSS Grid §9.1: phần tử absolute có grid-placement (`col-span-4 col-start-1`) lấy grid area làm containing block, mà grid track nằm trong content box của section → đã được `padding-left/right: env(safe-area-inset-*)` của `.immich-asset-viewer--mobile` đẩy vào. OCR/activity nằm trong `data-viewer-content` (grid item in-flow) → cũng đã inset. Thêm padding nữa sẽ inset hai lần. Chỉ navbar overlay (absolute, không placement) bị lỗi → sửa ở Task 2-b. Ngoài ra strip đã `display:none` ở landscape ≤500px cao. |
| B (Medium) OCR button … collide with filmstrip | Đề xuất "plus `z-30`" | `data-viewer-content` là `relative z-[-1]` → tạo stacking context; z-index của OCR bên trong không thể vượt strip host (z-20, sibling). Chỉ sửa bằng margin theo `--mobile-preview-strip-offset`. |
| B (Low) Stack thumbnails strip … "no z-index so it can overlap OCR/chrome" | Phần z-index | `#stack-slideshow` là sibling sau `data-viewer-content` (z −1) nên đã vẽ trên OCR/video chrome; thêm z-index không đổi kết quả. Phần safe-area/mb-16 vẫn sửa ở 2-b. |
| A (Low) Content top offset `top-16` … "Same for `.fixed.top-0.z-2`" | Selector `html[data-mobile-shell] .fixed.top-0.z-2` (mobile-shell.css:120) | Rule này chỉ thêm `padding-top: env(safe-area-inset-top)`, không có lệch hình học; chỉ là coupling class dễ vỡ, không có lỗi hiển thị để sửa trong phạm vi Task 5. |
| A (Low) SwipeBackEdge … "competes with iOS Safari's native edge-swipe back" | Phần xung đột cử chỉ native | `touch-action` không chặn được cử chỉ back của Safari `[Inference]`; trong PWA standalone không có cử chỉ đó. Phần còn lại (top 64px, `touch-action:none`, width) sửa ở 2-a. |
| B (Medium) Viewport meta disables user zoom (audit-B; cũng là H4) | Toàn bộ | Không thuộc Task 1/2/5 và mâu thuẫn quyết định của user (GIỮ chặn pinch-zoom, không đổi viewport meta). |
| C (High) H1 — phương án "ẩn `.pg-gallery-fabs` khi `$isUploading`" | Phương án thay thế | Không chọn: nút "+" vẫn hữu ích khi đang upload (thêm file). Dùng phương án xếp chồng (panel trên hàng FAB) đo chiều cao thật. |

Chuyển sang task khác (không bỏ, chỉ không làm ở đây):
- C (Medium) Upload bubble buttons have no accessible names → **Task 7** (ownership "upload bubble aria-labels"); `aria-labelledby={$t('upload_concurrency')}` (UploadPanel.svelte:151) → Task 7.
- C (Low) Gallery FAB cluster: hover-gated hint (`.pg-whats-new-pin__label` ellipsis không tooltip) → **Task 4** ("FAB hint").
- C (Low) `.pg-whats-new-pin__dismiss` 28px → **Task 3**.
- B (Low) MobilePreviewStrip `aria-label="Filmstrip"` hard-code; `scrollCurrentIntoView('smooth')` → **Task 9**.
- C (Low) chuỗi tiếng Việt hard-code ở blocked page (thực tế dòng 7, không phải :54) → **Task 9**.

---

#### Cross-task notes

| File | Task này sửa (selector / vùng) | Task khác cũng sửa |
|---|---|---|
| `custom/src/styles/mobile-shell.css` | **T1**: `:root` đầu file (thêm `--pg-gallery-fabs-height`, `--pg-gallery-fabs-gap`); block `.pg-upload-panel-mobile` / `html[data-mobile-shell] .pg-upload-panel-mobile` (+ rule mới `.pg-upload-panel-desktop`, `html[data-gallery-fabs] …`). **T5-a**: `html[data-mobile-shell], :root:has(.pg-mobile-bottom-nav)` (biến nav), `.pg-mobile-content` (+ `@media (max-width: 639px)`, `.pg-mobile-toolbar` mới), xóa `html[data-mobile-shell] main .absolute.flex.h-16.w-full`, `.pg-mobile-bottom-nav__label` font-size, `@media (orientation: landscape) and (max-height: 500px)` (biến + comment label) | **T3**: `.pg-mobile-header__actions`, `.pg-mobile-header__lang` (touch target header). **T9**: `backdrop-filter` ở `#dashboard-navbar` và `.pg-mobile-bottom-nav`. Không trùng selector với T1/T5. Lưu ý cho T3: nếu đổi `.pg-mobile-bottom-nav__item` padding/min-height thì phải cập nhật lại `--mobile-bottom-nav-height` (T5-a tính 54px / 45px từ padding 12 + icon 28 + gap 2 + label 11 + border 1). |
| `branding/src/fluent/viewer.css` | **T2-b**: thêm 2 rule trong `@media (pointer: coarse), (max-width: 767px)` sau rule `.video-mobile-chrome { padding-bottom: 0 }` | **T9** ("stacked 48px blur backdrops"): rule `body.asset-viewer-open nav, … [role="toolbar"] { backdrop-filter: blur(12px) }` — khác selector. |
| `overrides/lib/components/asset-viewer/AssetViewer.svelte` | **T2-a**: import helper, `isViewerPanelOpen`, `<SwipeBackEdge enabled>`, class `#detail-panel`, class `#activity-panel`, CSS `.asset-viewer-sheet`. **T2-b**: `class:immich-asset-viewer--has-strip`, wrapper ActivityStatus/OcrButton, strip host, CSS biến offset/stack, navbar padding, `#stack-slideshow`, landscape | **T9**: `transition:fly={{ duration: 150 }}` trên `#detail-panel`/`#activity-panel` (thêm `motionDuration`) — cùng phần tử, khác thuộc tính; anchor bằng `id="detail-panel"` / `id="activity-panel"`. |
| `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte` | **T2-b**: chuỗi class `'opacity-70 hover:opacity-90 …'` của button thumb | **T9**: `aria-label="Filmstrip"`, `aria-label` của button (cùng `<button>`, khác attribute), `scrollCurrentIntoView('smooth')`. |
| `custom/src/routes/UploadPanel.svelte` | **T1**: class div `fixed z-60`, class inner panel, wrapper bubble (`relative`), class 2 badge | **T7**: `aria-label` cho 3 button bubble (cùng các `<button>` T1 đổi class — anchor theo `onclick={() => (showDetail = true)}` + text `$remainingUploads` / `$stats.errors` / `mdiCloudUploadOutline`), `aria-labelledby` của `#upload-concurrency`. |
| `custom/src/components/FeatureUpdatePin.svelte` | **T1**: `$effect` data-gallery-fabs, `bind:offsetHeight`, bỏ `role="group"`/`aria-label` trên `.pg-gallery-fabs`, CSS `.pg-gallery-fabs` (`inset-inline-end`, `max-width`, RTL) | **T3**: `.pg-whats-new-pin__dismiss` 28px; **T4**: hint/label hover-only của pin. Chiều cao cụm được đo (`--pg-gallery-fabs-height`) nên T3/T4 đổi kích thước nút không làm hỏng vị trí upload panel. |
| `overrides/lib/components/mobile/MobileBottomNav.svelte` | **T5-a**: `aria-label={item.title}` trên item `<a>` và `<button>` favorites | **T7** ("bottom-nav/language toggle labels", "favorites popup role=menu"): tên truy cập cho item bottom-nav đã xong ở T5-a — T7 chỉ còn language toggle (NavigationBar) và `role="menu"` của `.pg-mobile-favorites-menu`. |
| `overrides/lib/components/layouts/UserPageLayout.svelte` | **T5-a**: `hasTitleClass` (mobile `top-12`), `toolbarClass` trên div toolbar | Không thấy task khác trong map. |
| `custom/src/styles/custom.css` | **T5-b**: block `.pg-server-error, .pg-maintenance` (`align-items`), `.pg-maintenance__content, .pg-server-error__content` (`margin-block`), `@media (max-height: 480px)` mới trước `@media (max-width: 360px)` | **T3**: `.pg-stale-chunk-reload` padding (touch target). **T9**: `html:not(.immich-allow-motion)` (escape hatch chết). Quyết định user: KHÔNG đụng `html, body { touch-action: pan-x pan-y }`. |
| `custom/src/routes/(user)/blocked/+page.svelte` | **T5-b**: viết lại file (giữ nguyên chuỗi tiêu đề tiếng Việt) | **T9**: chuyển chuỗi "Trang web đã dừng hoạt động" (cả `+page.ts` `meta.title`) sang `$t()` — anchor theo nội dung `<h1 class="text-2xl font-semibold">`. |
| `overrides/lib/components/shared-components/SwipeBackEdge.svelte` | **T2-a**: CSS `.pg-swipe-back-edge` | Không thấy task khác. |

Phụ thuộc thứ tự: T2-a trước T2-b (2-b neo vào style T2-a thêm); T1 trước T5-a (cùng file `mobile-shell.css`, khác block). T5-b độc lập với T1/T2/T5-a.


### Dropped / cross-task — nhóm 3-4-6
#### Dropped findings

| Finding (report) | Why not fixed |
|---|---|
| A: Admin/desktop sidebar nav items are 36px high, forced with `!important` (`branding/src/fluent/navigation.css:46-51`) | Wrong for the running app: `navigation.css` is not imported anywhere (custom.css import chain + grep). The live `responsive.css:13-16` already sets `#sidebar a { min-height: 44px }` under `(pointer: coarse)`, and no live rule overrides it. |
| A: Admin hamburger 32px — the `#top-menu-button { min-width/height: 32px }` rule and the admin navbar layout change (`grid-cols-[auto_minmax(0,1fr)]`, move Cast/ThemeButton below `sm`) | The 32px rule is in dead `navigation.css`. The live hamburger (`IconButton size="medium"`, 40×44 oval on coarse) is fixed by Task 3's icon-button rule. Layout part: computed from code, the left column (`mx-4` + 44px button + gap + 48px icon logo) is already ~128px, so `auto` would not free space; the right section at 360px is search 44 + theme 44 + bell 44 + avatar ~48 + gaps ≈ 192px of ~208px available. Cast only renders when a cast target exists `[Inference]`. Not verified on a device; no change planned. |
| A: Mobile header — "use `size="medium"` for ThemeSwitcher" sub-fix | Not needed: Task 3's square rule renders the `size="small"` switcher at 44×44 on coarse pointers; fine pointers keep 32px. |
| C: Feature-update modal "notify change" button ~18px (`FeatureUpdateModal.svelte:570-581`) | Already 44px tall on coarse: its scoped CSS sets no `min-height`, so `responsive.css` `button:not([disabled]) { min-height: 44px }` applies. |
| C: SharedLinkExpiration `Button size="tiny"` presets | Same: `@immich/ui` tiny is `px-3 py-1`, no `min-height`, so the global coarse rule gives 44px height; widths are text-driven (>44px). |
| C: `.pg-stale-chunk-reload` ~38px (`custom.css:145-154`) | Same: no `min-height` in that unlayered rule, global coarse rule applies (44px). |
| C: Shared-favorites filter chips ~32px high | Same: chips are `<button>` without `min-height`, already 44px on coarse. (The `aria-pressed` half of the finding is kept in Task 3.) |
| C: Shared-favorites whole-list render (no virtualization, 6-wide `getAssetInfo` batches) | Not a layout/touch fix; it is a rendering/perf refactor whose cost is `[Inference]` (unmeasured). Out of scope for Tasks 3/4/6; recommend a separate perf task with measurement. |
| C: Album table widths sum to 105% at `xl` | Header widths come from upstream `upstream/web/src/lib/utils/album-utils.ts:63-88` (not overridden; would need a `patches/` change). Header and rows use the same widths in the same flex layout, so both shrink identically and stay aligned. Only the `truncate` half is kept (6-c). |
| B: "Desktop mouse path <768px jumps to 4 columns" (part of grid finding) | Intended compact path (`isNarrowViewport() \|\| isCoarsePointer()`); unchanged by design. The tablet sizing part is fixed in 6-a. |

#### Cross-task notes

| File | Tasks | Selectors / lines this plan touches |
|---|---|---|
| `custom/src/components/FeatureUpdatePin.svelte` | 1, 3, 4-b | 3: dismiss `<button … class="pg-whats-new-pin__dismiss">` markup, `.pg-whats-new-pin__dismiss { position: relative;` and a new coarse `.pg-whats-new-pin { gap }` block inserted before `.pg-whats-new-pin:has(…:hover)`. 4-b: `<div class="pg-gallery-fabs" role="group" …>`, `title=` on `.pg-whats-new-pin__open`, the `right:` and `max-width:` property lines of `.pg-gallery-fabs`, the `:has(.pg-whats-new-pin__open:hover)` selector. Task 1 (FAB/upload collision) likely edits `.pg-gallery-fabs` `bottom`/`z-index`/structure; edits here anchor on single property lines. |
| `custom/src/styles/mobile-shell.css` (+ `upstream/web/static/mobile-shell.css`) | 1, 3, 5 | 3: `.pg-mobile-header__actions { gap }` and a new coarse `.pg-mobile-header__lang` block before `.pg-mobile-header__lang-sep`. Task 1 owns `.pg-gallery-fabs` / `.pg-upload-panel-mobile` rules; Task 5 owns `.pg-mobile-content`, nav height vars, bottom-nav label rules. |
| `branding/src/fluent/responsive.css` | 3 (2 depends) | 3 rewrites the `@media (pointer: coarse)` block (adds square icon-button rule + `.pg-touch-target`). Task 2's video controls (`media-*-button`) are custom elements, not matched by these `button`/`a` selectors. |
| `branding/src/m3/search-filter.css` | 3, 7, 9 | 3: new coarse block before `.pg-people-filter input`, `.pg-search-display-options__item/__label` rules and the `min-width: 640px` block. Task 7: `:focus-within` input focus (lines ~120-126). Task 9: `min(40vh, 18rem)` (line ~200). |
| `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte` | 3, 4-b, 6-c | 3: chip `aria-pressed`, remove button class. 4-b: import `LikedByStack`, card `@container`, replaces the avatar-stack `<div class="pointer-events-none absolute inset-e-2 bottom-2 flex">` block, drops `UserAvatar` import. 6-c: grid class string (`xl:grid-cols-6` → `+ 2xl:grid-cols-8`). |
| `overrides/lib/components/assets/thumbnail/Thumbnail.svelte` | 4-a, 9 | 4-a: props, focus state/handlers, container `onfocus/onblur`, select/preview button blocks, hover-link `aria-label`. Task 9 (reduced-motion for Svelte `fade`) touches `in:fade={{ duration: 100 }}` at the selection-candidate overlay and preview button — anchor on those attributes, not line numbers. |
| `overrides/lib/components/timeline/Timeline.svelte` | 4-a, 9 | 4-a: one line `selectionMode=…` after the `onPreview=` prop. Task 9: `scrollBy({ behavior: 'smooth' })`. |
| `overrides/lib/components/album-page/AlbumsTableRow.svelte` | 6-c, 7 | 6-c: name `<td>` class (`text-ellipsis` → `truncate`). Task 7 (row keyboard + "more" button) may wrap the name content in `<a>`; `truncate` on the `<td>` still applies. |
| `custom/src/routes/(user)/albums/AlbumsControls.svelte`, `+page.svelte` | 6-c, 7 | 6-c: expand/collapse wrapper class; new row in `+page.svelte` `xl:hidden` block. Task 7: create-album / covers / list Button accessible names (`<p class="hidden md:block">`, `<Text class="hidden md:block">`). |
| `custom/src/routes/(user)/dashboard/+page.svelte` | 6-b, 7, 9 | 6-b: container class, two header `div` classes, heatmap wrapper, new `scrollHeatmapToLatest` + `<style>`. Task 7: `toneClass` map and status pill `-400` tones. Task 9: hard-coded Vietnamese strings / `'vi-VN'` (6-b keeps those strings as is). |
| `upstream/i18n/en.json`, `upstream/i18n/vi.json` | 4-a, 7, 8, 9 | 4-a adds `timeline_select_day` right after `timeline`. Later tasks add their own keys; keep alphabetical order. |
| `overrides/lib/components/shared-components/MobileThumbnailHint.svelte` | 3 only | Full-file rewrite in 3. |
| `overrides/lib/stores/grid-density.svelte.ts` | 6-a only | Full-file rewrite. |

#### Decision needed (for the controller / user)

- **Phone default grid columns (Task 6-a).** Today, users who never pinched get **3** columns because `Number(null)` parses to 0 and is clamped to 3; the constant `GRID_COLUMNS_DEFAULT = 4` was the intent and the audit assumed 4. The plan fixes the parse, so those users would see **4** columns on phones after this change. If the current 3-column look should stay, change `GRID_COLUMNS_DEFAULT` to `3` in 6-a (and the test expectations `getDefaultGridColumns(390/767) → 3`, `resolveGridColumns(390, 0) → 3`, `(390, 2) → 5`, legacy migration offsets `+1`) instead.


### Dropped / cross-task — nhóm 7-8-9
#### Dropped findings

| Finding (source) | What is not planned | Why |
|---|---|---|
| D Low: No fluid typography / responsive type scale | The whole finding | `git grep -n "typescale-display\|typescale-headline" -- custom overrides branding/src/m3` finds no consumer outside `m3/typography.css`, so `clamp()` would change nothing on screen. A `size-adjust` fallback `@font-face` needs real SF Pro metrics, which are not in the repo. The audit itself says it matters only if those tokens are used. |
| A Low: Language toggle / BrandLogo | BrandLogo `alt="WeGallery"` i18n; BrandLogo `size` vs `variant="inline"` height clash and the 256px `landing` size | `WeGallery` is the product name and is the same in every locale, so it is correct alt text. The size and variant clash is a layout issue outside Tasks 7–9 and no task in the map owns it. The language-toggle part is fixed in 7-c. |
| C Medium: Login inputs defeat OS/browser input assistance | `type="password"`, a valid `autocomplete` token, and a `<form onsubmit>` wrapper | Conflicts with the binding user decision to keep the anti-password-manager design (`autocomplete="nope"`, `data-*-ignore`, masked text field). Only `inputmode` and `enterkeyhint` are added (Task 8). |
| D Low: Modal-wide forced fullscreen selector | Adding `interactive-widget=resizes-content` to the viewport meta | The user decided not to change the viewport meta. The selector-scope part is fixed in 9-d. |
| A Low: EmptyPlaceholder | Extra `focus-visible` styling on the button variant | Already covered: the `<button>` variant matches `states.css` `button:focus-visible` (global ring), which after 7-a is solid primary, ≥ 5.6:1 on `surface-container`. |
| C Low Misc: favorites share toggle | Showing the subtitle as visible helper text on touch | The subtitle is about 130 characters and sits in the page-header `buttons` snippet (`max-w-72`). Making it visible on touch is a layout or design choice (inline text, info button or popover) that needs a decision. 7-c exposes it to screen readers through `aria-describedby` and names the Switch, which had no programmatic name before. |
| D Medium: Person-filter icon buttons forced to 36px with `!important` | Not mine | This finding is in the Task 3 map. Its `search-filter.css` lines (162-172) are different from mine (120-126, 200). |

These are corrections to the audit, not drops; the findings are still fixed:
- **A Low: search input 14px.** The cited source `branding/src/fluent/navigation.css:118` is not imported. The real cause is the `text-sm` on `#dashboard-navbar`, inherited by the input. Fixed in Task 8 with `text-base` on the input.
- **D Low (reduced-motion) and Checked list:** "CSS blanket rule also covers svelte slide/fly" is wrong for Svelte 5, which uses `element.animate`. Handled in 9-b.
- **Audit A/B mention `fluent/globals.css` as the active reduced-motion rule.** It is dead; the active one is `custom/src/styles/custom.css`.

Counts:
- 31 audit findings in my groups are covered; 30 are fully or partly planned.
- 1 finding is fully dropped (D fluid typography).
- 5 findings are partly dropped (BrandLogo; login type/form; viewport meta; EmptyPlaceholder focus; favorites touch helper).
- 1 finding is deferred to its owner (D person-filter, Task 3).

---

#### Cross-task notes

| File | Other task(s) | Their area | My area (anchor) |
|---|---|---|---|
| `custom/src/routes/(user)/dashboard/+page.svelte` | Task 6 (heatmap min-width, storage header `flex-wrap`, `max-w-6xl`/`2xl`) | layout classes around lines 58, 77, 120 | 7-a: `toneClass` map, server pill classes, info icon class. 9-c: string literals, `statCards`, `formatSessionTime`, imports |
| `branding/src/m3/search-filter.css` | Task 3 (person-filter 36px rule ~162-172, display-options rows ~218-243) | those selectors | 7-a: `.ant-search-filter-modal__section input:focus-within…` block (~120-126). 9-d: `max-height: min(40vh, 18rem)` (~200) |
| `custom/src/styles/mobile-shell.css` | Task 1 (upload panel/FAB offsets ~128-138), Task 3 (header controls ~53-64), Task 5 (landscape var ~396-410, content padding ~89-92, `top-16` selectors ~120-126) | those rules | 9-d: the `background-color` + two `backdrop-filter` lines in `#dashboard-navbar` (~23-25) and `.pg-mobile-bottom-nav` (~187-189) only |
| `overrides/lib/components/mobile/MobileBottomNav.svelte` | Task 5 (landscape labels → `aria-label` on nav `<a>`/`<button>`) | item `<a>` and the favorites trigger attributes | 7-c: favorites popup `<div role="menu">`, `role="menuitem"`, trigger `aria-haspopup` → `aria-controls` + `bind:this`, `onEscape`. Keep any `aria-label` Task 5 added. |
| `overrides/lib/components/shared-components/navigation-bar/NavigationBar.svelte` | Task 3 (ThemeSwitcher `size`, lang button size) | `ThemeSwitcher size=…`, CSS classes | 7-c: the `aria-label={$t('language')}` line only |
| `custom/src/routes/UploadPanel.svelte` | Task 1 (panel position, `isMobilePanel` width on tablets, FAB collision), possibly badge position | wrapper `class="fixed z-60 …"`, `isMobilePanel` | 7-c: `aria-labelledby` line on `#upload-concurrency`; the three collapsed-bubble `<button>`s (`aria-label`, badge `grid … place-items-center`, no `p-5`). If Task 1 moved the badges, apply the same attribute and class change to the moved buttons. |
| `custom/src/components/MaintenancePage.svelte` | Task 5 (clipping in short viewports, mostly CSS in `custom.css` `.pg-maintenance`) | layout | 7-c: root `role`/`aria-live` attributes only |
| `custom/src/routes/(user)/blocked/+page.svelte` | Task 5 (rewrite: `min-h-dvh`, tokens, sign-out link) | whole page | 9-c: replace the title literal with `$t('pg_blocked_title')`; skip if Task 5 already did |
| `custom/src/routes/(user)/albums/AlbumsControls.svelte` | Task 6 (expand/collapse at `xl` only) | `<div class="hidden gap-0 xl:flex">` block | 7-b: the three `hidden md:block` labels and the `Text` import |
| `overrides/lib/components/asset-viewer/AssetViewer.svelte` | Task 2 (detail panel layout, navbar, SwipeBackEdge, OCR/activity offsets) | panel classes and markup | 9-b: `duration` inside the two `transition:fly` on `#detail-panel` / `#activity-panel`, plus one import line |
| `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte` | Task 2 (filmstrip button `focus-visible` ring, maybe offset) | button `class=` string | 9-b: `scrollIntoView` behaviour + import. 9-c: `aria-label`s, `{#each … , index}`, `thumbLabel`, `t` import |
| `overrides/lib/components/assets/thumbnail/Thumbnail.svelte` | Task 4 (select/preview buttons on touch, sizes, `$t` labels for "Preview asset"/"Thumbnail URL") | those buttons | 9-b: every `fade={{ duration: 100 }}` and the import list only. The hard-coded English labels in Thumbnail belong to Task 4, not 9-c. |
| `overrides/lib/components/shared-components/search-bar/*` | Task 3 (person-filter, display-options hit areas) | `SearchDisplaySection`, CSS | 7-b: `SearchPeopleSection` tile button. 8: `SearchDateSection` labels, `SearchBar` `<input>` attributes and `text-base` |
| `overrides/lib/elements/DateInput.svelte` | The consolidated audit's group 3 also lists the DateInput calendar 20px button | — | The task map assigns it to Task 8. If Task 3 already enlarged `.pg-date-input__picker`, keep one rule: the Task 8 block replaces the whole `__text`/`__picker`/`:hover` CSS. |
| `branding/src/fluent/navigation.css` | Task 3 (audit A cites it for sidebar items 36px `!important`, `#top-menu-button` 32px, search 14px) | — | **This file is not imported anywhere** (grep evidence in 9-a), so edits there change nothing at runtime. 9-a deletes it. Task 3 should put those fixes in an active file (`m3/shell.css`, `fluent/responsive.css` or `mobile-shell.css`). If Task 3 did edit `navigation.css`, the 9-a deletion removes that no-op edit; re-check the Task 3 diff before running 9-a. |
| `upstream/i18n/en.json`, `vi.json` | Any task adding keys (Tasks 2–6 may add `pg_*` keys) | — | 7-c, 8 and 9-c all insert right after the `pg_maintenance_description` line, so blocks stack and do not collide. Before inserting, check that no earlier task added a key with the same name (`grep -n '"pg_<name>"' upstream/i18n/en.json`). |
| `custom/src/styles/custom.css` (+ copy `upstream/web/static/custom.css`) | Task 5 (MaintenancePage `.pg-maintenance` rules, maybe) | `.pg-maintenance*` | 9-b: the `@media (prefers-reduced-motion: reduce)` selector lines only. Leave `touch-action: pan-x pan-y` on `html, body` as it is (user decision). |

Not covered by any task in my groups:
- The AlbumsTableRow column widths at `xl` add up to 105 % (`xl:w-[30%]` + 5 × `xl:w-[15%]`, audit C Low).
- A Low "Bottom nav label 10px" font size, unless Task 5 picks it up.


## Tasks

### Task 1 (nhóm 1): Va chạm phần tử fixed trên mobile (upload panel vs cụm FAB)

**Findings covered:**
- C (High, H1): Upload panel / progress bubble sits under the gallery FAB cluster on mobile (cũng chồng trên desktop cho user thường)
- C (Medium): Upload panel renders full-width on tablets / iPad landscape
- C (Medium): Upload bubble buttons … badge sizing is broken — phần **badge sizing** (`size-10` + `p-5`) và badge neo sai chỗ; phần `aria-label` thuộc Task 7 (xem Cross-task notes)
- C (Low): Gallery FAB cluster: physical `right`, wrong group label — phần `right`/`100vw`/group label; phần hint hover-gated thuộc Task 4

Xác nhận lại trong code:
- `custom/src/routes/UploadPanel.svelte:77-79` `class="fixed z-60 {isMobilePanel ? 'pg-upload-panel-mobile inset-x-3' : 'inset-e-16 bottom-6'}"`; `:25` `isMobilePanel = pointerCoarse || maxMd` → iPad/landscape nhận panel full-width.
- `custom/src/styles/mobile-shell.css:128-138` FAB và panel cùng `bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem)`.
- `custom/src/components/FeatureUpdatePin.svelte:159-170` `.pg-gallery-fabs { position: fixed; right: max(1rem, …); z-index: 80; max-width: calc(100vw - 2rem) }`, `:107` `role="group" aria-label={$t('upload')}` trong khi cụm còn chứa pin What's new.
- `UploadPanel.svelte:179,188` badge `flex size-10 … p-5` (content box 0px). Thêm phát hiện khi đọc lại: wrapper `:174` `<div class="rounded-full {isMobilePanel ? 'ms-auto w-fit' : ''}">` **không có `relative`**, nên badge `absolute -inset-s-4 -top-4` neo vào div `fixed` ngoài cùng — trên mobile div đó rộng full (`inset-x-3`) nên badge số lượng nằm ở mép trái màn hình, xa bubble ở mép phải `[Inference]` (suy ra từ CSS).
- `[Inference]` Trên `(pointer: coarse)`, `branding/src/fluent/responsive.css:6-11` ép `button { min-height: 44px }` nên pin What's new cao ~58px chứ không phải 44px → không thể hard-code chiều cao hàng FAB; plan đo chiều cao thật bằng `bind:offsetHeight`.

**Files:**
- Modify: `custom/src/routes/UploadPanel.svelte` (lớp vị trí desktop/mobile, panel 24rem trên tablet cảm ứng, inner flex-col giới hạn chiều cao cho mọi panel mobile, wrapper bubble `relative`, badge `grid place-items-center` bỏ `p-5`)
- Modify: `custom/src/components/FeatureUpdatePin.svelte` (đặt `data-gallery-fabs` + `--pg-gallery-fabs-height` lên `<html>`; `inset-inline-end`; `max-width` theo safe-area; bỏ `role="group"`/`aria-label` sai)
- Modify: `custom/src/styles/mobile-shell.css` (biến FAB trong `:root` đầu file; rule `bottom` cho panel khi có FAB)
- Create: `custom/src/routes/UploadPanel.spec.ts`
- Test (copy): `upstream/web/src/routes/UploadPanel.spec.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - Attribute `html[data-gallery-fabs]` — có mặt khi cụm FAB (`.pg-gallery-fabs`) đang render.
  - CSS custom properties trên `:root`: `--pg-gallery-fabs-height` (mặc định `2.75rem`, FeatureUpdatePin ghi đè bằng chiều cao đo được, đơn vị px, inline trên `<html>`), `--pg-gallery-fabs-gap` (`0.75rem`).
  - Class `pg-upload-panel-desktop` (thay `bottom-6` trên panel desktop).

- [ ] **Step 1: Write the failing test**

Tạo `custom/src/routes/UploadPanel.spec.ts`:

```ts
import { fireEvent } from '@testing-library/svelte';
import { uploadAssetsStore } from '$lib/stores/upload';
import { renderWithTooltips } from '$tests/helpers';
import UploadPanel from './UploadPanel.svelte';

const mediaQuery = vi.hoisted(() => ({
  pointerCoarse: false,
  maxMd: false,
  isFullSidebar: true,
  isMobileShell: false,
  reducedMotion: false,
}));

vi.mock('$lib/stores/media-query-manager.svelte', () => ({ mediaQueryManager: mediaQuery }));

const addUpload = () =>
  uploadAssetsStore.addItem({ id: 'upload-1', file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }) });

const panelRoot = () => document.querySelector<HTMLElement>('.fixed.z-60');

describe('UploadPanel', () => {
  afterEach(() => {
    uploadAssetsStore.reset();
    mediaQuery.pointerCoarse = false;
    mediaQuery.maxMd = false;
  });

  it('desktop: dùng lớp vị trí pg-upload-panel-desktop thay cho bottom-6 cố định', () => {
    addUpload();
    renderWithTooltips(UploadPanel, {});

    const root = panelRoot();
    expect(root).toHaveClass('pg-upload-panel-desktop', 'inset-e-16');
    expect(root).not.toHaveClass('bottom-6');
  });

  it('tablet cảm ứng (≥768px): panel neo cạnh cuối, rộng 24rem thay vì full-width', () => {
    mediaQuery.pointerCoarse = true;
    addUpload();
    renderWithTooltips(UploadPanel, {});

    expect(panelRoot()).toHaveClass('pg-upload-panel-mobile', 'inset-x-3', 'md:inset-s-auto', 'md:w-96');
  });

  it('panel mobile: inner là flex-col có max-h, không phụ thuộc breakpoint max-md', () => {
    mediaQuery.pointerCoarse = true;
    addUpload();
    renderWithTooltips(UploadPanel, {});

    const inner = panelRoot()?.firstElementChild;
    expect(inner).toHaveClass('flex', 'flex-col', 'max-h-[min(70dvh,32rem)]', 'overflow-hidden');
    expect(inner).not.toHaveClass('max-md:max-h-[min(70dvh,32rem)]');
  });

  it('bubble thu gọn: badge neo vào bubble (wrapper relative) và không dùng p-5', async () => {
    mediaQuery.maxMd = true;
    addUpload();
    const { getByLabelText, getByText } = renderWithTooltips(UploadPanel, {});

    await fireEvent.click(getByLabelText('minimize'));

    const badge = getByText('1').closest('button');
    expect(badge).toHaveClass('grid', 'size-10', 'place-items-center');
    expect(badge).not.toHaveClass('p-5');
    expect(badge?.parentElement).toHaveClass('relative', 'ms-auto', 'w-fit');
  });
});
```

FeatureUpdatePin (`custom/src/components/`) không nằm dưới `upstream/web/src` nên không có spec; kiểm bằng grep ở Step 5.

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/routes/UploadPanel.spec.ts
```

Kỳ vọng: 4 test FAIL —
1. `Expected the element to have class: pg-upload-panel-desktop inset-e-16` (hiện có `inset-e-16 bottom-6`);
2. thiếu `md:inset-s-auto md:w-96`;
3. inner có `max-md:max-h-[min(70dvh,32rem)]`, không có `flex flex-col`;
4. badge có `p-5`/`flex`, wrapper thiếu `relative`.

- [ ] **Step 3: Implement**

**3a. `custom/src/routes/UploadPanel.svelte`**

Old:
```svelte
    class="fixed z-60 {isMobilePanel
      ? 'pg-upload-panel-mobile inset-x-3'
      : 'inset-e-16 bottom-6'}"
  >
    {#if showDetail}
      <div
        in:scale={{ duration: 250, easing: quartInOut }}
        class="rounded-xl border border-gray-200 bg-subtle p-3 text-sm shadow-xs max-md:max-h-[min(70dvh,32rem)] max-md:overflow-hidden dark:border-subtle {isMobilePanel
          ? 'w-full max-w-full'
          : 'w-81 p-4'}"
      >
```
New:
```svelte
    class="fixed z-60 {isMobilePanel
      ? 'pg-upload-panel-mobile inset-x-3 md:inset-s-auto md:w-96'
      : 'pg-upload-panel-desktop inset-e-16'}"
  >
    {#if showDetail}
      <!-- Mobile/tablet/landscape: flex-col + max-h để list tự co, không tràn khỏi viewport thấp -->
      <div
        in:scale={{ duration: 250, easing: quartInOut }}
        class="rounded-xl border border-gray-200 bg-subtle p-3 text-sm shadow-xs dark:border-subtle {isMobilePanel
          ? 'flex max-h-[min(70dvh,32rem)] w-full max-w-full flex-col overflow-hidden'
          : 'w-81 p-4'}"
      >
```

Old:
```svelte
      <div class="rounded-full {isMobilePanel ? 'ms-auto w-fit' : ''}">
        <button
          type="button"
          in:scale={{ duration: 250, easing: quartInOut }}
          onclick={() => (showDetail = true)}
          class="absolute -inset-s-4 -top-4 flex size-10 place-content-center place-items-center rounded-full bg-primary p-5 text-xs text-light"
        >
          {$remainingUploads.toLocaleString($locale)}
        </button>
        {#if $stats.errors > 0}
          <button
            type="button"
            in:scale={{ duration: 250, easing: quartInOut }}
            onclick={() => (showDetail = true)}
            class="absolute -inset-e-4 -top-4 flex size-10 place-content-center place-items-center rounded-full bg-danger p-5 text-xs text-light"
          >
```
New:
```svelte
      <!-- relative: badge neo vào bubble, không neo vào div fixed full-width trên mobile -->
      <div class="relative rounded-full {isMobilePanel ? 'ms-auto w-fit' : ''}">
        <button
          type="button"
          in:scale={{ duration: 250, easing: quartInOut }}
          onclick={() => (showDetail = true)}
          class="absolute -inset-s-4 -top-4 grid size-10 place-items-center rounded-full bg-primary text-xs text-light"
        >
          {$remainingUploads.toLocaleString($locale)}
        </button>
        {#if $stats.errors > 0}
          <button
            type="button"
            in:scale={{ duration: 250, easing: quartInOut }}
            onclick={() => (showDetail = true)}
            class="absolute -inset-e-4 -top-4 grid size-10 place-items-center rounded-full bg-danger text-xs text-light"
          >
```

**3b. `custom/src/components/FeatureUpdatePin.svelte`**

Old:
```ts
  const showCluster = $derived(showUpload || showWhatsNew);
```
New:
```ts
  const showCluster = $derived(showUpload || showWhatsNew);
  let clusterHeight = $state(0);

  // Báo cho UploadPanel (mobile-shell.css) cụm FAB đang hiện + chiều cao thật (pointer coarse ép button 44px)
  // để đặt panel/bubble ngay trên hàng FAB, không bị FAB z-80 che.
  $effect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-gallery-fabs', showCluster);
    if (showCluster && clusterHeight > 0) {
      root.style.setProperty('--pg-gallery-fabs-height', `${clusterHeight}px`);
    }

    return () => {
      root.removeAttribute('data-gallery-fabs');
      root.style.removeProperty('--pg-gallery-fabs-height');
    };
  });
```

Old:
```svelte
    <div class="pg-gallery-fabs" role="group" aria-label={$t('upload')}>
```
New:
```svelte
    <div class="pg-gallery-fabs" bind:offsetHeight={clusterHeight}>
```

Old:
```css
  .pg-gallery-fabs {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right, 0px));
    bottom: max(1rem, env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    max-width: calc(100vw - 2rem);
  }
```
New:
```css
  .pg-gallery-fabs {
    position: fixed;
    inset-inline-end: max(1rem, env(safe-area-inset-right, 0px));
    bottom: max(1rem, env(safe-area-inset-bottom, 0px));
    z-index: 80;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    /* 100% của khối fixed = viewport không gồm scrollbar; trừ cả hai mép safe-area (landscape) */
    max-width: calc(100% - max(1rem, env(safe-area-inset-left, 0px)) - max(1rem, env(safe-area-inset-right, 0px)));
  }

  /* RTL: cụm nằm mép trái → dùng inset trái */
  :global(body[dir='rtl']) .pg-gallery-fabs {
    inset-inline-end: max(1rem, env(safe-area-inset-left, 0px));
  }
```

**3c. `custom/src/styles/mobile-shell.css`**

Old:
```css
:root {
  --mobile-bottom-nav-height: 0px;
  --mobile-bottom-nav-offset: 0px;
}
```
New:
```css
:root {
  --mobile-bottom-nav-height: 0px;
  --mobile-bottom-nav-offset: 0px;
  /* Hàng FAB gallery (FeatureUpdatePin ghi đè bằng chiều cao đo được khi hiện) */
  --pg-gallery-fabs-height: 2.75rem;
  --pg-gallery-fabs-gap: 0.75rem;
}
```

Old:
```css
.pg-upload-panel-mobile {
  bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
}

html[data-mobile-shell] .pg-upload-panel-mobile {
  bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem);
}
```
New:
```css
.pg-upload-panel-mobile {
  bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
}

.pg-upload-panel-desktop {
  bottom: 1.5rem;
}

html[data-mobile-shell] .pg-upload-panel-mobile {
  bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem);
}

/*
 * Cụm FAB đang hiện (html[data-gallery-fabs], set bởi FeatureUpdatePin): đặt upload panel/bubble
 * ngay trên hàng FAB thay vì cùng mốc bottom — FAB z-80 từng che panel z-60.
 */
html[data-gallery-fabs] .pg-upload-panel-mobile,
html[data-gallery-fabs] .pg-upload-panel-desktop {
  bottom: calc(max(1rem, env(safe-area-inset-bottom, 0px)) + var(--pg-gallery-fabs-height) + var(--pg-gallery-fabs-gap));
}

html[data-mobile-shell][data-gallery-fabs] .pg-upload-panel-mobile {
  bottom: calc(
    var(--mobile-bottom-nav-offset) + 0.75rem + var(--pg-gallery-fabs-height) + var(--pg-gallery-fabs-gap)
  );
}
```

(Giữ nguyên rule `html[data-mobile-shell] .pg-gallery-fabs { bottom: … }` phía trên.)

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```
Kỳ vọng (không có dòng nào khác):
```
 M custom/src/components/FeatureUpdatePin.svelte
 M custom/src/routes/UploadPanel.svelte
 M custom/src/styles/mobile-shell.css
 M upstream/web/src/routes/UploadPanel.svelte
 M upstream/web/static/mobile-shell.css
?? custom/src/routes/UploadPanel.spec.ts
?? upstream/web/src/routes/UploadPanel.spec.ts
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run src/routes/UploadPanel.spec.ts
# Kỳ vọng: 4 passed

rg -n "data-gallery-fabs|--pg-gallery-fabs-height|inset-inline-end|role=\"group\"" custom/src/components/FeatureUpdatePin.svelte
# Kỳ vọng: có toggleAttribute('data-gallery-fabs'…), setProperty('--pg-gallery-fabs-height'…), 2 dòng inset-inline-end; KHÔNG có role="group"

rg -n "pg-upload-panel-desktop|data-gallery-fabs|--pg-gallery-fabs" custom/src/styles/mobile-shell.css
# Kỳ vọng: :root có 2 biến; .pg-upload-panel-desktop; 2 rule html[data-gallery-fabs] …

diff -q custom/src/styles/mobile-shell.css upstream/web/static/mobile-shell.css && echo in-sync
# Kỳ vọng: in-sync

pnpm --filter immich-web exec svelte-check
# Kỳ vọng: 30 errors / 1 warning (baseline), không lỗi mới trỏ tới UploadPanel.svelte / UploadPanel.spec.ts

pnpm --filter immich-web exec eslint --max-warnings 0 src/routes/UploadPanel.svelte src/routes/UploadPanel.spec.ts
# Kỳ vọng: không output (exit 0)
```

Kiểm tay (thiết bị/DevTools, `[Unverified]` cho tới khi làm): iPhone 390×844 user thường đang upload — bubble nằm trên nút "+" không chồng; iPad 1024 coarse — panel 24rem bên phải; desktop user thường có pin What's new — panel nằm trên cụm FAB.

- [ ] **Step 6: Commit**

```bash
git add custom/src/routes/UploadPanel.svelte custom/src/routes/UploadPanel.spec.ts \
  custom/src/components/FeatureUpdatePin.svelte custom/src/styles/mobile-shell.css \
  upstream/web/src/routes/UploadPanel.svelte upstream/web/src/routes/UploadPanel.spec.ts \
  upstream/web/static/mobile-shell.css
git commit -F - <<'EOF'
fix(upload): đặt upload panel trên cụm FAB và thu gọn panel trên tablet

Upload panel/bubble mobile dùng cùng mốc bottom với cụm FAB gallery
(FAB z-80 che panel z-60), desktop user thường bị pin What's new chồng lên.
FeatureUpdatePin gắn data-gallery-fabs + --pg-gallery-fabs-height (đo thật,
vì pointer coarse ép button 44px) lên <html>; mobile-shell.css đẩy panel lên
trên hàng FAB. Tablet cảm ứng nhận panel 24rem neo cạnh cuối thay vì
full-width; panel mobile là flex-col có max-h ở mọi bề rộng (landscape).
Badge bubble bỏ p-5 (content box 0px), wrapper relative để badge neo vào
bubble. Cụm FAB dùng inset-inline-end, max-width trừ safe-area, bỏ
role=group mang nhãn "upload" sai.
Spec: UploadPanel.spec.ts cho lớp vị trí desktop/tablet, inner flex-col và badge.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2 (nhóm 2-a): Viewer mobile/tablet — detail/editor/activity panel và SwipeBackEdge

**Findings covered:**
- B (High, H2): Detail panel has no mobile/tablet layout — fixed 360px column in a 4-col grid (gồm editor `w-100`, activity `w-90 md:w-115`)
- B (High, H3): Detail panel header is covered by the mobile navbar overlay
- B (Medium): SwipeBackEdge (z-40, touch-action:none) swallows taps on the left 32px, incl. desktop mouse
- A (Low): SwipeBackEdge: hard-coded 64px top and full-height `touch-action:none` strip

Xác nhận lại trong code:
- `overrides/lib/components/asset-viewer/AssetViewer.svelte` `<section … grid size-full grid-cols-4 … {isMobileViewer ? 'grid-rows-1' : 'grid-rows-[64px_1fr]'}>`; panel `id="detail-panel"` class `'row-span-4 row-start-1 …', showDetailPanel ? 'w-90' : 'w-100'` không có `col-start`/position → tự rơi vào cột ngầm thứ 5; activity panel `row-span-5 row-start-1 w-90 … md:w-115`.
- Navbar mobile `'asset-viewer-navbar--overlay absolute inset-x-0 top-0 z-30'`, panel không có z-index → header/nút đóng của DetailPanel (`upstream/.../DetailPanel.svelte` `<section class="relative p-2">` + `IconButton mdiClose`) nằm dưới navbar.
- `<SwipeBackEdge onBack={closeViewer} enabled={$slideshowState === SlideshowState.None && !assetViewerManager.isShowEditor && !assetViewerManager.isFaceEditMode} />` — không gate theo `isMobileViewer`.
- `overrides/lib/components/shared-components/SwipeBackEdge.svelte:21-28` `inset-block: 64px 0; z-index: 40; width: 32px; touch-action: none;` — 64px nhỏ hơn navbar mobile `3rem + safe-area-top` (~95–107px trên iPhone có notch) nên dải này còn đè lên phần trái navbar (nút Close) và kéo tới đáy (đè filmstrip/video chrome).
- `AssetViewer.spec.ts` upstream đang `it.skip` → không dựa vào việc render AssetViewer trong test; logic được tách thành helper thuần để test.

**Files:**
- Create: `overrides/lib/components/asset-viewer/viewer-panel-layout.ts` (helper `getViewerPanelLayoutClass`, `isSwipeBackEnabled`)
- Create: `overrides/lib/components/asset-viewer/viewer-panel-layout.spec.ts`
- Modify: `overrides/lib/components/asset-viewer/AssetViewer.svelte` (import helper, `isViewerPanelOpen`, gate SwipeBackEdge, class panel detail/editor/activity, CSS `.asset-viewer-sheet`)
- Modify: `overrides/lib/components/shared-components/SwipeBackEdge.svelte` (vị trí dưới navbar/trên filmstrip, rộng 20px, `touch-action: pan-y`, ẩn với chuột)
- Test (copy): `upstream/web/src/lib/components/asset-viewer/viewer-panel-layout.spec.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - Module `$lib/components/asset-viewer/viewer-panel-layout` exports: `type ViewerPanelKind = 'detail' | 'editor' | 'activity'`, `getViewerPanelLayoutClass(kind, isMobileViewer): string`, `type SwipeBackState`, `isSwipeBackEnabled(state): boolean`.
  - Global class `asset-viewer-sheet` (định nghĩa trong `<style>` của AssetViewer) — panel overlay mobile, padding safe-area.
  - SwipeBackEdge đọc `--mobile-preview-strip-offset` (đã có; Task 2-b đổi giá trị).

- [ ] **Step 1: Write the failing test**

Tạo `overrides/lib/components/asset-viewer/viewer-panel-layout.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getViewerPanelLayoutClass, isSwipeBackEnabled, type SwipeBackState } from './viewer-panel-layout';

const KINDS = ['detail', 'editor', 'activity'] as const;

describe('getViewerPanelLayoutClass', () => {
  it('desktop giữ cột cạnh media như upstream', () => {
    expect(getViewerPanelLayoutClass('detail', false)).toBe('row-span-4 row-start-1 w-90');
    expect(getViewerPanelLayoutClass('editor', false)).toBe('row-span-4 row-start-1 w-100');
    expect(getViewerPanelLayoutClass('activity', false)).toBe('row-span-5 row-start-1 w-90 md:w-115');
  });

  it('mobile: overlay absolute z-40 (trên navbar overlay z-30), không còn là cột grid', () => {
    for (const kind of KINDS) {
      const classes = getViewerPanelLayoutClass(kind, true).split(' ');
      expect(classes).toEqual(
        expect.arrayContaining(['asset-viewer-sheet', 'absolute', 'z-40', 'inset-x-0', 'bottom-0', 'w-full']),
      );
      expect(classes).not.toContain('w-90');
      expect(classes).not.toContain('w-100');
      expect(classes.some((name) => name.startsWith('row-'))).toBe(false);
    }
  });

  it('phone: bottom sheet theo dvh; tablet cảm ứng (md): drawer cạnh cuối với bề rộng desktop', () => {
    const detail = getViewerPanelLayoutClass('detail', true).split(' ');
    const editor = getViewerPanelLayoutClass('editor', true).split(' ');
    const activity = getViewerPanelLayoutClass('activity', true).split(' ');

    expect(detail).toEqual(expect.arrayContaining(['max-h-[85dvh]', 'md:max-h-none', 'md:w-90', 'md:inset-e-0']));
    expect(editor).toEqual(expect.arrayContaining(['h-[50dvh]', 'md:h-auto', 'md:w-100']));
    expect(activity).toEqual(expect.arrayContaining(['h-[70dvh]', 'md:h-auto', 'md:w-115']));
  });
});

describe('isSwipeBackEnabled', () => {
  const idle: SwipeBackState = {
    isMobileViewer: true,
    slideshowIdle: true,
    isShowEditor: false,
    isFaceEditMode: false,
    isPanelOpen: false,
  };

  it('bật trên mobile viewer khi không có slideshow/editor/panel', () => {
    expect(isSwipeBackEnabled(idle)).toBe(true);
  });

  it('tắt trên desktop để không nuốt click mép trái', () => {
    expect(isSwipeBackEnabled({ ...idle, isMobileViewer: false })).toBe(false);
  });

  it('tắt khi slideshow đang chạy', () => {
    expect(isSwipeBackEnabled({ ...idle, slideshowIdle: false })).toBe(false);
  });

  it.each(['isShowEditor', 'isFaceEditMode', 'isPanelOpen'] as const)('tắt khi %s', (key) => {
    expect(isSwipeBackEnabled({ ...idle, [key]: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/components/asset-viewer/viewer-panel-layout.spec.ts
```
Kỳ vọng: FAIL ở bước load — `Failed to resolve import "./viewer-panel-layout"` (module chưa tồn tại).

- [ ] **Step 3: Implement**

**3a. Tạo `overrides/lib/components/asset-viewer/viewer-panel-layout.ts`:**

```ts
/**
 * Bố cục panel phụ của asset viewer (info / editor / activity).
 *
 * Desktop: cột cạnh media trong grid `grid-cols-4` của #immich-asset-viewer (giữ như upstream).
 * Mobile viewer — `(pointer: coarse), (max-width: 767px)`, xem branding/src/fluent/viewer.css:
 * overlay `absolute z-40`, không bị auto-place vào cột ngầm thứ 5 (360px ăn hết màn phone) và
 * nằm trên navbar overlay (z-30) nên header/nút đóng của panel không bị che.
 * Phone: bottom sheet; tablet cảm ứng (md+): drawer cạnh cuối.
 */
export type ViewerPanelKind = 'detail' | 'editor' | 'activity';

const DESKTOP_PANEL_CLASS: Record<ViewerPanelKind, string> = {
  detail: 'row-span-4 row-start-1 w-90',
  editor: 'row-span-4 row-start-1 w-100',
  activity: 'row-span-5 row-start-1 w-90 md:w-115',
};

const MOBILE_PANEL_BASE_CLASS =
  'asset-viewer-sheet absolute inset-x-0 bottom-0 z-40 w-full rounded-t-2xl md:inset-x-auto md:inset-y-0 md:inset-e-0 md:rounded-none';

// detail: nội dung tự cao → max-h; editor/activity dùng h-full bên trong nên cần chiều cao xác định
const MOBILE_PANEL_SIZE_CLASS: Record<ViewerPanelKind, string> = {
  detail: 'max-h-[85dvh] md:max-h-none md:w-90',
  editor: 'h-[50dvh] md:h-auto md:w-100',
  activity: 'h-[70dvh] md:h-auto md:w-115',
};

export const getViewerPanelLayoutClass = (kind: ViewerPanelKind, isMobileViewer: boolean): string =>
  isMobileViewer ? `${MOBILE_PANEL_BASE_CLASS} ${MOBILE_PANEL_SIZE_CLASS[kind]}` : DESKTOP_PANEL_CLASS[kind];

export type SwipeBackState = {
  isMobileViewer: boolean;
  slideshowIdle: boolean;
  isShowEditor: boolean;
  isFaceEditMode: boolean;
  isPanelOpen: boolean;
};

/**
 * Vuốt mép để đóng viewer: chỉ mobile viewer (desktop không render dải mép nuốt click),
 * tắt khi panel phụ đang mở để vuốt không đóng nhầm cả viewer.
 */
export const isSwipeBackEnabled = (state: SwipeBackState): boolean =>
  state.isMobileViewer && state.slideshowIdle && !state.isShowEditor && !state.isFaceEditMode && !state.isPanelOpen;
```

**3b. `overrides/lib/components/asset-viewer/AssetViewer.svelte`**

Import — Old:
```ts
  import { type PreviewStripItem } from './preview-layout';
```
New:
```ts
  import { type PreviewStripItem } from './preview-layout';
  import { getViewerPanelLayoutClass, isSwipeBackEnabled } from './viewer-panel-layout';
```

Derived — Old:
```ts
  const showDetailPanel = $derived(
    asset.hasMetadata &&
      $slideshowState === SlideshowState.None &&
      assetViewerManager.isShowDetailPanel &&
      !assetViewerManager.isShowEditor,
  );
```
New:
```ts
  const showDetailPanel = $derived(
    asset.hasMetadata &&
      $slideshowState === SlideshowState.None &&
      assetViewerManager.isShowDetailPanel &&
      !assetViewerManager.isShowEditor,
  );
  const isViewerPanelOpen = $derived(
    showDetailPanel || assetViewerManager.isShowEditor || assetViewerManager.isShowActivityPanel,
  );
```

SwipeBackEdge — Old:
```svelte
  <SwipeBackEdge
    onBack={closeViewer}
    enabled={$slideshowState === SlideshowState.None &&
      !assetViewerManager.isShowEditor &&
      !assetViewerManager.isFaceEditMode}
  />
```
New:
```svelte
  <SwipeBackEdge
    onBack={closeViewer}
    enabled={isSwipeBackEnabled({
      isMobileViewer,
      slideshowIdle: $slideshowState === SlideshowState.None,
      isShowEditor: assetViewerManager.isShowEditor,
      isFaceEditMode: assetViewerManager.isFaceEditMode,
      isPanelOpen: isViewerPanelOpen,
    })}
  />
```

Detail/editor panel — Old:
```svelte
      id="detail-panel"
      class={[
        'row-span-4 row-start-1 overflow-y-auto bg-light transition-all dark:border-l dark:border-s-immich-dark-gray',
        showDetailPanel ? 'w-90' : 'w-100',
      ]}
```
New:
```svelte
      id="detail-panel"
      class={[
        'overflow-y-auto bg-light transition-all dark:border-l dark:border-s-immich-dark-gray',
        getViewerPanelLayoutClass(showDetailPanel ? 'detail' : 'editor', isMobileViewer),
      ]}
```

Activity panel — Old:
```svelte
      id="activity-panel"
      class="row-span-5 row-start-1 w-90 overflow-y-auto transition-all md:w-115 dark:border-l dark:border-s-immich-dark-gray"
```
New:
```svelte
      id="activity-panel"
      class={[
        'overflow-y-auto transition-all dark:border-l dark:border-s-immich-dark-gray',
        getViewerPanelLayoutClass('activity', isMobileViewer),
      ]}
```

Style — Old:
```css
  :global(.mobile-preview-strip-host) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    opacity: calc(1 - min(1, var(--viewer-dismiss, 0) * 1.6));
  }
```
New:
```css
  :global(.mobile-preview-strip-host) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    opacity: calc(1 - min(1, var(--viewer-dismiss, 0) * 1.6));
  }

  /* Panel info/editor/activity trên mobile viewer (xem viewer-panel-layout.ts) */
  :global(.asset-viewer-sheet) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    box-shadow: 0 -8px 24px rgb(0 0 0 / 35%);
    overscroll-behavior: contain;
  }

  /* Tablet: drawer cao hết màn → chừa status bar; mép đầu (start) không chạm notch */
  @media (min-width: 768px) {
    :global(.asset-viewer-sheet) {
      padding-top: env(safe-area-inset-top, 0px);
      padding-left: 0;
      box-shadow: -8px 0 24px rgb(0 0 0 / 35%);
    }
  }
```

**3c. `overrides/lib/components/shared-components/SwipeBackEdge.svelte`**

Old:
```css
  .pg-swipe-back-edge {
    position: absolute;
    inset-block: 64px 0;
    inset-inline-start: 0;
    z-index: 40;
    width: 32px;
    touch-action: none;
  }
```
New:
```css
  .pg-swipe-back-edge {
    position: absolute;
    /* Dưới navbar overlay mobile (3rem + safe-area-top), trên filmstrip/video chrome */
    inset-block: calc(3rem + env(safe-area-inset-top, 0px)) var(--mobile-preview-strip-offset, 0px);
    inset-inline-start: 0;
    z-index: 40;
    width: 20px;
    /* pan-y: không chặn cuộn dọc bắt đầu ở mép; swipe-back tự preventDefault khi vuốt ngang */
    touch-action: pan-y;
  }

  /* Chuột (cửa sổ hẹp <768px vẫn là mobile viewer): không có cử chỉ vuốt, không nuốt click mép trái */
  @media (hover: hover) and (pointer: fine) {
    .pg-swipe-back-edge {
      display: none;
    }
  }
```
(`$lib/actions/swipe-back.ts` giữ `EDGE_PX = 32`: touch bắt đầu trong dải 20px luôn thỏa `clientX <= 32`; RTL vẫn đúng vì phần tử nằm ở inline-start = mép phải.)

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```
Kỳ vọng:
```
 M overrides/lib/components/asset-viewer/AssetViewer.svelte
 M overrides/lib/components/shared-components/SwipeBackEdge.svelte
 M upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte
 M upstream/web/src/lib/components/shared-components/SwipeBackEdge.svelte
?? overrides/lib/components/asset-viewer/viewer-panel-layout.spec.ts
?? overrides/lib/components/asset-viewer/viewer-panel-layout.ts
?? upstream/web/src/lib/components/asset-viewer/viewer-panel-layout.spec.ts
?? upstream/web/src/lib/components/asset-viewer/viewer-panel-layout.ts
```
Log prepare-custom phải có dòng `==> Skip AssetViewer swipe-back patch (override present)`.

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run src/lib/components/asset-viewer/viewer-panel-layout.spec.ts src/lib/components/asset-viewer/preview-layout.spec.ts
# Kỳ vọng: tất cả passed

pnpm --filter immich-web exec vitest run src/lib/components/asset-viewer/
# Kỳ vọng: chỉ còn baseline AssetViewerNavBar.spec.ts (2 fail); AssetViewer.spec.ts vẫn skipped

rg -n "getViewerPanelLayoutClass|isSwipeBackEnabled|asset-viewer-sheet|'w-90'|'w-100'" overrides/lib/components/asset-viewer/AssetViewer.svelte
# Kỳ vọng: import + 2 lời gọi getViewerPanelLayoutClass + 1 isSwipeBackEnabled + CSS .asset-viewer-sheet; KHÔNG còn 'w-90' / 'w-100' / "w-90 overflow-y-auto"

rg -n "inset-block|touch-action|width: 20px|pointer: fine" overrides/lib/components/shared-components/SwipeBackEdge.svelte
# Kỳ vọng: calc(3rem + env(safe-area-inset-top, 0px)) var(--mobile-preview-strip-offset, 0px); touch-action: pan-y; width: 20px; @media (hover: hover) and (pointer: fine)

pnpm --filter immich-web exec svelte-check
# Kỳ vọng: 30 errors / 1 warning, không lỗi mới trong AssetViewer.svelte / SwipeBackEdge.svelte / viewer-panel-layout.ts

pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/asset-viewer/AssetViewer.svelte src/lib/components/asset-viewer/viewer-panel-layout.ts src/lib/components/asset-viewer/viewer-panel-layout.spec.ts src/lib/components/shared-components/SwipeBackEdge.svelte
# Kỳ vọng: exit 0
```

Kiểm tay `[Unverified]`: iPhone dọc mở Info → bottom sheet, nút đóng không bị navbar che; iPad dọc/ngang → drawer phải; desktop → cột 360px như cũ, click được vùng 32px mép trái (nút previous). Editor trên phone (sheet 50dvh) cần kiểm vùng crop còn dùng được `[Inference]`.

- [ ] **Step 6: Commit**

```bash
git add overrides/lib/components/asset-viewer/AssetViewer.svelte \
  overrides/lib/components/asset-viewer/viewer-panel-layout.ts \
  overrides/lib/components/asset-viewer/viewer-panel-layout.spec.ts \
  overrides/lib/components/shared-components/SwipeBackEdge.svelte \
  upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte \
  upstream/web/src/lib/components/asset-viewer/viewer-panel-layout.ts \
  upstream/web/src/lib/components/asset-viewer/viewer-panel-layout.spec.ts \
  upstream/web/src/lib/components/shared-components/SwipeBackEdge.svelte
git commit -F - <<'EOF'
fix(viewer): panel info/editor/activity dạng sheet trên mobile, gate SwipeBackEdge

Detail panel (w-90), editor (w-100) và activity (w-90 md:w-115) không có
col-start nên rơi vào cột ngầm thứ 5 của grid-cols-4: trên phone 360px media
còn ~0px, và navbar overlay z-30 che header/nút đóng của panel. Thêm
viewer-panel-layout.ts: desktop giữ cột như upstream; mobile viewer dùng
overlay absolute z-40 — phone là bottom sheet (85dvh/50dvh/70dvh), tablet
cảm ứng là drawer cạnh cuối — kèm padding safe-area.
SwipeBackEdge chỉ bật trên mobile viewer và khi không có panel mở; dải mép
bắt đầu dưới navbar (3rem + safe-area-top), dừng trên filmstrip, rộng 20px,
touch-action pan-y, ẩn với pointer fine.
Spec: viewer-panel-layout.spec.ts cho class panel và điều kiện swipe-back.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3 (nhóm 2-b): Viewer mobile — safe-area, OCR/activity vs filmstrip, video controls, filmstrip offset/focus

**Findings covered:**
- B (Medium): Overlay navbar and strip ignore landscape safe-area insets — phần **navbar** (strip/stack: xem Dropped)
- B (Medium): OCR button and activity status collide with the mobile filmstrip / ignore safe-area (phần z-30: xem Dropped)
- B (Medium): Video chrome and scrub bar touch targets below 44px; 44px rule not applied to them
- B (Low): Video chrome offset reserved even when no filmstrip is rendered
- B (Low): Stack thumbnails strip and slideshow overlay lack safe-area-bottom and notch handling
- B (Low): Filmstrip button … no `focus-visible` style

Xác nhận lại trong code:
- `AssetViewer.svelte` `<style>`: `:global(.immich-asset-viewer--mobile) { --mobile-preview-strip-offset: calc(4.5rem + env(safe-area-inset-bottom, 0px)); padding-left/right: env(...) }` — đặt vô điều kiện, trong khi strip chỉ render khi `showMobilePreviewStrip || showMobilePreviewStripSkeleton`. Chiều cao thật của strip: `MobilePreviewStrip.svelte` `px-3 pt-1.5 pb-0.5` + thumb `FILMSTRIP_THUMB_SIZE = 44` (`preview-layout.ts:13`) = 52px; skeleton cùng padding.
- `.asset-viewer-navbar--overlay` chỉ có `padding-top: env(safe-area-inset-top)`; wrapper là `absolute inset-x-0 top-0` không có grid placement → containing block là padding box của section → bỏ qua `padding-left/right` safe-area của section.
- OCR `absolute inset-e-0 bottom-0 me-6 mb-6`, activity `me-8 mb-20`, cả hai nằm trong `<div data-viewer-content class="relative z-[-1] …">`; strip host `absolute inset-x-0 bottom-0 z-20` là sibling → OCR luôn bị strip che khi `mb-6` < chiều cao strip.
- `VideoNativeViewer.svelte` `media-control-bar … h-10`, `media-play-button … p-2` (24+16=40px), `immich-time-range class="h-8 …"`; `branding/src/fluent/viewer.css:36-41` chỉ áp 44px cho `button` / `[role=toolbar] button`.
- `#stack-slideshow class="absolute bottom-0 col-span-4 col-start-1 w-fit max-w-full"` không có safe-area-bottom; strip host dùng `mb-16` (64px) trong khi stack cao ≈ 83px (thumb chọn 65px + chấm `mt-0.5 size-2` 10px + `pb-2` 8px) `[Inference]` → strip chồng lên đỉnh stack.
- `SlideshowMetadataOverlay.svelte` `<div class="w-full px-6 py-4" …>` trong khối `absolute inset-x-0 bottom-0 z-10`, không có safe-area-bottom.
- `MobilePreviewStrip.svelte` button thumb không-current: `'opacity-70 hover:opacity-90'`, không có `focus-visible`.

**Files:**
- Modify: `overrides/lib/components/asset-viewer/AssetViewer.svelte` (class `immich-asset-viewer--has-strip`, margin OCR/activity theo offset, strip host trên stack, CSS biến offset/stack, navbar safe-area ngang, `#stack-slideshow` safe-area)
- Modify: `overrides/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte` (padding-bottom safe-area)
- Modify: `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte` (focus-visible ring)
- Modify: `branding/src/fluent/viewer.css` (hit-area 44px cho nút media-chrome, control bar, seek bar)
- Test: không có spec jsdom — toàn bộ là CSS/geometry hoặc class tĩnh của component không render được rẻ trong jsdom (AssetViewer spec upstream đang skip). Verify bằng grep ở Step 5.

**Interfaces:**
- Consumes: Task 2-a — SwipeBackEdge dùng `--mobile-preview-strip-offset` làm mép dưới; style `.asset-viewer-sheet` đã thêm sau rule `.mobile-preview-strip-host` (anchor bên dưới đặt quanh selector, không theo số dòng).
- Produces:
  - Class `immich-asset-viewer--has-strip` trên `#immich-asset-viewer` khi strip/skeleton đang render.
  - `--mobile-preview-strip-offset` = `env(safe-area-inset-bottom, 0px)` khi không có strip; `calc(3.25rem + env(safe-area-inset-bottom, 0px))` khi có strip; landscape ≤500px cao: `env(safe-area-inset-bottom, 0px)`.
  - `--stack-strip-height: 5.25rem` trên `.immich-asset-viewer--mobile`.
  - Class `mobile-preview-strip-host--above-stack`.

- [ ] **Step 1: Write the failing test**

Không có test jsdom (CSS-only / class tĩnh). Ghi lại trạng thái trước khi sửa để so sánh ở Step 5:

```bash
rg -n "4\.5rem|me-6 mb-6|me-8 mb-20|'mb-16'|has-strip" overrides/lib/components/asset-viewer/AssetViewer.svelte
# Hiện tại: thấy 4.5rem, "me-6 mb-6", "me-8 mb-20", 'mb-16'; không có has-strip
rg -n "media-play-button|immich-time-range" branding/src/fluent/viewer.css
# Hiện tại: không có kết quả (exit 1)
rg -n "focus-visible" overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte
# Hiện tại: không có kết quả
rg -n "safe-area" overrides/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte
# Hiện tại: không có kết quả
```

- [ ] **Step 2: Run it, expect FAIL**

Các lệnh `rg` ở Step 1 chính là "FAIL" (pattern mới chưa có). Không chạy vitest ở task này.

- [ ] **Step 3: Implement**

**3a. `overrides/lib/components/asset-viewer/AssetViewer.svelte`**

Section — Old:
```svelte
  class:immich-asset-viewer--mobile={isMobileViewer}
  use:focusTrap
```
New:
```svelte
  class:immich-asset-viewer--mobile={isMobileViewer}
  class:immich-asset-viewer--has-strip={showMobilePreviewStrip || showMobilePreviewStripSkeleton}
  use:focusTrap
```

Activity status — Old:
```svelte
      <div class="absolute inset-e-0 bottom-0 me-8 mb-20">
```
New (desktop: biến không định nghĩa → `0px + 5rem` = `mb-20` như cũ):
```svelte
      <div class="absolute inset-e-0 bottom-0 me-8 mb-[calc(var(--mobile-preview-strip-offset,0px)_+_5rem)]">
```

OCR — Old:
```svelte
      <div class="absolute inset-e-0 bottom-0 me-6 mb-6 drop-shadow-[0_0_1px_rgba(0,0,0,0.4)]">
```
New (desktop: `0px + 1.5rem` = `mb-6` như cũ):
```svelte
      <div
        class="absolute inset-e-0 bottom-0 me-6 mb-[calc(var(--mobile-preview-strip-offset,0px)_+_1.5rem)] drop-shadow-[0_0_1px_rgba(0,0,0,0.4)]"
      >
```

Strip host — Old:
```svelte
    <div
      class="mobile-preview-strip-host absolute inset-x-0 bottom-0 z-20 isolate col-span-4 col-start-1 {stack &&
      withStacked
        ? 'mb-16'
        : ''}"
    >
```
New:
```svelte
    <div
      class="mobile-preview-strip-host absolute inset-x-0 bottom-0 z-20 isolate col-span-4 col-start-1"
      class:mobile-preview-strip-host--above-stack={Boolean(stack && withStacked)}
    >
```

Style — Old:
```css
  :global(.immich-asset-viewer--mobile) {
    --mobile-preview-strip-offset: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    background-color: rgb(0 0 0 / calc(1 - var(--viewer-dismiss, 0) * 0.75));
  }

  :global(.asset-viewer-navbar--overlay) {
    padding-top: env(safe-area-inset-top, 0px);
    opacity: calc(1 - min(1, var(--viewer-dismiss, 0) * 1.6));
  }
```
New:
```css
  :global(.immich-asset-viewer--mobile) {
    /* Không có filmstrip (1 ảnh, shared link không điều hướng, editor): chỉ chừa home indicator */
    --mobile-preview-strip-offset: env(safe-area-inset-bottom, 0px);
    /* #stack-slideshow: thumb chọn 65px + chấm 10px + pb-2 8px ≈ 5.25rem */
    --stack-strip-height: 5.25rem;
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    background-color: rgb(0 0 0 / calc(1 - var(--viewer-dismiss, 0) * 0.75));
  }

  :global(.immich-asset-viewer--mobile.immich-asset-viewer--has-strip) {
    /* Cao thật của filmstrip: pt-1.5 (6px) + FILMSTRIP_THUMB_SIZE 44px + pb-0.5 (2px) = 52px */
    --mobile-preview-strip-offset: calc(3.25rem + env(safe-area-inset-bottom, 0px));
  }

  :global(.asset-viewer-navbar--overlay) {
    padding-top: env(safe-area-inset-top, 0px);
    /* absolute inset-x-0 không có grid placement → nằm trên padding box, tự chừa notch ngang (landscape) */
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    opacity: calc(1 - min(1, var(--viewer-dismiss, 0) * 1.6));
  }
```

Style — Old:
```css
  :global(.mobile-preview-strip-host) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    opacity: calc(1 - min(1, var(--viewer-dismiss, 0) * 1.6));
  }
```
New:
```css
  :global(.mobile-preview-strip-host) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    opacity: calc(1 - min(1, var(--viewer-dismiss, 0) * 1.6));
  }

  /* Có stack: filmstrip nằm trên #stack-slideshow; stack đã chừa home indicator nên host không pad thêm */
  :global(.mobile-preview-strip-host.mobile-preview-strip-host--above-stack) {
    margin-bottom: calc(var(--stack-strip-height) + env(safe-area-inset-bottom, 0px));
    padding-bottom: 0;
  }

  #stack-slideshow {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
```

Style (landscape) — Old:
```css
  @media (orientation: landscape) and (max-height: 500px) {
    :global(.immich-asset-viewer--mobile) {
      --mobile-preview-strip-offset: env(safe-area-inset-bottom, 0px);
    }
```
New:
```css
  @media (orientation: landscape) and (max-height: 500px) {
    :global(.immich-asset-viewer--mobile),
    :global(.immich-asset-viewer--mobile.immich-asset-viewer--has-strip) {
      --mobile-preview-strip-offset: env(safe-area-inset-bottom, 0px);
    }
```

**3b. `overrides/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte`**

Old:
```svelte
    <div
      class="w-full px-6 py-4"
```
New:
```svelte
    <div
      class="w-full px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
```

**3c. `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte`**

Old:
```svelte
          : 'opacity-70 hover:opacity-90'}"
```
New:
```svelte
          : 'opacity-70 hover:opacity-90 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white'}"
```

**3d. `branding/src/fluent/viewer.css`** — trong khối `@media (pointer: coarse), (max-width: 767px)`:

Old:
```css
    #immich-asset-viewer.immich-asset-viewer--mobile .video-mobile-chrome {
      padding-bottom: 0;
    }
```
New:
```css
    #immich-asset-viewer.immich-asset-viewer--mobile .video-mobile-chrome {
      padding-bottom: 0;
    }

    /*
     * Nút media-chrome là custom element nên rule `button` phía trên không áp.
     * Chỉ dùng min-*: class Tailwind h-10/h-8 (layer utilities) thắng `height` của layer components.
     */
    #immich-asset-viewer.immich-asset-viewer--mobile
      .video-mobile-chrome
      :is(media-play-button, media-mute-button, media-fullscreen-button, media-settings-menu-button) {
      min-width: 44px;
      min-height: 44px;
    }

    #immich-asset-viewer.immich-asset-viewer--mobile .video-mobile-chrome media-control-bar,
    #immich-asset-viewer.immich-asset-viewer--mobile .video-mobile-chrome immich-time-range {
      min-height: 44px;
    }
```

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```
Kỳ vọng:
```
 M branding/src/fluent/viewer.css
 M overrides/lib/components/asset-viewer/AssetViewer.svelte
 M overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte
 M overrides/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte
 M upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte
 M upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte
 M upstream/web/src/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte
```
(`upstream/web/static/branding/fluent/viewer.css` được cập nhật nhưng bị gitignore → không xuất hiện.)

- [ ] **Step 5: Verify**

```bash
rg -n "4\.5rem|me-6 mb-6|me-8 mb-20|'mb-16'" overrides/lib/components/asset-viewer/AssetViewer.svelte
# Kỳ vọng: không có kết quả (exit 1)

rg -n "has-strip|above-stack|--stack-strip-height|3\.25rem|mobile-preview-strip-offset,0px\)_\+_" overrides/lib/components/asset-viewer/AssetViewer.svelte
# Kỳ vọng: class:immich-asset-viewer--has-strip, class:mobile-preview-strip-host--above-stack, 2 selector has-strip trong <style>,
#          --stack-strip-height: 5.25rem, calc(3.25rem + …), 2 class mb-[calc(var(--mobile-preview-strip-offset,0px)_+_…)]

rg -n "safe-area-inset-left|safe-area-inset-right" overrides/lib/components/asset-viewer/AssetViewer.svelte
# Kỳ vọng: có trong .immich-asset-viewer--mobile, .asset-viewer-navbar--overlay và .asset-viewer-sheet (Task 2-a)

rg -n "safe-area-inset-bottom" overrides/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte
rg -n "focus-visible:ring-2" overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte
rg -n "media-play-button|immich-time-range|min-height: 44px" branding/src/fluent/viewer.css
# Kỳ vọng: mỗi lệnh có ≥1 kết quả

pnpm --filter immich-web exec vitest run src/lib/components/asset-viewer/
# Kỳ vọng: chỉ baseline AssetViewerNavBar.spec.ts (2 fail)

pnpm --filter immich-web exec svelte-check
# Kỳ vọng: 30 errors / 1 warning, không lỗi mới

pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/asset-viewer/AssetViewer.svelte src/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte src/lib/components/asset-viewer/MobilePreviewStrip.svelte
# Kỳ vọng: exit 0
```

Kiểm tay `[Unverified]`: DevTools iPhone 14 Pro dọc — OCR button nằm trên filmstrip; video 1 mục (không strip) → control bar sát home indicator; nút play/mute/fullscreen ≥44×44 (Computed); landscape với notch → nút Close/kebab không nằm dưới notch; Tab tới thumb filmstrip thấy ring trắng.

- [ ] **Step 6: Commit**

```bash
git add branding/src/fluent/viewer.css \
  overrides/lib/components/asset-viewer/AssetViewer.svelte \
  overrides/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte \
  overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte \
  upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte \
  upstream/web/src/lib/components/asset-viewer/SlideshowMetadataOverlay.svelte \
  upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte
git commit -F - <<'EOF'
fix(viewer): safe-area, offset filmstrip và hit-area video trên mobile

--mobile-preview-strip-offset chỉ cộng chiều cao filmstrip (52px thật thay
vì 4.5rem) khi strip/skeleton đang render (immich-asset-viewer--has-strip);
không có strip thì chỉ chừa home indicator. OCR và activity status đặt
margin theo offset nên không còn nằm dưới filmstrip z-20 (desktop giữ
mb-6/mb-20). Navbar overlay chừa safe-area trái/phải khi landscape.
Filmstrip nằm trên #stack-slideshow theo --stack-strip-height thay cho mb-16;
stack strip và overlay slideshow chừa safe-area-bottom.
viewer.css: nút media-chrome, control bar và seek bar tối thiểu 44px trên
mobile viewer. Thumb filmstrip có focus-visible ring.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4 (nhóm 3): Touch targets < 44px

**Findings covered:**
- D: Global `min-height:44px` on all buttons turns round icon buttons into ovals (`branding/src/fluent/responsive.css:6-11`)
- A: Mobile header controls are below 44px touch target and tightly packed (`mobile-shell.css` `.pg-mobile-header__lang` min-height 2rem, actions gap 0.125rem; `ThemeSwitcher size="small"`)
- A: Admin sidebar hamburger is 32px — **partially**: the cited 32px rule is in dead `navigation.css`; the live hamburger is `IconButton size="medium"` (40×40, 40×44 oval on coarse). Fixed by the global icon-button rule. Navbar layout part dropped (see Dropped findings).
- D: Person-filter icon buttons forced to 36px with `!important` (`branding/src/m3/search-filter.css:162-172`)
- D: Checkbox rows in Display options: the 44px row is not the hit area (`search-filter.css:218-243`, `SearchDisplaySection.svelte`)
- C: Shared-favorites 32px remove button over thumbnails and ~32px filter chips — remove button hit area + chip `aria-pressed`; chip height part dropped (already 44px on coarse, fact 2)
- C: Small touch targets in feature-update UI and shared-link expiration — `FeatureUpdatePin` dismiss (28px, unlayered `min-height:1.75rem` beats the global rule) fixed; `DeviceCard` `IconButton size="small"` fixed by the global icon-button rule; the other three sub-items dropped (already 44px on coarse)
- A: MobileThumbnailHint: breakpoint mismatch with shell, 24px close button, invisible hover on light theme, 11px text

**Files:**
- Modify: `branding/src/fluent/responsive.css` (square icon buttons on coarse; new `.pg-touch-target` utility)
- Modify: `custom/src/styles/mobile-shell.css` (header actions gap; language toggle 44px on coarse)
- Modify: `branding/src/m3/search-filter.css` (person-filter buttons 44px on coarse; display-option label is the 44px hit area)
- Modify: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte` (remove button `pg-touch-target`; chips `aria-pressed`)
- Modify: `custom/src/components/FeatureUpdatePin.svelte` (dismiss button `pg-touch-target` + `position: relative`; wider gap on coarse)
- Modify: `overrides/lib/components/shared-components/MobileThumbnailHint.svelte` (shell-aligned visibility; 44px hit area; theme-aware hover; 12px text)
- Create: `overrides/lib/components/shared-components/MobileThumbnailHint.spec.ts`
- Test: `upstream/web/src/lib/components/shared-components/MobileThumbnailHint.spec.ts` (copy)

**Interfaces:**
- Consumes: none
- Produces: CSS utility class **`pg-touch-target`** (defined in `branding/src/fluent/responsive.css`, active only under `(pointer: coarse)`): cancels the global `min-height/min-width` on that element and adds a centred `::before` hit area of `max(100%, 44px)` × `max(100%, 44px)`. **Contract:** the element must already be a containing block (`relative`, `absolute` or `fixed`); the class never sets `position`, so it does not override Tailwind `absolute` on overlay buttons. Tasks 4-a, 4-b, 6-c use it.

- [ ] **Step 1: Write the failing test** — create `overrides/lib/components/shared-components/MobileThumbnailHint.spec.ts`:

```ts
import MobileThumbnailHint from '$lib/components/shared-components/MobileThumbnailHint.svelte';
import { isMobileShell } from '$custom/utils/capabilities.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';

vi.mock('$custom/utils/capabilities.svelte', () => ({
  isMobileShell: vi.fn(() => false),
}));

describe('MobileThumbnailHint', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(isMobileShell).mockReturnValue(false);
  });

  it('shows the hint whenever the mobile shell is active, also with a mouse (768-849px)', () => {
    vi.mocked(isMobileShell).mockReturnValue(true);
    render(MobileThumbnailHint);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('stays hidden outside the mobile shell on a fine pointer', () => {
    render(MobileThumbnailHint);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps a 24px close glyph with a 44px touch target', () => {
    vi.mocked(isMobileShell).mockReturnValue(true);
    render(MobileThumbnailHint);
    const close = screen.getByRole('button', { name: 'close' });
    expect(close).toHaveClass('pg-touch-target', 'relative', 'size-6');
  });

  it('dismisses and remembers the choice for the session', async () => {
    vi.mocked(isMobileShell).mockReturnValue(true);
    render(MobileThumbnailHint);
    await fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(sessionStorage.getItem('immich-mobile-thumbnail-hint-dismissed')).toBe('1');
  });
});
```

CSS-only geometry (responsive.css, mobile-shell.css, search-filter.css, FeatureUpdatePin dismiss) is not jsdom-testable; it is verified by grep in Step 5. The shared-favorites route page has no render harness (it needs `partnerFavoritesStore`, `authManager`, SDK calls); the two attribute changes there are verified by grep.

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/components/shared-components/MobileThumbnailHint.spec.ts
```

Expected: 3 failed / 1 passed. Tests 1, 3, 4 fail with `Unable to find an accessible element with the role "status"` (or role "button" name "close"), because the current component only renders for `pointerCoarse || maxMd` and the setup `matchMedia` mock returns `matches: false`. Test 2 passes.

- [ ] **Step 3: Implement**

**3.1 `branding/src/fluent/responsive.css`** — replace the coarse block:

```css
  @media (pointer: coarse) {
    button:not([disabled]),
    [role='button']:not([disabled]),
    a[role='menuitem'] {
      min-height: 44px;
    }

    #dashboard-navbar button,
    #sidebar a {
      min-height: 44px;
    }
  }
```

with:

```css
  @media (pointer: coarse) {
    button:not([disabled]),
    [role='button']:not([disabled]),
    a[role='menuitem'] {
      min-height: 44px;
    }

    #dashboard-navbar button,
    #sidebar a {
      min-height: 44px;
    }

    /*
     * Nút icon vuông/tròn (IconButton @immich/ui: h-N w-N, hoặc size-N): chỉ nâng min-height sẽ biến
     * nút tròn thành oval (vd. 40×44) — nâng cả min-width để giữ tỉ lệ 1:1, giống viewer.css cho navbar viewer.
     */
    :is(button, a, [role='button']):is(
        [class*='h-6'][class*='w-6'],
        [class*='h-8'][class*='w-8'],
        [class*='h-10'][class*='w-10'],
        [class*='size-6'],
        [class*='size-8'],
        [class*='size-10']
      ):not([disabled], .pg-touch-target) {
      min-width: 44px;
      min-height: 44px;
    }

    /*
     * .pg-touch-target — giữ kích thước nhìn thấy, mở rộng vùng chạm lên 44px bằng ::before.
     * Phần tử phải là containing block (relative/absolute/fixed): class không tự đặt position
     * để không đè `absolute` của nút overlay.
     */
    :is(button, a, [role='button']).pg-touch-target:not([disabled]) {
      min-width: 0;
      min-height: 0;
    }

    .pg-touch-target::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: max(100%, 44px);
      height: max(100%, 44px);
      border-radius: inherit;
      transform: translate(-50%, -50%);
    }
  }
```

Specificity notes for the reviewer: the square rule is (0,4,0) and excludes `.pg-touch-target`; the `.pg-touch-target` reset is (0,3,0) > base rule (0,1,1). `#dashboard-navbar button` (1,0,1) still wins for navbar buttons, which never use `pg-touch-target`.

**3.2 `custom/src/styles/mobile-shell.css`** — replace:

```css
html[data-mobile-shell] .pg-mobile-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.125rem;
}
```

with:

```css
html[data-mobile-shell] .pg-mobile-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
}
```

and replace:

```css
html[data-mobile-shell] .pg-mobile-header__lang-sep {
```

with:

```css
/* Rule này không thuộc layer nên đè min-height 44px của responsive.css — tự nâng vùng chạm trên màn cảm ứng */
@media (pointer: coarse) {
  html[data-mobile-shell] .pg-mobile-header__lang {
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0 0.5rem;
  }
}

html[data-mobile-shell] .pg-mobile-header__lang-sep {
```

(`ThemeSwitcher size="small"` in `NavigationBar.svelte:110` is not changed: it renders `h-8 w-8`, so the 3.1 square rule makes it 44×44 on coarse; fine pointers keep 32px.)

**3.3 `branding/src/m3/search-filter.css`** — replace:

```css
  .ant-search-filter-modal__section .pg-people-filter input {
```

with:

```css
  /* Màn cảm ứng: !important ở trên đè cả rule 44px toàn cục — nâng lại vùng chạm */
  @media (pointer: coarse) {
    .ant-search-filter-modal__section .pg-people-filter button {
      width: 2.75rem !important;
      height: 2.75rem !important;
      min-width: 2.75rem !important;
      min-height: 2.75rem !important;
    }
  }

  .ant-search-filter-modal__section .pg-people-filter input {
```

Then replace:

```css
  .pg-search-display-options__item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-height: 2.75rem;
    padding-block: 0.25rem;
  }
```

with:

```css
  .pg-search-display-options__item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
```

replace:

```css
  .pg-search-display-options__label {
    flex: 1 1 auto;
    min-width: 0;
```

with:

```css
  /* Label là vùng chạm 44px của cả hàng (div bọc ngoài không tương tác được) */
  .pg-search-display-options__label {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    min-width: 0;
    min-height: 2.75rem;
```

and replace:

```css
    .pg-search-display-options__item {
      min-height: auto;
      padding-block: 0;
    }
  }
```

with:

```css
    .pg-search-display-options__label {
      min-height: auto;
    }
  }

  @media (min-width: 640px) and (pointer: coarse) {
    .pg-search-display-options__label {
      min-height: 2.75rem;
    }
  }
```

**3.4 `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte`** — chips: replace:

```svelte
        onclick={() => (filter = item.id)}
      >
        {item.label}
```

with:

```svelte
        aria-pressed={filter === item.id}
        onclick={() => (filter = item.id)}
      >
        {item.label}
```

Remove button: replace:

```svelte
              class="absolute top-2 end-2 z-20 flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/80 disabled:opacity-50"
```

with:

```svelte
              class="pg-touch-target absolute top-2 end-2 z-20 flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/80 disabled:opacity-50"
```

(The visible disc stays 32px; the `::before` extends 6px each side, which stays inside the card's `top-2 end-2` 8px inset, so the card's `overflow-hidden` does not clip it.)

**3.5 `custom/src/components/FeatureUpdatePin.svelte`** — markup: replace:

```svelte
          <button type="button" class="pg-whats-new-pin__dismiss" aria-label={$t('close')} onclick={dismissPin}>
```

with:

```svelte
          <button
            type="button"
            class="pg-whats-new-pin__dismiss pg-touch-target"
            aria-label={$t('close')}
            onclick={dismissPin}
          >
```

Style: replace:

```css
  .pg-whats-new-pin__dismiss {
    display: inline-flex;
```

with:

```css
  .pg-whats-new-pin__dismiss {
    position: relative;
    display: inline-flex;
```

and replace:

```css
  .pg-whats-new-pin:has(.pg-whats-new-pin__open:hover) {
```

with:

```css
  /* Vùng chạm 44px của nút đóng (pg-touch-target) tràn 8px mỗi bên — giãn gap để không đè nút mở */
  @media (pointer: coarse) {
    .pg-whats-new-pin {
      gap: 0.5rem;
    }
  }

  .pg-whats-new-pin:has(.pg-whats-new-pin__open:hover) {
```

(Task 4-b later edits this same selector line; it anchors on `.pg-whats-new-pin:has(.pg-whats-new-pin__open:hover) {`, which this edit keeps.)

**3.6 `overrides/lib/components/shared-components/MobileThumbnailHint.svelte`** — replace the whole file with:

```svelte
<script lang="ts">
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { Icon } from '@immich/ui';
  import { mdiClose, mdiInformationOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { isMobileShell } from '$custom/utils/capabilities.svelte';

  const STORAGE_KEY = 'immich-mobile-thumbnail-hint-dismissed';

  // Cùng điều kiện với mobile shell (<850px, đã đăng nhập, ngoài /admin) và mọi thiết bị cảm ứng
  const isMobile = $derived(isMobileShell() || mediaQueryManager.pointerCoarse);

  const readDismissed = () => {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };

  let dismissed = $state(readDismissed());

  const dismiss = () => {
    dismissed = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };
</script>

{#if isMobile && !dismissed}
  <div
    role="status"
    class="pg-mobile-hint flex items-center gap-2 border-b border-white/10 bg-(--md-sys-color-surface-container) px-3 py-1.5 text-(--md-sys-color-on-surface-variant)"
  >
    <Icon icon={mdiInformationOutline} size="16" class="shrink-0 opacity-80" />
    <p class="min-w-0 flex-1 text-xs leading-snug">
      {$t('mobile_thumbnail_hint')}
    </p>
    <button
      type="button"
      class="pg-touch-target relative flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-(--md-state-on-surface-hover) hover:opacity-100"
      aria-label={$t('close')}
      onclick={dismiss}
    >
      <Icon icon={mdiClose} size="16" />
    </button>
  </div>
{/if}
```

(`--md-state-on-surface-hover` is defined for both themes in `branding/src/m3/tokens.css:63,122`.)

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```

Expected (exactly these, order may differ):

```
 M branding/src/fluent/responsive.css
 M branding/src/m3/search-filter.css
 M custom/src/components/FeatureUpdatePin.svelte
 M "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M custom/src/styles/mobile-shell.css
 M overrides/lib/components/shared-components/MobileThumbnailHint.svelte
 M "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M upstream/web/src/lib/components/shared-components/MobileThumbnailHint.svelte
 M upstream/web/static/mobile-shell.css
?? overrides/lib/components/shared-components/MobileThumbnailHint.spec.ts
?? upstream/web/src/lib/components/shared-components/MobileThumbnailHint.spec.ts
```

(`FeatureUpdatePin.svelte` lives in `custom/src/components`, imported via `$custom`; it has no copy.)

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run src/lib/components/shared-components/MobileThumbnailHint.spec.ts
```
Expect 4 passed.

```bash
rg -n "pg-touch-target" branding/src/fluent/responsive.css custom/src/components/FeatureUpdatePin.svelte overrides/lib/components/shared-components/MobileThumbnailHint.svelte "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
```
Expect: 4 hits in responsive.css (comment, `:not([disabled], .pg-touch-target)`, reset selector, `::before` selector), 1 in each of the other three files.

```bash
rg -n "min-height: 2.75rem|gap: 0.25rem" custom/src/styles/mobile-shell.css
rg -n "2.75rem !important" branding/src/m3/search-filter.css
rg -n "aria-pressed=\{filter === item.id\}" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
diff custom/src/styles/mobile-shell.css upstream/web/static/mobile-shell.css && echo COPY-OK
```
Expect: mobile-shell has `gap: 0.25rem` (actions) and `min-height: 2.75rem` (header min-height line 34 + new lang rule); search-filter has 4 `2.75rem !important` lines; one `aria-pressed` hit; `COPY-OK`.

```bash
pnpm --filter immich-web exec svelte-check 2>&1 | tail -3
pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/shared-components/MobileThumbnailHint.svelte src/lib/components/shared-components/MobileThumbnailHint.spec.ts "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
pnpm --filter immich-web exec prettier --check src/lib/components/shared-components/MobileThumbnailHint.svelte src/lib/components/shared-components/MobileThumbnailHint.spec.ts
```
Expect svelte-check `30 errors and 1 warning`; eslint and prettier clean. Manual check `[Inference]` (not jsdom-testable): Chrome DevTools device mode (coarse pointer) → navbar IconButtons 44×44 circles, mobile header VN/EN ≥44×44, people-filter search/clear 44×44, display-option label row 44px tall.

- [ ] **Step 6: Commit**

```bash
git add branding/src/fluent/responsive.css branding/src/m3/search-filter.css custom/src/components/FeatureUpdatePin.svelte "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" custom/src/styles/mobile-shell.css upstream/web/static/mobile-shell.css overrides/lib/components/shared-components/MobileThumbnailHint.svelte overrides/lib/components/shared-components/MobileThumbnailHint.spec.ts upstream/web/src/lib/components/shared-components/MobileThumbnailHint.svelte upstream/web/src/lib/components/shared-components/MobileThumbnailHint.spec.ts
git commit -F - <<'EOF'
fix(touch): vùng chạm 44px cho nút icon, header mobile, bộ lọc người và hint thumbnail

- responsive.css: nút icon (h-N w-N / size-N) nâng cả min-width 44px trên màn cảm ứng để không thành oval; thêm tiện ích .pg-touch-target (vùng chạm ::before 44px, giữ kích thước nhìn thấy)
- mobile-shell: nút VN/EN 44px trên màn cảm ứng, giãn gap cụm action
- search-filter: nút tìm/xoá bộ lọc người 44px trên màn cảm ứng; label tuỳ chọn hiển thị là vùng chạm 44px
- shared-favorites: nút bỏ thích dùng vùng chạm 44px, chip lọc có aria-pressed
- FeatureUpdatePin: nút đóng pin "Có gì mới" vùng chạm 44px
- MobileThumbnailHint: hiện theo mobile shell hoặc màn cảm ứng, nút đóng 44px, hover theo token theme, chữ 12px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5 (nhóm 4-a): Hover-only on touch — thumbnail select/preview, timeline day toggle

**Findings covered:**
- B: Hover-only thumbnail controls (select checkbox, preview) have no touch equivalent; small targets; hard-coded English `aria-label`s (`Thumbnail.svelte:443-503`)
- B: Timeline day-header select toggle is hover-only and not keyboard/touch accessible (`Month.svelte:81-101`)

**Files:**
- Modify: `overrides/lib/components/assets/thumbnail/Thumbnail.svelte` (new `selectionMode` prop; show select checkbox in selection mode and on keyboard focus; show preview on touch / keyboard focus; 44px targets; `$t` labels)
- Modify: `overrides/lib/components/timeline/Timeline.svelte` (pass `selectionMode`)
- Modify: `overrides/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte` (pass `selectionMode`)
- Create: `overrides/lib/components/timeline/TimelineDaySelectToggle.svelte` (real `<button>` with name + `aria-pressed`)
- Modify: `overrides/lib/components/timeline/Month.svelte` (use the toggle; visible during selection)
- Modify: `upstream/i18n/en.json`, `upstream/i18n/vi.json` (key `timeline_select_day`)
- Create: `overrides/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts`
- Create: `overrides/lib/components/timeline/TimelineDaySelectToggle.spec.ts`
- Test: copies `upstream/web/src/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts`, `upstream/web/src/lib/components/timeline/TimelineDaySelectToggle.spec.ts`; regression `upstream/web/src/lib/components/assets/thumbnail/__test__/Thumbnail.spec.ts`

**Interfaces:**
- Consumes: `pg-touch-target` (Task 3)
- Produces: `Thumbnail` prop **`selectionMode?: boolean`** (default `false`); component **`$lib/components/timeline/TimelineDaySelectToggle.svelte`** with props `{ selected: boolean; visible: boolean; label: string; onSelect: () => void }`; i18n key **`timeline_select_day`** (`{date}` placeholder).

- [ ] **Step 1: Write the failing test**

Create `overrides/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts`:

```ts
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
import { timelineAssetFactory } from '@test-data/factories/asset-factory';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const media = vi.hoisted(() => {
  const state = { coarse: false };
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    enumerable: true,
    value: vi.fn().mockImplementation(function (query: string) {
      return {
        get matches() {
          return state.coarse && query.includes('coarse');
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
  return state;
});

vi.mock('$lib/utils/navigation', () => ({
  currentUrlReplaceAssetId: vi.fn(),
  isSharedLinkRoute: vi.fn().mockReturnValue(false),
}));

const buildAsset = () => timelineAssetFactory.build({ livePhotoVideoId: null, isVideo: false, isImage: true });

describe('Thumbnail touch and keyboard affordances', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
  });

  beforeEach(() => {
    media.coarse = false;
  });

  it('shows a 44px select checkbox on touch while selection mode is active', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), selectionMode: true, onSelect: vi.fn() });
    const checkbox = screen.getByRole('checkbox', { name: 'select' });
    expect(checkbox).toHaveClass('pointer-coarse:p-2.5');
    expect(checkbox).toHaveAttribute('tabindex', '-1');
  });

  it('hides the select checkbox on touch outside selection mode', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), onSelect: vi.fn() });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('never shows the select checkbox for readonly thumbnails', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), readonly: true, selectionMode: true });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows the preview button on touch when preview is available', () => {
    media.coarse = true;
    render(Thumbnail, { asset: buildAsset(), selectionMode: true, onPreview: vi.fn() });
    const preview = screen.getByRole('button', { name: 'preview' });
    expect(preview).toHaveClass('pg-touch-target');
    expect(preview).toHaveAttribute('tabindex', '-1');
  });

  it('reveals the select checkbox when the thumbnail gets keyboard focus', async () => {
    const { baseElement } = render(Thumbnail, { asset: buildAsset(), onSelect: vi.fn() });
    expect(screen.queryByRole('checkbox')).toBeNull();
    const container = baseElement.querySelector<HTMLElement>('[data-thumbnail-focus-container]')!;
    container.focus();
    await tick();
    expect(screen.getByRole('checkbox', { name: 'select' })).toBeInTheDocument();
  });
});
```

Create `overrides/lib/components/timeline/TimelineDaySelectToggle.spec.ts`:

```ts
import TimelineDaySelectToggle from '$lib/components/timeline/TimelineDaySelectToggle.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('TimelineDaySelectToggle', () => {
  it('is a real button with an accessible name and pressed state', () => {
    render(TimelineDaySelectToggle, { selected: true, visible: true, label: 'Select day 1', onSelect: vi.fn() });
    const button = screen.getByRole('button', { name: 'Select day 1' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('stays focusable but collapsed when not visible', () => {
    render(TimelineDaySelectToggle, { selected: false, visible: false, label: 'Select day 2', onSelect: vi.fn() });
    const button = screen.getByRole('button', { name: 'Select day 2' });
    expect(button).toHaveClass('w-0', 'focus-visible:w-8');
    expect(button).not.toHaveAttribute('tabindex');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('expands to 32px (44px on touch) when visible', () => {
    render(TimelineDaySelectToggle, { selected: false, visible: true, label: 'Select day 3', onSelect: vi.fn() });
    expect(screen.getByRole('button', { name: 'Select day 3' })).toHaveClass('w-8', 'pointer-coarse:w-11');
  });

  it('calls onSelect when activated', async () => {
    const onSelect = vi.fn();
    render(TimelineDaySelectToggle, { selected: false, visible: true, label: 'Select day 4', onSelect });
    await fireEvent.click(screen.getByRole('button', { name: 'Select day 4' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
```

`Month.svelte` itself is not rendered in a spec (needs a `TimelineMonth`/`VirtualScrollManager` graph); its wiring is verified by grep + svelte-check in Step 5.

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts src/lib/components/timeline/TimelineDaySelectToggle.spec.ts
```

Expected: `TimelineDaySelectToggle.spec.ts` fails to load (`Failed to resolve import "$lib/components/timeline/TimelineDaySelectToggle.svelte"`). `Thumbnail.touch.spec.ts`: tests 1, 4, 5 fail (`Unable to find an accessible element with the role "checkbox"` / role "button" name "preview"); tests 2 and 3 pass.

- [ ] **Step 3: Implement**

**3.1 `overrides/lib/components/assets/thumbnail/Thumbnail.svelte`**

Imports — replace:

```ts
  import { onMount } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
```

with:

```ts
  import { onMount } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { t } from 'svelte-i18n';
```

Props type — replace:

```ts
    readonly?: boolean;
    showArchiveIcon?: boolean;
```

with:

```ts
    readonly?: boolean;
    /** Đang ở chế độ chọn (đã chọn ≥1 ảnh): luôn hiện nút chọn — màn cảm ứng không có hover */
    selectionMode?: boolean;
    showArchiveIcon?: boolean;
```

Destructuring — replace:

```ts
    readonly = false,
    showArchiveIcon = false,
```

with:

```ts
    readonly = false,
    selectionMode = false,
    showArchiveIcon = false,
```

State — replace:

```ts
  let mouseOver = $state(false);
  let loaded = $state(false);
```

with:

```ts
  let mouseOver = $state(false);
  // Focus bằng bàn phím (:focus-visible) cũng hiện nút chọn/preview như khi hover
  let keyboardFocused = $state(false);
  let loaded = $state(false);
```

Handlers — replace:

```ts
  const onMouseLeave = () => {
    mouseOver = false;
    onMouseEvent?.({ isMouseOver: false, selectedGroupIndex: groupIndex });
  };
```

with:

```ts
  const onMouseLeave = () => {
    mouseOver = false;
    onMouseEvent?.({ isMouseOver: false, selectedGroupIndex: groupIndex });
  };

  const onFocus = () => {
    try {
      keyboardFocused = element?.matches(':focus-visible') ?? false;
    } catch {
      keyboardFocused = false;
    }
  };

  const onBlur = (event: FocusEvent) => {
    // Giữ nút khi focus chuyển sang nút con bên trong thumbnail
    if (event.relatedTarget instanceof Node && element?.contains(event.relatedTarget)) {
      return;
    }
    keyboardFocused = false;
  };

  const showSelectButton = $derived(
    !readonly && (mouseOver || selected || selectionCandidate || selectionMode || keyboardFocused),
  );
  // onPreview chỉ được truyền khi đang chọn ảnh; trên màn cảm ứng đây là cách duy nhất để mở ảnh lúc đang chọn
  const showPreviewButton = $derived(!!onPreview && (mouseOver || usingMobileDevice || keyboardFocused));
```

Container — replace:

```svelte
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  use:longPress={{ onLongPress: () => onSelect?.($state.snapshot(asset)) }}
```

with:

```svelte
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  onfocus={onFocus}
  onblur={onBlur}
  use:longPress={{ onLongPress: () => onSelect?.($state.snapshot(asset)) }}
```

Hover link label — replace:

```svelte
          tabindex={-1}
          aria-label="Thumbnail URL"
```

with:

```svelte
          tabindex={-1}
          aria-label={$getAltText(asset)}
```

Select button — replace:

```svelte
    {#if !readonly && (mouseOver || selected || selectionCandidate)}
      <button
        type="button"
        onclick={onIconClickedHandler}
        class={['absolute z-2 p-2 focus:outline-none', { 'cursor-not-allowed': disabled }]}
        role="checkbox"
        tabindex={-1}
        aria-checked={selected}
        {disabled}
      >
```

with:

```svelte
    {#if showSelectButton}
      <button
        type="button"
        onclick={onIconClickedHandler}
        class={['absolute z-2 p-2 focus:outline-none pointer-coarse:p-2.5', { 'cursor-not-allowed': disabled }]}
        role="checkbox"
        tabindex={-1}
        aria-checked={selected}
        aria-label={$t('select')}
        {disabled}
      >
```

Preview button — replace:

```svelte
    <!-- Preview asset button (visible on hover when any asset is selected) -->
    {#if mouseOver && onPreview}
```

with:

```svelte
    <!-- Preview asset button (khi đang chọn ảnh: hover, focus bàn phím, hoặc luôn hiện trên màn cảm ứng) -->
    {#if showPreviewButton}
```

and replace:

```svelte
        class="absolute inset-e-1 bottom-1 z-2 rounded-full bg-black/25 p-1.5 transition-colors hover:bg-black/50 focus:outline-none"
        in:fade={{ duration: 100 }}
        tabindex={-1}
        aria-label="Preview asset"
```

with:

```svelte
        class="pg-touch-target absolute inset-e-1.5 bottom-1.5 z-2 rounded-full bg-black/25 p-1.5 transition-colors hover:bg-black/50 focus:outline-none"
        in:fade={{ duration: 100 }}
        tabindex={-1}
        aria-label={$t('preview')}
```

(Inset 1.5 = 6px so the 44px `::before` around the 32px disc is not clipped by the container `overflow-hidden`.)

**3.2 `overrides/lib/components/timeline/Timeline.svelte`** — replace:

```svelte
                onPreview={isSelectionMode || assetInteraction.selectionActive
                  ? (asset) => void navigate({ targetRoute: 'current', assetId: asset.id })
                  : undefined}
```

with:

```svelte
                onPreview={isSelectionMode || assetInteraction.selectionActive
                  ? (asset) => void navigate({ targetRoute: 'current', assetId: asset.id })
                  : undefined}
                selectionMode={isSelectionMode || assetInteraction.selectionActive}
```

**3.3 `overrides/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte`** — replace:

```svelte
            onPreview={assetInteraction.selectionActive ? () => void navigateToAsset(asset) : undefined}
```

with:

```svelte
            onPreview={assetInteraction.selectionActive ? () => void navigateToAsset(asset) : undefined}
            selectionMode={assetInteraction.selectionActive}
```

**3.4 Create `overrides/lib/components/timeline/TimelineDaySelectToggle.svelte`:**

```svelte
<script lang="ts">
  import { Icon } from '@immich/ui';
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js';

  type Props = {
    selected: boolean;
    /** Hiện nút (hover nhóm ngày, ngày đã chọn, hoặc đang ở chế độ chọn); khi ẩn vẫn focus được bằng bàn phím */
    visible: boolean;
    label: string;
    onSelect: () => void;
  };

  let { selected, visible, label, onSelect }: Props = $props();
</script>

<button
  type="button"
  class={[
    'flex shrink-0 items-center overflow-hidden transition-all duration-200 ease-out hover:cursor-pointer focus-visible:w-8 pointer-coarse:focus-visible:w-11',
    visible ? 'w-8 pointer-coarse:w-11' : 'w-0',
  ]}
  aria-label={label}
  aria-pressed={selected}
  onclick={onSelect}
>
  {#if selected}
    <Icon icon={mdiCheckCircle} size="24" class="shrink-0 text-primary" />
  {:else}
    <Icon icon={mdiCircleOutline} size="24" class="shrink-0 text-light-500" />
  {/if}
</button>
```

**3.5 `overrides/lib/components/timeline/Month.svelte`** — imports: replace:

```ts
  import AssetLayout from '$lib/components/timeline/AssetLayout.svelte';
```

with:

```ts
  import AssetLayout from '$lib/components/timeline/AssetLayout.svelte';
  import TimelineDaySelectToggle from '$lib/components/timeline/TimelineDaySelectToggle.svelte';
```

replace:

```ts
  import { fromTimelinePlainDate, getDateLocaleString } from '$lib/utils/timeline-util';
  import { Icon } from '@immich/ui';
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js';
  import type { Snippet } from 'svelte';
```

with:

```ts
  import { fromTimelinePlainDate, getDateLocaleString } from '$lib/utils/timeline-util';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
```

Markup — replace:

```svelte
      {#if !singleSelect}
        <div
          class="w-0 overflow-hidden transition-all duration-200 ease-out hover:cursor-pointer"
          class:w-8={hoveredTimelineDay === timelineDay.groupTitle ||
            assetInteraction.selectedGroup.has(timelineDay.groupTitle)}
          onclick={() => onTimelineDaySelect(timelineDay, assetsSnapshot(timelineDay.getAssets()))}
          onkeydown={() => onTimelineDaySelect(timelineDay, assetsSnapshot(timelineDay.getAssets()))}
        >
          {#if isTimelineDaySelected}
            <Icon icon={mdiCheckCircle} size="24" class="text-primary" />
          {:else}
            <Icon icon={mdiCircleOutline} size="24" class="text-light-500" />
          {/if}
        </div>
      {/if}
```

with:

```svelte
      {#if !singleSelect}
        <TimelineDaySelectToggle
          selected={isTimelineDaySelected}
          visible={hoveredTimelineDay === timelineDay.groupTitle ||
            isTimelineDaySelected ||
            assetInteraction.selectionActive}
          label={$t('timeline_select_day', { values: { date: getTimelineDayFullDate(timelineDay) } })}
          onSelect={() => onTimelineDaySelect(timelineDay, assetsSnapshot(timelineDay.getAssets()))}
        />
      {/if}
```

Keep the `<!-- svelte-ignore a11y_no_static_element_interactions -->` above `<section>` (the section still has `onmouseenter`/`onmouseleave`).

**3.6 `upstream/i18n/en.json`** — replace:

```json
  "timeline": "Timeline",
```

with:

```json
  "timeline": "Timeline",
  "timeline_select_day": "Select all photos from {date}",
```

**`upstream/i18n/vi.json`** — replace:

```json
  "timeline": "Dòng thời gian",
```

with:

```json
  "timeline": "Dòng thời gian",
  "timeline_select_day": "Chọn tất cả ảnh ngày {date}",
```

Existing keys reused without change: `select` (en.json:1942), `preview` (en.json:1732).

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```

Expected:

```
 M overrides/lib/components/assets/thumbnail/Thumbnail.svelte
 M overrides/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte
 M overrides/lib/components/timeline/Month.svelte
 M overrides/lib/components/timeline/Timeline.svelte
 M upstream/i18n/en.json
 M upstream/i18n/vi.json
 M upstream/web/src/lib/components/assets/thumbnail/Thumbnail.svelte
 M upstream/web/src/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte
 M upstream/web/src/lib/components/timeline/Month.svelte
 M upstream/web/src/lib/components/timeline/Timeline.svelte
?? overrides/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts
?? overrides/lib/components/timeline/TimelineDaySelectToggle.spec.ts
?? overrides/lib/components/timeline/TimelineDaySelectToggle.svelte
?? upstream/web/src/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts
?? upstream/web/src/lib/components/timeline/TimelineDaySelectToggle.spec.ts
?? upstream/web/src/lib/components/timeline/TimelineDaySelectToggle.svelte
```

Then confirm `patch_timeline` left the new prop intact: `rg -n "selectionMode=" upstream/web/src/lib/components/timeline/Timeline.svelte` → 1 hit.

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run src/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts src/lib/components/timeline/TimelineDaySelectToggle.spec.ts src/lib/components/assets/thumbnail/__test__/Thumbnail.spec.ts
```
Expect all passed (5 + 4 + 2). The upstream `Thumbnail.spec.ts` "single tabbable element" test must still pass.

```bash
rg -n "TimelineDaySelectToggle|timeline_select_day|selectionActive" overrides/lib/components/timeline/Month.svelte
rg -n "aria-label=\"(Preview asset|Thumbnail URL)\"" overrides/lib/components/assets/thumbnail/Thumbnail.svelte
pnpm --filter immich-web exec vitest run src/lib/i18n.spec.ts 2>&1 | tail -4
```
Expect: Month has import + usage + `timeline_select_day` + `assetInteraction.selectionActive`; no hard-coded labels remain (no output); `i18n.spec.ts` failure count stays at the 77 baseline (not higher).

```bash
pnpm --filter immich-web exec svelte-check 2>&1 | tail -3
pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/assets/thumbnail/Thumbnail.svelte src/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts src/lib/components/timeline/Month.svelte src/lib/components/timeline/Timeline.svelte src/lib/components/timeline/TimelineDaySelectToggle.svelte src/lib/components/timeline/TimelineDaySelectToggle.spec.ts src/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte
pnpm --filter immich-web exec prettier --check src/lib/components/assets/thumbnail/Thumbnail.svelte src/lib/components/timeline/Month.svelte src/lib/components/timeline/TimelineDaySelectToggle.svelte
```
Expect `30 errors and 1 warning`, eslint/prettier clean.

- [ ] **Step 6: Commit**

```bash
git add overrides/lib/components/assets/thumbnail/Thumbnail.svelte overrides/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts overrides/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte overrides/lib/components/timeline/Month.svelte overrides/lib/components/timeline/Timeline.svelte overrides/lib/components/timeline/TimelineDaySelectToggle.svelte overrides/lib/components/timeline/TimelineDaySelectToggle.spec.ts upstream/web/src/lib/components/assets/thumbnail/Thumbnail.svelte upstream/web/src/lib/components/assets/thumbnail/__test__/Thumbnail.touch.spec.ts upstream/web/src/lib/components/shared-components/gallery-viewer/GalleryViewer.svelte upstream/web/src/lib/components/timeline/Month.svelte upstream/web/src/lib/components/timeline/Timeline.svelte upstream/web/src/lib/components/timeline/TimelineDaySelectToggle.svelte upstream/web/src/lib/components/timeline/TimelineDaySelectToggle.spec.ts upstream/i18n/en.json upstream/i18n/vi.json
git commit -F - <<'EOF'
fix(timeline): nút chọn ảnh/ngày dùng được trên màn cảm ứng và bàn phím

- Thumbnail: prop selectionMode — luôn hiện nút chọn khi đang chọn ảnh; hiện khi focus bàn phím; nút preview hiện trên màn cảm ứng; vùng chạm 44px; aria-label qua $t
- Timeline/GalleryViewer truyền selectionMode
- Month: toggle chọn theo ngày là <button> thật (TimelineDaySelectToggle) có aria-label + aria-pressed, hiện khi đang chọn ảnh, rộng 44px trên màn cảm ứng
- i18n: thêm timeline_select_day (en, vi)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6 (nhóm 4-b): Hover-only on touch — shared-favorites "liked by", gallery FAB hint

**Findings covered:**
- C: Shared-favorites: hover-only avatar tooltips (`title=` only, stack `pointer-events-none`) — the "hover-only" part of "Shared-favorites: whole-list render, hover-only avatar tooltips, wide-screen columns" (wide columns → Task 6-c; whole-list render → Dropped)
- C: Gallery FAB cluster: physical `right`, wrong group label, hover-gated hint (`FeatureUpdatePin.svelte:107,161,169`)

**Files:**
- Create: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte` (tap/click/keyboard-reachable avatar stack with accessible name)
- Create: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts`
- Modify: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte` (use `LikedByStack`; card is a size container)
- Modify: `custom/src/components/FeatureUpdatePin.svelte` (drop mislabelled group; title on ellipsized pin; focus-visible state = hover state; logical inset; max-width without `100vw`)
- Test: copy `upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts`

**Interfaces:**
- Consumes: `pg-touch-target` (Task 3)
- Produces: none used by later tasks.

- [ ] **Step 1: Write the failing test** — create `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts`:

```ts
import { UserAvatarColor } from '@immich/sdk';
import { fireEvent, render, screen } from '@testing-library/svelte';
import LikedByStack from './LikedByStack.svelte';

const users = [
  {
    id: 'u1',
    name: 'An',
    email: 'an@example.com',
    profileImagePath: '',
    profileChangedAt: '2026-01-01T00:00:00.000Z',
    avatarColor: UserAvatarColor.Primary,
  },
  {
    id: 'u2',
    name: 'Binh',
    email: 'binh@example.com',
    profileImagePath: '',
    profileChangedAt: '2026-01-01T00:00:00.000Z',
    avatarColor: UserAvatarColor.Pink,
  },
];

describe('LikedByStack', () => {
  it('exposes who liked the asset as an accessible, tappable button', () => {
    render(LikedByStack, { users });
    const button = screen.getByRole('button', { name: 'shared_favorites_liked_by' });
    expect(button).toHaveClass('pg-touch-target', 'relative');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('reveals the names on tap and hides them on Escape', async () => {
    render(LikedByStack, { users });
    const button = screen.getByRole('button', { name: 'shared_favorites_liked_by' });
    await fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('liked-by-caption')).toBeInTheDocument();
    await fireEvent.keyDown(button, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('liked-by-caption')).toBeNull();
  });

  it('renders nothing without users', () => {
    render(LikedByStack, { users: [] });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

`FeatureUpdatePin.svelte` (in `custom/src/components`, not under any vitest include and with no copy) is verified by grep in Step 5.

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run LikedByStack
```

Expected: the suite fails to load with `Failed to resolve import "./LikedByStack.svelte"`.

- [ ] **Step 3: Implement**

**3.1 Create `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte`:**

```svelte
<script lang="ts">
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import type { UserAvatarColor } from '@immich/sdk';
  import { t } from 'svelte-i18n';

  type LikedByUser = {
    id: string;
    name: string;
    email: string;
    profileImagePath: string;
    profileChangedAt: string;
    avatarColor: UserAvatarColor;
  };

  interface Props {
    users: LikedByUser[];
  }

  let { users }: Props = $props();

  // Chạm/click/Enter để hiện tên — `title` chỉ hiện khi hover chuột, không dùng được trên màn cảm ứng
  let open = $state(false);

  const label = $derived(
    $t('shared_favorites_liked_by', { values: { name: users.map((user) => user.name).join(', ') } }),
  );

  const toggle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    open = !open;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      open = false;
    }
  };
</script>

{#if users.length > 0}
  <div class="absolute inset-e-2 bottom-2 z-20">
    {#if open}
      <span
        data-testid="liked-by-caption"
        aria-hidden="true"
        class="absolute end-0 bottom-full mb-1 w-max max-w-[calc(100cqw-1rem)] rounded-lg bg-black/75 px-2 py-1 text-xs text-white"
      >
        {label}
      </span>
    {/if}
    <button
      type="button"
      class="pg-touch-target relative flex rounded-full"
      aria-label={label}
      aria-expanded={open}
      title={label}
      onclick={toggle}
      onblur={() => (open = false)}
      onkeydown={onKeydown}
    >
      {#each users as user, index (user.id)}
        <span
          class="relative rounded-full ring-2 ring-black/50 {index > 0 ? '-ms-2' : ''}"
          style="z-index: {users.length - index}"
        >
          <UserAvatar {user} size="sm" noTitle />
        </span>
      {/each}
    </button>
  </div>
{/if}
```

(The caption is `aria-hidden` because the button's `aria-label` already carries the same text for screen readers.)

**3.2 `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte`** — import: replace:

```ts
  import type { PageData } from './$types';
```

with:

```ts
  import type { PageData } from './$types';
  import LikedByStack from './LikedByStack.svelte';
```

Card — replace:

```svelte
        <div class="relative isolate aspect-square overflow-hidden rounded-xl {removingIds.has(item.assetId) ? 'opacity-60' : ''}">
```

with:

```svelte
        <div class="@container relative isolate aspect-square overflow-hidden rounded-xl {removingIds.has(item.assetId) ? 'opacity-60' : ''}">
```

Stack — replace:

```svelte
          <div class="pointer-events-none absolute inset-e-2 bottom-2 flex">
            {#each item.favoritedBy as user, index (user.id)}
              <div
                class="relative rounded-full ring-2 ring-black/50 {index > 0 ? '-ms-2' : ''}"
                style="z-index: {item.favoritedBy.length - index}"
                title={$t('shared_favorites_liked_by', { values: { name: user.name } })}
              >
                <UserAvatar user={toAvatarUser(user)} size="sm" />
              </div>
            {/each}
          </div>
```

with:

```svelte
          <LikedByStack users={item.favoritedBy.map((user) => toAvatarUser(user))} />
```

Then remove the now-unused import line `  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';` from the page (eslint `no-unused-vars` would flag it).

**3.3 `custom/src/components/FeatureUpdatePin.svelte`** — group: replace:

```svelte
    <div class="pg-gallery-fabs" role="group" aria-label={$t('upload')}>
```

with:

```svelte
    <div class="pg-gallery-fabs">
```

(The cluster also holds the What's-new pin, so "upload" was a wrong group name; each button already has its own `aria-label`.)

Ellipsized pin label — replace:

```svelte
            class="pg-whats-new-pin__open"
            aria-label={$t('feature_updates_whats_new')}
```

with:

```svelte
            class="pg-whats-new-pin__open"
            aria-label={$t('feature_updates_whats_new')}
            title={$t('feature_updates_whats_new')}
```

Position — replace:

```css
    right: max(1rem, env(safe-area-inset-right, 0px));
```

with:

```css
    inset-inline-end: max(1rem, env(safe-area-inset-right, 0px));
```

replace:

```css
    max-width: calc(100vw - 2rem);
```

with:

```css
    /* 100% của viewport (không gồm thanh cuộn như 100vw), trừ lề + safe-area hai bên */
    max-width: calc(100% - max(1rem, env(safe-area-inset-left, 0px)) - max(1rem, env(safe-area-inset-right, 0px)));
```

Hover-only highlight — replace:

```css
  .pg-whats-new-pin:has(.pg-whats-new-pin__open:hover) {
```

with:

```css
  .pg-whats-new-pin:has(.pg-whats-new-pin__open:is(:hover, :focus-visible)) {
```

(Anchor on the property lines, not the full `.pg-gallery-fabs` rule: Task 1 may change `bottom`/`z-index`/layout of the same rule.)

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```

Expected:

```
 M custom/src/components/FeatureUpdatePin.svelte
 M "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
?? "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts"
?? "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte"
?? "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts"
?? "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte"
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run LikedByStack
```
Expect 3 passed.

```bash
rg -n "role=\"group\"|100vw|right: max|:hover, :focus-visible|title=\{\$t\('feature_updates_whats_new'\)\}" custom/src/components/FeatureUpdatePin.svelte
rg -n "pointer-events-none absolute inset-e-2|UserAvatar" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
```
Expect: first command only matches the `:is(:hover, :focus-visible)` line and the `title=` line (no `role="group"`, no `100vw`, no `right: max`); second command no output.

```bash
pnpm --filter immich-web exec svelte-check 2>&1 | tail -3
pnpm --filter immich-web exec eslint --max-warnings 0 "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte" "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts"
pnpm --filter immich-web exec prettier --check "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte" "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts"
```
Expect `30 errors and 1 warning`, eslint/prettier clean.

- [ ] **Step 6: Commit**

```bash
git add custom/src/components/FeatureUpdatePin.svelte "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts" "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.svelte" "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/LikedByStack.spec.ts"
git commit -F - <<'EOF'
fix(a11y): "đã thích bởi" và pin "Có gì mới" dùng được khi không có hover

- shared-favorites: cụm avatar thành nút LikedByStack (aria-label, chạm/Enter để hiện tên, Escape để ẩn, vùng chạm 44px) thay cho title chỉ hiện khi hover
- FeatureUpdatePin: bỏ role=group nhãn "upload" sai, thêm title cho nhãn bị cắt, trạng thái nổi bật khi focus-visible giống hover, dùng inset-inline-end và max-width không dùng 100vw

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7 (nhóm 5-a): Landscape & safe-area — mobile shell (bottom nav, content inset, toolbar)

**Findings covered:**
- A (Medium): Bottom-nav labels are `display:none` in landscape, leaving icon-only links with no accessible name
- A (Medium): No left/right safe-area padding on page content in mobile shell (landscape notch / Dynamic Island)
- A (Low): Content top offset (`top-16`) not synced with mobile toolbar height override (3rem) → 16px dead gap
- A (Low): Landscape nav offset variable smaller than real nav height (~4px overlap)
- A (Low): Bottom nav label 10px

Xác nhận lại trong code:
- `custom/src/styles/mobile-shell.css:408-410` `.pg-mobile-bottom-nav__label { display: none; }` trong `@media (orientation: landscape) and (max-height: 500px)`; `overrides/lib/components/mobile/MobileBottomNav.svelte` `<a>`/`<button class="pg-mobile-bottom-nav__item">` không có `aria-label`.
- `UserPageLayout.svelte:86` content `… w-full overflow-y-auto p-2`; `mobile-shell.css:89-92` `.pg-mobile-content { bottom; height: unset }` không có padding ngang; header (`:20-22`) và bottom nav (`:184-186`) có safe-area. `viewport-fit=cover` có thật (`custom/src/hooks.client.ts:43`, `upstream/web/src/app.html:10`).
- `UserPageLayout.svelte:57` `showToolbar ? 'top-16 pg-mobile-content' …` vs `mobile-shell.css:124-126` `html[data-mobile-shell] main .absolute.flex.h-16.w-full { height: 3rem; }` (selector này chỉ khớp toolbar của UserPageLayout — `rg` trong `upstream/web/src`, `overrides`, `custom`).
- `mobile-shell.css:396-398` landscape `--mobile-bottom-nav-height: 2.5rem` trong khi `.pg-mobile-bottom-nav__item { min-height: 44px }` + `border-top: 1px` → nav thật 45px + safe-area.
- `[Inference]` Portrait cũng lệch: item = padding 6+6 + icon 28 + gap 2 + label 10 (line-height 1) = 52px, nav = 1 + 52 + safe-area (border-box, `min-height` gồm padding), nhưng biến chỉ 3.125rem = 50px → chồng 3px. Sau khi label lên 11px: item 53px → nav 54px.
- `mobile-shell.css:280` `font-size: 0.625rem` (10px).
- Gutter hiện tại của content: `branding/src/fluent/responsive.css` (`@layer utilities`) `main .overflow-y-auto.p-2 { padding-inline: 4px }` dưới 640px, `8px` từ 640px. `mobile-shell.css` không nằm trong layer nên thắng các rule layer này.

**Files:**
- Modify: `custom/src/styles/mobile-shell.css` (biến chiều cao nav portrait/landscape, padding safe-area cho `.pg-mobile-content` và `.pg-mobile-toolbar`, xóa selector `.absolute.flex.h-16.w-full`, label 11px, comment label landscape)
- Modify: `overrides/lib/components/mobile/MobileBottomNav.svelte` (`aria-label={item.title}` cho `<a>` và `<button>`)
- Modify: `overrides/lib/components/layouts/UserPageLayout.svelte` (`top-12` + toolbar `h-12 pg-mobile-toolbar` khi mobile shell)
- Create: `overrides/lib/components/mobile/MobileBottomNav.spec.ts`
- Create: `overrides/lib/components/layouts/UserPageLayout.spec.ts`
- Test (copy): `upstream/web/src/lib/components/mobile/MobileBottomNav.spec.ts`, `upstream/web/src/lib/components/layouts/UserPageLayout.spec.ts`

**Interfaces:**
- Consumes: Task 1 — `:root` đầu `mobile-shell.css` đã có `--pg-gallery-fabs-height`/`--pg-gallery-fabs-gap`; rule upload panel/FAB dùng `--mobile-bottom-nav-offset` nên tự hưởng giá trị nav mới. Anchor edit theo selector.
- Produces:
  - `--mobile-bottom-nav-height`: `3.375rem` (portrait), `2.8125rem` (landscape ≤500px cao).
  - `--pg-mobile-content-gutter` (trên `.pg-mobile-content`): `8px` / `4px` dưới 640px.
  - Class `pg-mobile-toolbar` trên toolbar UserPageLayout khi mobile shell.
  - Bottom nav item có `aria-label` = title đã dịch (Task 7 không cần thêm lần nữa).

- [ ] **Step 1: Write the failing test**

Tạo `overrides/lib/components/mobile/MobileBottomNav.spec.ts`:

```ts
import { render } from '@testing-library/svelte';
import MobileBottomNav from './MobileBottomNav.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/photos') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$custom/utils/capabilities.svelte', () => ({
  can: () => true,
  isMobileShell: () => true,
  isMobileNavActive: (id: string) => id === 'library',
}));

describe('MobileBottomNav', () => {
  it('mỗi mục có aria-label để vẫn có tên khi label bị ẩn ở landscape', () => {
    const { getByRole } = render(MobileBottomNav);

    expect(getByRole('link', { name: 'photos' })).toHaveAttribute('aria-label', 'photos');
    expect(getByRole('link', { name: 'search' })).toHaveAttribute('aria-label', 'search');
    expect(getByRole('link', { name: 'more' })).toHaveAttribute('aria-label', 'more');
    expect(getByRole('button', { name: 'favorites' })).toHaveAttribute('aria-label', 'favorites');
  });
});
```

Tạo `overrides/lib/components/layouts/UserPageLayout.spec.ts`:

```ts
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import UserPageLayout from './UserPageLayout.svelte';

const shell = vi.hoisted(() => ({ mobile: true }));

vi.mock('$custom/utils/capabilities.svelte', () => ({
  can: () => true,
  isMobileShell: () => shell.mobile,
}));

const buttons = createRawSnippet(() => ({ render: () => '<span>toolbar-buttons</span>' }));
const sidebar = createRawSnippet(() => ({ render: () => '<aside>sidebar</aside>' }));

const getParts = (container: HTMLElement) => ({
  content: container.querySelector('main > .overflow-y-auto'),
  toolbar: container.querySelector('main > .absolute.flex'),
});

describe('UserPageLayout', () => {
  afterEach(() => {
    shell.mobile = true;
  });

  it('mobile shell: toolbar cao 3rem (h-12) và nội dung bắt đầu ở top-12', () => {
    const { container } = render(UserPageLayout, { hideNavbar: true, buttons });
    const { content, toolbar } = getParts(container);

    expect(content).toHaveClass('top-12', 'pg-mobile-content');
    expect(content).not.toHaveClass('top-16');
    expect(toolbar).toHaveClass('h-12', 'pg-mobile-toolbar');
    expect(toolbar).not.toHaveClass('h-16');
  });

  it('desktop giữ toolbar h-16 và nội dung top-16', () => {
    shell.mobile = false;
    const { container } = render(UserPageLayout, { hideNavbar: true, buttons, sidebar });
    const { content, toolbar } = getParts(container);

    expect(content).toHaveClass('top-16');
    expect(content).not.toHaveClass('pg-mobile-content');
    expect(toolbar).toHaveClass('h-16');
    expect(toolbar).not.toHaveClass('pg-mobile-toolbar');
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/components/mobile/MobileBottomNav.spec.ts src/lib/components/layouts/UserPageLayout.spec.ts
```
Kỳ vọng:
- MobileBottomNav: FAIL `Expected the element to have attribute: aria-label="photos"`.
- UserPageLayout: test mobile FAIL (`top-12` thiếu, đang là `top-16`); test desktop PASS (regression guard).

- [ ] **Step 3: Implement**

**3a. `overrides/lib/components/mobile/MobileBottomNav.svelte`**

Old:
```svelte
          <button
            type="button"
            class="pg-mobile-bottom-nav__item"
            class:pg-mobile-bottom-nav__item--active={active}
            aria-current={active ? 'page' : undefined}
            aria-expanded={favoritesOpen}
```
New:
```svelte
          <button
            type="button"
            class="pg-mobile-bottom-nav__item"
            class:pg-mobile-bottom-nav__item--active={active}
            aria-label={item.title}
            aria-current={active ? 'page' : undefined}
            aria-expanded={favoritesOpen}
```

Old:
```svelte
        <a
          href={item.href}
          class="pg-mobile-bottom-nav__item"
          class:pg-mobile-bottom-nav__item--active={active}
          aria-current={active ? 'page' : undefined}
```
New:
```svelte
        <a
          href={item.href}
          class="pg-mobile-bottom-nav__item"
          class:pg-mobile-bottom-nav__item--active={active}
          aria-label={item.title}
          aria-current={active ? 'page' : undefined}
```

**3b. `overrides/lib/components/layouts/UserPageLayout.svelte`**

Old:
```ts
  let hasTitleClass = $derived.by(() => {
    if (mobileShell) {
      return showToolbar ? 'top-16 pg-mobile-content' : 'top-0 pg-mobile-content';
    }
    return showToolbar ? 'top-16 h-[calc(100%-(--spacing(16)))]' : 'top-0 h-full';
  });
```
New:
```ts
  let hasTitleClass = $derived.by(() => {
    if (mobileShell) {
      // Toolbar mobile cao 3rem (h-12) → nội dung bắt đầu ngay dưới, không còn khe 16px
      return showToolbar ? 'top-12 pg-mobile-content' : 'top-0 pg-mobile-content';
    }
    return showToolbar ? 'top-16 h-[calc(100%-(--spacing(16)))]' : 'top-0 h-full';
  });
  const toolbarClass = $derived(mobileShell ? 'h-12 pg-mobile-toolbar' : 'h-16');
```

Old:
```svelte
      <div class="absolute flex h-16 w-full place-items-center justify-between border-b p-2 text-dark">
```
New:
```svelte
      <div class="absolute flex {toolbarClass} w-full place-items-center justify-between border-b p-2 text-dark">
```

**3c. `custom/src/styles/mobile-shell.css`**

Old:
```css
html[data-mobile-shell],
:root:has(.pg-mobile-bottom-nav) {
  --mobile-bottom-nav-height: 3.125rem;
```
New:
```css
html[data-mobile-shell],
:root:has(.pg-mobile-bottom-nav) {
  /* = border-top 1px + item 53px (padding 12 + icon 28 + gap 2 + label 11) — khớp chiều cao nav thật */
  --mobile-bottom-nav-height: 3.375rem;
```

Old:
```css
.pg-mobile-content {
  bottom: var(--mobile-bottom-nav-offset);
  height: unset;
}
```
New:
```css
.pg-mobile-content {
  /* Gutter như fluent/responsive.css (4px < 640px, 8px từ 640px), không nhỏ hơn notch khi landscape */
  --pg-mobile-content-gutter: var(--spacingHorizontalS, 8px);

  bottom: var(--mobile-bottom-nav-offset);
  height: unset;
  padding-left: max(var(--pg-mobile-content-gutter), env(safe-area-inset-left, 0px));
  padding-right: max(var(--pg-mobile-content-gutter), env(safe-area-inset-right, 0px));
}

@media (max-width: 639px) {
  .pg-mobile-content {
    --pg-mobile-content-gutter: var(--spacingHorizontalXS, 4px);
  }
}

.pg-mobile-toolbar {
  padding-left: max(0.5rem, env(safe-area-inset-left, 0px));
  padding-right: max(0.5rem, env(safe-area-inset-right, 0px));
}
```

Xóa block (chiều cao toolbar giờ do `h-12` trong UserPageLayout):
```css
html[data-mobile-shell] main .absolute.flex.h-16.w-full {
  height: 3rem;
}

```

Old:
```css
.pg-mobile-bottom-nav__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.625rem;
```
New:
```css
.pg-mobile-bottom-nav__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.6875rem;
```

Old:
```css
@media (orientation: landscape) and (max-height: 500px) {
  html[data-mobile-shell] {
    --mobile-bottom-nav-height: 2.5rem;
  }
```
New:
```css
@media (orientation: landscape) and (max-height: 500px) {
  html[data-mobile-shell] {
    /* = border-top 1px + item min-height 44px (label ẩn) */
    --mobile-bottom-nav-height: 2.8125rem;
  }
```

Old:
```css
  .pg-mobile-bottom-nav__label {
    display: none;
  }
}
```
New:
```css
  /* Chỉ icon; tên truy cập vẫn có qua aria-label trên item (MobileBottomNav.svelte) */
  .pg-mobile-bottom-nav__label {
    display: none;
  }
}
```

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```
Kỳ vọng:
```
 M custom/src/styles/mobile-shell.css
 M overrides/lib/components/layouts/UserPageLayout.svelte
 M overrides/lib/components/mobile/MobileBottomNav.svelte
 M upstream/web/src/lib/components/layouts/UserPageLayout.svelte
 M upstream/web/src/lib/components/mobile/MobileBottomNav.svelte
 M upstream/web/static/mobile-shell.css
?? overrides/lib/components/layouts/UserPageLayout.spec.ts
?? overrides/lib/components/mobile/MobileBottomNav.spec.ts
?? upstream/web/src/lib/components/layouts/UserPageLayout.spec.ts
?? upstream/web/src/lib/components/mobile/MobileBottomNav.spec.ts
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run src/lib/components/mobile/MobileBottomNav.spec.ts src/lib/components/layouts/UserPageLayout.spec.ts
# Kỳ vọng: 3 passed

rg -n "h-16\.w-full|2\.5rem|3\.125rem|0\.625rem" custom/src/styles/mobile-shell.css
# Kỳ vọng: không có kết quả (exit 1)

rg -n "3\.375rem|2\.8125rem|0\.6875rem|pg-mobile-content-gutter|pg-mobile-toolbar|safe-area-inset-left" custom/src/styles/mobile-shell.css
# Kỳ vọng: mỗi giá trị mới xuất hiện; safe-area-inset-left có ở #dashboard-navbar, .pg-mobile-content, .pg-mobile-toolbar, .pg-mobile-bottom-nav

diff -q custom/src/styles/mobile-shell.css upstream/web/static/mobile-shell.css && echo in-sync

pnpm --filter immich-web exec svelte-check
# Kỳ vọng: 30 errors / 1 warning, không lỗi mới

pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/mobile/MobileBottomNav.svelte src/lib/components/mobile/MobileBottomNav.spec.ts src/lib/components/layouts/UserPageLayout.svelte src/lib/components/layouts/UserPageLayout.spec.ts
# Kỳ vọng: exit 0
```

Kiểm tay `[Unverified]`: iPhone landscape (notch trái) — cột ảnh đầu không nằm dưới notch; bottom nav chỉ icon, VoiceOver đọc "Photos"; trang có toolbar (ví dụ Albums) không còn khe 16px dưới toolbar; DevTools đo `.pg-mobile-bottom-nav` = `--mobile-bottom-nav-offset` ở cả dọc và ngang.

- [ ] **Step 6: Commit**

```bash
git add custom/src/styles/mobile-shell.css \
  overrides/lib/components/mobile/MobileBottomNav.svelte \
  overrides/lib/components/mobile/MobileBottomNav.spec.ts \
  overrides/lib/components/layouts/UserPageLayout.svelte \
  overrides/lib/components/layouts/UserPageLayout.spec.ts \
  upstream/web/static/mobile-shell.css \
  upstream/web/src/lib/components/mobile/MobileBottomNav.svelte \
  upstream/web/src/lib/components/mobile/MobileBottomNav.spec.ts \
  upstream/web/src/lib/components/layouts/UserPageLayout.svelte \
  upstream/web/src/lib/components/layouts/UserPageLayout.spec.ts
git commit -F - <<'EOF'
fix(mobile): safe-area ngang cho nội dung, aria-label bottom nav, khớp chiều cao nav

Landscape ẩn label bottom nav bằng display:none nên link chỉ còn icon, không
có tên truy cập: thêm aria-label={item.title} cho mọi item. Nội dung
.pg-mobile-content và toolbar mobile chừa safe-area trái/phải (notch khi
landscape) với gutter giữ như responsive.css. Toolbar mobile dùng h-12 và
nội dung top-12 trong UserPageLayout, bỏ selector .absolute.flex.h-16.w-full
và khe 16px. --mobile-bottom-nav-height khớp chiều cao nav thật (54px dọc
với label 11px, 45px ngang) để content/FAB/upload panel không bị nav đè.
Spec: MobileBottomNav.spec.ts, UserPageLayout.spec.ts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8 (nhóm 5-b): Landscape & safe-area — MaintenancePage clipping, Blocked page

**Findings covered:**
- C (Medium): Maintenance / stale-chunk page clips its top content in short viewports
- C (Medium): Blocked page is hard-coded white and uses `100vh` (không có lối thoát)

Xác nhận lại trong code:
- `custom/src/styles/custom.css:64-93` `.pg-server-error, .pg-maintenance { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; … overflow: auto; }` — nội dung cao hơn viewport tràn đều lên trên, không cuộn tới được. Class dùng bởi `custom/src/components/MaintenancePage.svelte` (và `.pg-server-error*` cho trang lỗi kết nối) — sửa CSS, không cần sửa `.svelte`.
- `custom/src/routes/(user)/blocked/+page.svelte:5-7` `<div class="flex h-screen w-full items-center justify-center bg-white">`, `text-gray-800`; không có link thoát. Khối `<style> div { margin: 0; padding: 0; }` (scoped, không layer) thắng mọi utility padding của Tailwind → phải bỏ để thêm padding.
- Ghi chú: audit-C trích `blocked/+page.svelte:54` cho chuỗi hard-code nhưng file chỉ có 16 dòng — chuỗi nằm ở dòng 7. Việc chuyển chuỗi sang i18n thuộc Task 9; task này giữ nguyên chuỗi.
- `Route.logout()` = `'/auth/logout'` (`upstream/web/src/lib/route.ts:50`), route `upstream/web/src/routes/auth/logout/+page.svelte` gọi `authManager.logout()`; key `log_out` có sẵn (`upstream/i18n/en.json:1379`, upstream `DeviceCard`, `AccountInfoPanel` dùng).

**Files:**
- Modify: `custom/src/styles/custom.css` (`align-items: flex-start` + `margin-block: auto` cho content; ẩn art khi cao ≤480px)
- Modify: `custom/src/routes/(user)/blocked/+page.svelte` (`min-h-dvh`, màu theme, padding safe-area, `<h1>`, link đăng xuất)
- Create: `custom/src/routes/(user)/blocked/page.spec.ts`
- Test (copy): `upstream/web/src/routes/(user)/blocked/page.spec.ts`

**Interfaces:**
- Consumes: none (không đụng `mobile-shell.css`)
- Produces: class `pg-blocked-page` (scoped trong blocked page). Không có i18n key mới (dùng `log_out` sẵn có).

- [ ] **Step 1: Write the failing test**

Tạo `custom/src/routes/(user)/blocked/page.spec.ts`:

```ts
import { render } from '@testing-library/svelte';
import BlockedPage from './+page.svelte';

describe('blocked page', () => {
  it('dùng min-h-dvh và màu theme thay cho h-screen/bg-white', () => {
    const { container } = render(BlockedPage);
    const root = container.firstElementChild;

    expect(root).toHaveClass('min-h-dvh', 'bg-(--md-sys-color-surface)', 'text-(--md-sys-color-on-surface)');
    expect(root).not.toHaveClass('h-screen');
    expect(root).not.toHaveClass('bg-white');
  });

  it('có lối thoát: link đăng xuất tới /auth/logout', () => {
    const { getByRole } = render(BlockedPage);

    expect(getByRole('link', { name: 'log_out' })).toHaveAttribute('href', '/auth/logout');
  });

  it('tiêu đề trang là heading', () => {
    const { getByRole } = render(BlockedPage);

    expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
```

MaintenancePage: thay đổi là CSS → verify bằng grep ở Step 5.

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run "src/routes/(user)/blocked/page.spec.ts"
```
Kỳ vọng: 3 FAIL — root có `h-screen bg-white`; `Unable to find an accessible element with the role "link" and name "log_out"`; không có `heading` level 1.

- [ ] **Step 3: Implement**

**3a. `custom/src/routes/(user)/blocked/+page.svelte`** — thay toàn bộ file:

```svelte
<script lang="ts">
  import { Route } from '$lib/route';
  import { t } from 'svelte-i18n';
</script>

<div
  class="pg-blocked-page flex min-h-dvh w-full items-center justify-center bg-(--md-sys-color-surface) text-(--md-sys-color-on-surface)"
>
  <div class="flex flex-col items-center gap-6 text-center">
    <h1 class="text-2xl font-semibold">Trang web đã dừng hoạt động</h1>
    <a
      href={Route.logout()}
      class="inline-flex min-h-11 items-center justify-center rounded-full border border-(--md-sys-color-outline) px-6 text-base font-medium text-(--md-sys-color-primary) hover:bg-(--md-state-on-surface-hover)"
    >
      {$t('log_out')}
    </a>
  </div>
</div>

<style>
  /* Chừa notch / home indicator (PWA standalone, viewport-fit=cover) */
  .pg-blocked-page {
    box-sizing: border-box;
    padding: max(1.5rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px))
      max(1.5rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px));
  }
</style>
```

**3b. `custom/src/styles/custom.css`**

Old:
```css
  min-height: 100dvh;
  width: 100%;
  align-items: center;
  justify-content: center;
  background: var(--md-sys-color-surface);
```
New:
```css
  min-height: 100dvh;
  width: 100%;
  /*
   * flex-start + margin-block:auto ở __content: căn giữa khi đủ chỗ; khi nội dung cao hơn viewport
   * (phone landscape) thì bám đầu, cuộn được tới tiêu đề (align-items:center làm tràn lên trên, bị cắt).
   */
  align-items: flex-start;
  justify-content: center;
  background: var(--md-sys-color-surface);
```

Old:
```css
.pg-maintenance__content,
.pg-server-error__content {
  width: 100%;
  max-width: 34rem;
  text-align: center;
}
```
New:
```css
.pg-maintenance__content,
.pg-server-error__content {
  width: 100%;
  max-width: 34rem;
  margin-block: auto;
  text-align: center;
}
```

Old:
```css
@media (max-width: 360px) {
  .pg-maintenance__title,
  .pg-server-error__title {
    font-size: 1.5rem;
  }
```
New:
```css
/* Viewport thấp (phone landscape): bỏ hình minh họa ~22rem để tiêu đề + mô tả vừa màn */
@media (max-height: 480px) {
  .pg-maintenance__art {
    display: none;
  }
}

@media (max-width: 360px) {
  .pg-maintenance__title,
  .pg-server-error__title {
    font-size: 1.5rem;
  }
```

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```
Kỳ vọng:
```
 M "custom/src/routes/(user)/blocked/+page.svelte"
 M custom/src/styles/custom.css
 M "upstream/web/src/routes/(user)/blocked/+page.svelte"
 M upstream/web/static/custom.css
?? "custom/src/routes/(user)/blocked/page.spec.ts"
?? "upstream/web/src/routes/(user)/blocked/page.spec.ts"
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run "src/routes/(user)/blocked/page.spec.ts"
# Kỳ vọng: 3 passed

rg -n "align-items: flex-start|margin-block: auto|max-height: 480px" custom/src/styles/custom.css
# Kỳ vọng: 3 kết quả
rg -n "align-items: center;" custom/src/styles/custom.css
# Kỳ vọng: không còn trong block .pg-server-error, .pg-maintenance (dòng ~64-93)

diff <(sed -e 's|@photo-gallery/branding/|/branding/|g' -e "s|@import '../../../branding/src/|@import '/branding/|g" custom/src/styles/custom.css) upstream/web/static/custom.css && echo in-sync
# Kỳ vọng: in-sync

rg -n "h-screen|bg-white|text-gray-800" "custom/src/routes/(user)/blocked/+page.svelte"
# Kỳ vọng: không có kết quả (exit 1)

pnpm --filter immich-web exec svelte-check
# Kỳ vọng: 30 errors / 1 warning, không lỗi mới

pnpm --filter immich-web exec eslint --max-warnings 0 "src/routes/(user)/blocked/+page.svelte" "src/routes/(user)/blocked/page.spec.ts"
# Kỳ vọng: exit 0
```

Kiểm tay `[Unverified]`: mở `/error-page` (route preview trang bảo trì, commit `fb286ecdd`) ở 844×390 → tiêu đề thấy được, cuộn được; `/blocked` ở dark mode → nền surface tối, nút Log out cao ≥44px đưa về `/auth/logout`.

- [ ] **Step 6: Commit**

```bash
git add custom/src/styles/custom.css upstream/web/static/custom.css \
  "custom/src/routes/(user)/blocked/+page.svelte" "custom/src/routes/(user)/blocked/page.spec.ts" \
  "upstream/web/src/routes/(user)/blocked/+page.svelte" "upstream/web/src/routes/(user)/blocked/page.spec.ts"
git commit -F - <<'EOF'
fix(mobile): trang bảo trì không cắt đầu khi landscape, trang blocked theo theme

.pg-maintenance/.pg-server-error dùng align-items:center với overflow:auto
nên nội dung cao hơn viewport tràn lên trên và không cuộn tới được tiêu đề.
Đổi sang align-items:flex-start + margin-block:auto ở __content, ẩn hình
minh họa khi cao ≤480px.
Trang /blocked bỏ h-screen + bg-white/text-gray-800 cứng: min-h-dvh, màu
md-sys surface/on-surface, padding safe-area, tiêu đề là <h1>, thêm link
đăng xuất (Route.logout) để user bị chặn có lối thoát.
Spec: blocked/page.spec.ts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9 (nhóm 6-a): Tablet / wide — width-aware grid column count

**Findings covered:**
- B: Grid column cap of 6 and default 4 for all coarse/narrow devices — poor tablet sizing (`overrides/lib/stores/grid-density.svelte.ts:3-5`, `overrides/lib/utils/mobile-performance.svelte.ts:115-125`)

Verified extra defect in the same code: `readStoredColumns()` does `Number(localStorage.getItem(STORAGE_KEY))`; when the key is absent, `Number(null) === 0` passes `Number.isFinite`, so `clampGridColumns(0)` returns **3**, not `GRID_COLUMNS_DEFAULT` (4). Users who never pinched currently get 3 columns. This task fixes the null handling, so phone users who never pinched go from 3 to 4 columns — see **Decision needed** at the end.

**Files:**
- Modify: `overrides/lib/stores/grid-density.svelte.ts` (width-aware default/max; store user choice as an offset; migrate legacy key; fix null parse)
- Modify: `overrides/lib/stores/grid-density.spec.ts` (new cases)
- Modify: `overrides/lib/utils/mobile-performance.svelte.ts` (use `columnsFor(width)`)
- Modify: `overrides/lib/actions/pinch-grid.svelte.ts` (comment only: range)
- Test: copy `upstream/web/src/lib/stores/grid-density.spec.ts`

**Interfaces:**
- Consumes: none
- Produces: exports `GRID_COLUMNS_MAX_WIDE = 10`, `GRID_WIDE_MIN_WIDTH = 768`, `GRID_WIDE_TARGET_CELL = 160`, `getGridColumnsMax(width)`, `getDefaultGridColumns(width)`, `clampGridColumns(value, width = 0)`, `resolveGridColumns(width, offset)`, `readStoredGridOffset(storage)`; `gridDensityManager.columns` (now width-aware, same name/consumers), `gridDensityManager.columnsFor(width)`, `gridDensityManager.offset`; localStorage key `pg-grid-columns-offset` (legacy `pg-grid-columns` read once for migration).

Default column table (no pinch offset): width 390 → 4, 767 → 4, 768 → 5, 1024 → 6, 1180 → 7, 1366 → 9, ≥1600 → 10. Max: 6 below 768px, 10 from 768px.

- [ ] **Step 1: Write the failing test** — replace `overrides/lib/stores/grid-density.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  GRID_COLUMNS_MAX,
  GRID_COLUMNS_MAX_WIDE,
  GRID_COLUMNS_MIN,
  clampGridColumns,
  getDefaultGridColumns,
  getGridColumnsMax,
  readStoredGridOffset,
  resolveGridColumns,
} from './grid-density.svelte';

const storage = (values: Record<string, string>) => ({
  getItem: (key: string) => (key in values ? values[key] : null),
});

describe('grid density columns', () => {
  it('clamps to 3–6', () => {
    expect(clampGridColumns(2)).toBe(GRID_COLUMNS_MIN);
    expect(clampGridColumns(3)).toBe(3);
    expect(clampGridColumns(6)).toBe(6);
    expect(clampGridColumns(9)).toBe(GRID_COLUMNS_MAX);
  });

  it('allows up to 10 columns from 768px wide', () => {
    expect(getGridColumnsMax(767)).toBe(GRID_COLUMNS_MAX);
    expect(getGridColumnsMax(768)).toBe(GRID_COLUMNS_MAX_WIDE);
    expect(clampGridColumns(9, 1024)).toBe(9);
    expect(clampGridColumns(12, 1024)).toBe(GRID_COLUMNS_MAX_WIDE);
    expect(clampGridColumns(2, 1024)).toBe(GRID_COLUMNS_MIN);
  });

  it('derives the default from the width', () => {
    expect(getDefaultGridColumns(390)).toBe(4);
    expect(getDefaultGridColumns(767)).toBe(4);
    expect(getDefaultGridColumns(768)).toBe(5);
    expect(getDefaultGridColumns(1024)).toBe(6);
    expect(getDefaultGridColumns(1366)).toBe(9);
    expect(getDefaultGridColumns(2560)).toBe(GRID_COLUMNS_MAX_WIDE);
  });

  it('applies the pinch offset on top of the width default, clamped per width', () => {
    expect(resolveGridColumns(390, 0)).toBe(4);
    expect(resolveGridColumns(1024, 0)).toBe(6);
    expect(resolveGridColumns(1024, 2)).toBe(8);
    expect(resolveGridColumns(390, 2)).toBe(6);
    expect(resolveGridColumns(390, 5)).toBe(GRID_COLUMNS_MAX);
    expect(resolveGridColumns(1366, -10)).toBe(GRID_COLUMNS_MIN);
  });

  it('reads the stored offset and migrates the legacy absolute value', () => {
    expect(readStoredGridOffset(storage({}))).toBe(0);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns-offset': '2' }))).toBe(2);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '5' }))).toBe(1);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '3' }))).toBe(-1);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '9' }))).toBe(2);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': 'abc' }))).toBe(0);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '' }))).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/stores/grid-density.spec.ts
```

Expected: 1 passed ("clamps to 3–6"), 4 failed with `TypeError: ... is not a function` (`getGridColumnsMax`, `getDefaultGridColumns`, `resolveGridColumns`, `readStoredGridOffset` are not exported yet).

- [ ] **Step 3: Implement**

**3.1 Replace the whole of `overrides/lib/stores/grid-density.svelte.ts` with:**

```ts
import { browser } from '$app/environment';
import { innerWidth } from 'svelte/reactivity/window';

export const GRID_COLUMNS_MIN = 3;
/** Tối đa trên điện thoại (<768px) */
export const GRID_COLUMNS_MAX = 6;
/** Tối đa trên tablet / cửa sổ rộng (≥768px) */
export const GRID_COLUMNS_MAX_WIDE = 10;
export const GRID_COLUMNS_DEFAULT = 4;
/** Từ bề rộng này, số cột mặc định tính theo bề rộng thay vì cố định 4 */
export const GRID_WIDE_MIN_WIDTH = 768;
/** Bề rộng ô mục tiêu (px) khi tính số cột mặc định trên màn rộng */
export const GRID_WIDE_TARGET_CELL = 160;

/** Khoá cũ: số cột tuyệt đối (3–6) */
const LEGACY_STORAGE_KEY = 'pg-grid-columns';
/** Khoá mới: độ lệch so với số cột mặc định theo bề rộng — giữ lựa chọn pinch khi xoay iPad */
const OFFSET_STORAGE_KEY = 'pg-grid-columns-offset';

export const getGridColumnsMax = (width: number): number =>
  width >= GRID_WIDE_MIN_WIDTH ? GRID_COLUMNS_MAX_WIDE : GRID_COLUMNS_MAX;

export const getDefaultGridColumns = (width: number): number => {
  if (width < GRID_WIDE_MIN_WIDTH) {
    return GRID_COLUMNS_DEFAULT;
  }

  return Math.min(
    GRID_COLUMNS_MAX_WIDE,
    Math.max(GRID_COLUMNS_DEFAULT + 1, Math.round(width / GRID_WIDE_TARGET_CELL)),
  );
};

export const clampGridColumns = (value: number, width = 0): number =>
  Math.min(getGridColumnsMax(width), Math.max(GRID_COLUMNS_MIN, Math.round(value)));

export const resolveGridColumns = (width: number, offset: number): number =>
  clampGridColumns(getDefaultGridColumns(width) + offset, width);

const parseStoredNumber = (raw: string | null): number | undefined => {
  // Number(null) === 0 từng làm mặc định thành 3 cột khi chưa lưu gì
  if (raw === null || raw.trim() === '') {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Đọc độ lệch đã lưu; chuyển đổi khoá cũ (số cột tuyệt đối) nếu chưa có khoá mới */
export const readStoredGridOffset = (storage: Pick<Storage, 'getItem'>): number => {
  const offset = parseStoredNumber(storage.getItem(OFFSET_STORAGE_KEY));
  if (offset !== undefined) {
    return Math.round(offset);
  }

  const legacy = parseStoredNumber(storage.getItem(LEGACY_STORAGE_KEY));
  if (legacy !== undefined) {
    return clampGridColumns(legacy) - GRID_COLUMNS_DEFAULT;
  }

  return 0;
};

const readInitialOffset = (): number => {
  if (!browser) {
    return 0;
  }

  try {
    return readStoredGridOffset(localStorage);
  } catch {
    // localStorage unavailable
    return 0;
  }
};

const viewportWidth = (): number => innerWidth.current ?? 0;

class GridDensityManager {
  offset = $state(readInitialOffset());

  /** Số cột theo bề rộng cửa sổ hiện tại */
  get columns(): number {
    return resolveGridColumns(viewportWidth(), this.offset);
  }

  /** Số cột cho một vùng lưới có bề rộng cụ thể (vd. timeline đã trừ sidebar) */
  columnsFor(width: number): number {
    return resolveGridColumns(width || viewportWidth(), this.offset);
  }

  setColumns(next: number): boolean {
    const width = viewportWidth();
    const clamped = clampGridColumns(next, width);
    if (clamped === this.columns) {
      return false;
    }

    this.offset = clamped - getDefaultGridColumns(width);
    if (browser) {
      try {
        localStorage.setItem(OFFSET_STORAGE_KEY, String(this.offset));
      } catch {
        // localStorage unavailable
      }
    }
    return true;
  }
}

export const gridDensityManager = new GridDensityManager();
```

**3.2 `overrides/lib/utils/mobile-performance.svelte.ts`** — replace:

```ts
    const columns = gridDensityManager.columns;
```

with:

```ts
    const columns = gridDensityManager.columnsFor(width);
```

**3.3 `overrides/lib/actions/pinch-grid.svelte.ts`** — replace:

```ts
/** Pinch 2 ngón trên mobile: chum lại = nhiều ảnh hơn, xoè ra = ít ảnh hơn (3–6). */
```

with:

```ts
/** Pinch 2 ngón trên mobile: chum lại = nhiều ảnh hơn, xoè ra = ít ảnh hơn (3–6 trên điện thoại, 3–10 từ 768px). */
```

No change is needed in `Timeline.svelte`, `GalleryViewer.svelte` or the shared-favorites page: they read `gridDensityManager.columns`, which now tracks both `offset` and `innerWidth`, so their `$effect`/`$derived` re-run on resize and on pinch.

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```

Expected:

```
 M overrides/lib/actions/pinch-grid.svelte.ts
 M overrides/lib/stores/grid-density.spec.ts
 M overrides/lib/stores/grid-density.svelte.ts
 M overrides/lib/utils/mobile-performance.svelte.ts
 M upstream/web/src/lib/actions/pinch-grid.svelte.ts
 M upstream/web/src/lib/stores/grid-density.spec.ts
 M upstream/web/src/lib/stores/grid-density.svelte.ts
 M upstream/web/src/lib/utils/mobile-performance.svelte.ts
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter immich-web exec vitest run src/lib/stores/grid-density.spec.ts
```
Expect 5 passed.

```bash
rg -n "gridDensityManager\.columns" overrides custom --glob '!*.spec.ts'
pnpm --filter immich-web exec svelte-check 2>&1 | tail -3
pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/stores/grid-density.svelte.ts src/lib/stores/grid-density.spec.ts src/lib/utils/mobile-performance.svelte.ts src/lib/actions/pinch-grid.svelte.ts
pnpm --filter immich-web exec prettier --check src/lib/stores/grid-density.svelte.ts src/lib/stores/grid-density.spec.ts src/lib/utils/mobile-performance.svelte.ts
```
Expect: `rg` lists the unchanged consumers (pinch-grid x3, GalleryViewer, Timeline, shared-favorites x3) plus `columnsFor` in mobile-performance; svelte-check `30 errors and 1 warning`; eslint/prettier clean. Manual `[Inference]`: iPad-size coarse emulation 1024×768 → 6 columns by default, pinch reaches 10; 390×844 → 4 columns, pinch range 3–6.

- [ ] **Step 6: Commit**

```bash
git add overrides/lib/stores/grid-density.svelte.ts overrides/lib/stores/grid-density.spec.ts overrides/lib/utils/mobile-performance.svelte.ts overrides/lib/actions/pinch-grid.svelte.ts upstream/web/src/lib/stores/grid-density.svelte.ts upstream/web/src/lib/stores/grid-density.spec.ts upstream/web/src/lib/utils/mobile-performance.svelte.ts upstream/web/src/lib/actions/pinch-grid.svelte.ts
git commit -F - <<'EOF'
fix(grid): số cột lưới theo bề rộng màn hình cho tablet

- Mặc định 4 cột dưới 768px; từ 768px tính theo ô ~160px (1024px = 6 cột, 1366px = 9), tối đa 10
- Lựa chọn pinch lưu thành độ lệch (pg-grid-columns-offset), chuyển đổi khoá cũ pg-grid-columns
- Sửa lỗi Number(null) làm mặc định thành 3 cột khi chưa lưu
- Timeline/gallery dùng columnsFor(bề rộng lưới)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10 (nhóm 6-b): Tablet / wide — admin tables, dashboard, long emails

**Findings covered:**
- C: Admin users / library tables drop data on phones, and hide stats on tablets
- C: Dashboard heatmap likely renders ~5px cells at 360px `[Inference]`
- C: Dashboard: storage header and wide layout (no `flex-wrap`, `max-w-6xl` at ≥1536)
- C: Long emails/paths not wrapped in admin lists (`admin/feature-updates/+page.svelte` subscriber list; the audit's line 474 is now line 201; library paths already have `break-all`)

**Files:**
- Modify: `custom/src/routes/admin/users/(list)/+layout.svelte` (email line under name below md; quota from md; `break-all`)
- Modify: `custom/src/routes/admin/library-management/(list)/+layout.svelte` (owner + size line below md; photo/video counts from md)
- Modify: `custom/src/routes/(user)/dashboard/+page.svelte` (heatmap min width + scroll to latest; header wrap; 2xl width)
- Modify: `custom/src/routes/admin/feature-updates/+page.svelte` (`break-all` on subscriber emails)
- Test: none (see Step 1)

**Interfaces:**
- Consumes: none
- Produces: none

- [ ] **Step 1: Write the failing test** — not jsdom-testable: every change is breakpoint CSS (`md:hidden`, `md:block`, `2xl:max-w-7xl`), a `min-width` on an upstream child component, or a scroll offset that happy-dom does not lay out (`scrollWidth` is 0). These route layouts/pages have no spec harness (they need `AdminPageLayout`, `OnEvents`, `data` promises). Verification is the grep in Step 5. Pre-change baseline (expect these exact matches now):

```bash
rg -n "column2: 'hidden md:block md:w-5/12 lg:w-4/12'|column3: 'hidden lg:block" "custom/src/routes/admin/users/(list)/+layout.svelte" "custom/src/routes/admin/library-management/(list)/+layout.svelte"
rg -n "max-w-6xl|mb-4 flex items-end justify-between gap-4|<div class=\"overflow-x-auto\">" "custom/src/routes/(user)/dashboard/+page.svelte"
```

- [ ] **Step 2: Run it, expect FAIL** — run the Step 5 grep commands now; each "expect" hit in Step 5 is absent (no `md:hidden` secondary lines, no `pg-dashboard-heatmap`, no `break-all` in feature-updates).

- [ ] **Step 3: Implement**

**3.1 `custom/src/routes/admin/users/(list)/+layout.svelte`** — replace:

```ts
  const classes = {
    column1: 'w-8/12 md:w-5/12 lg:w-4/12',
    column2: 'hidden md:block md:w-5/12 lg:w-4/12',
    column3: 'hidden lg:block lg:w-2/12',
    column4: 'w-4/12 md:w-2/12 flex justify-end',
  };
```

with:

```ts
  // Từ md hiện đủ email + quota; dưới md email nằm ở dòng phụ dưới tên
  const classes = {
    column1: 'w-8/12 md:w-4/12',
    column2: 'hidden md:block md:w-4/12 break-all',
    column3: 'hidden md:block md:w-2/12',
    column4: 'w-4/12 md:w-2/12 flex justify-end',
  };
```

and replace:

```svelte
            <TableCell class={classes.column1}>
              <Link href={Route.viewUser(user)}>{user.name}</Link>
            </TableCell>
```

with:

```svelte
            <TableCell class={classes.column1}>
              <div class="min-w-0">
                <Link href={Route.viewUser(user)}>{user.name}</Link>
                <span class="block text-xs break-all text-(--md-sys-color-on-surface-variant) md:hidden">
                  {user.email}
                </span>
              </div>
            </TableCell>
```

**3.2 `custom/src/routes/admin/library-management/(list)/+layout.svelte`** — replace:

```ts
    column1: 'w-7/12 md:w-4/12',
    column2: 'hidden md:block md:w-3/12',
    column3: 'hidden lg:block lg:w-1/12',
    column4: 'hidden lg:block lg:w-1/12',
    column5: 'hidden md:block md:w-2/12',
    column6: 'w-5/12 md:w-1/12 flex justify-end',
```

with:

```ts
    column1: 'w-7/12 md:w-3/12 lg:w-4/12',
    column2: 'hidden md:block md:w-3/12',
    column3: 'hidden md:block md:w-1/12',
    column4: 'hidden md:block md:w-1/12',
    column5: 'hidden md:block md:w-2/12',
    column6: 'w-5/12 md:w-2/12 lg:w-1/12 flex justify-end',
```

(md: 3+3+1+1+2+2 = 12; lg: 4+3+1+1+2+1 = 12.) Then replace:

```svelte
                <TableCell class={classes.column1}>
                  <Link href={Route.viewLibrary(library)}>{library.name}</Link>
                </TableCell>
```

with:

```svelte
                <TableCell class={classes.column1}>
                  <div class="min-w-0">
                    <Link href={Route.viewLibrary(library)}>{library.name}</Link>
                    <!-- Dưới md các cột chủ sở hữu / dung lượng bị ẩn: hiện ở dòng phụ -->
                    <span class="block text-xs break-all text-(--md-sys-color-on-surface-variant) md:hidden">
                      {owner.name}
                      {#await data.statisticsPromise}{:then loadedStats}
                        {@const stats = loadedStats[library.id]}
                        {#if stats}
                          {@const [diskUsage, diskUsageUnit] = getBytesWithUnit(stats.usage, 0)}
                          · {diskUsage} {diskUsageUnit}
                        {/if}
                      {/await}
                    </span>
                  </div>
                </TableCell>
```

**3.3 `custom/src/routes/(user)/dashboard/+page.svelte`** — script: replace:

```ts
  const formatSessionTime = (iso: string) => formatDateTime(new Date(iso), 'vi-VN');
</script>
```

with:

```ts
  const formatSessionTime = (iso: string) => formatDateTime(new Date(iso), 'vi-VN');

  /** Heatmap rộng hơn khung trên điện thoại: cuộn sẵn tới các tuần mới nhất (cuối lưới) */
  const scrollHeatmapToLatest = (node: HTMLElement) => {
    const scroller = node.querySelector<HTMLElement>('.overflow-x-auto');
    if (scroller) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  };
</script>
```

Width: replace:

```svelte
  <div class="mx-auto max-w-6xl px-2 pb-8 md:px-4">
```

with:

```svelte
  <div class="mx-auto max-w-6xl px-2 pb-8 md:px-4 2xl:max-w-7xl">
```

Storage header: replace:

```svelte
        <div class="mb-4 flex items-end justify-between gap-4">
```

with:

```svelte
        <div class="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
```

Devices header: replace:

```svelte
        <div class="mb-2 flex items-center justify-between gap-4">
```

with:

```svelte
        <div class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
```

Heatmap: replace:

```svelte
          <div class="overflow-x-auto">
            <CalendarHeatmap
```

with:

```svelte
          <div class="pg-dashboard-heatmap" use:scrollHeatmapToLatest>
            <CalendarHeatmap
```

Append at the end of the file:

```svelte

<style>
  /* CalendarHeatmap (upstream) co 53 cột vừa khung → ô ~5px trên điện thoại; ép bề rộng tối thiểu để khung overflow-x-auto bên trong cuộn ngang */
  .pg-dashboard-heatmap :global(.grid-flow-col) {
    min-width: 48rem;
  }
</style>
```

(`CalendarHeatmap.svelte` is upstream-only, not overridden; its own `<div class="overflow-x-auto pb-1">` (line 58) wraps the single `grid grid-flow-col` (line 59), so the page no longer needs its own `overflow-x-auto`.)

**3.4 `custom/src/routes/admin/feature-updates/+page.svelte`** — replace:

```svelte
              <li class="rounded-lg bg-(--md-sys-color-surface-container) px-3 py-2">{email}</li>
```

with:

```svelte
              <li class="rounded-lg bg-(--md-sys-color-surface-container) px-3 py-2 break-all">{email}</li>
```

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```

Expected:

```
 M "custom/src/routes/(user)/dashboard/+page.svelte"
 M custom/src/routes/admin/feature-updates/+page.svelte
 M "custom/src/routes/admin/library-management/(list)/+layout.svelte"
 M "custom/src/routes/admin/users/(list)/+layout.svelte"
 M "upstream/web/src/routes/(user)/dashboard/+page.svelte"
 M upstream/web/src/routes/admin/feature-updates/+page.svelte
 M "upstream/web/src/routes/admin/library-management/(list)/+layout.svelte"
 M "upstream/web/src/routes/admin/users/(list)/+layout.svelte"
```

- [ ] **Step 5: Verify**

```bash
rg -n "md:hidden" "custom/src/routes/admin/users/(list)/+layout.svelte" "custom/src/routes/admin/library-management/(list)/+layout.svelte"
rg -n "hidden lg:block" "custom/src/routes/admin/users/(list)/+layout.svelte" "custom/src/routes/admin/library-management/(list)/+layout.svelte"
rg -n "pg-dashboard-heatmap|2xl:max-w-7xl|flex-wrap items-(end|center) justify-between" "custom/src/routes/(user)/dashboard/+page.svelte"
rg -n "break-all" custom/src/routes/admin/feature-updates/+page.svelte
```
Expect: one `md:hidden` per layout; no `hidden lg:block` left; dashboard shows `pg-dashboard-heatmap` (markup + style), `2xl:max-w-7xl`, two `flex-wrap` headers; one `break-all` in feature-updates.

```bash
pnpm --filter immich-web exec svelte-check 2>&1 | tail -3
pnpm --filter immich-web exec eslint --max-warnings 0 "src/routes/admin/users/(list)/+layout.svelte" "src/routes/admin/library-management/(list)/+layout.svelte" "src/routes/(user)/dashboard/+page.svelte" src/routes/admin/feature-updates/+page.svelte
```
Expect `30 errors and 1 warning`, eslint clean. Manual `[Inference]`: 360px wide → user rows show email under the name; library rows show "owner · size"; dashboard heatmap scrolls horizontally with ~12px cells and starts at the latest week.

- [ ] **Step 6: Commit**

```bash
git add "custom/src/routes/admin/users/(list)/+layout.svelte" "upstream/web/src/routes/admin/users/(list)/+layout.svelte" "custom/src/routes/admin/library-management/(list)/+layout.svelte" "upstream/web/src/routes/admin/library-management/(list)/+layout.svelte" "custom/src/routes/(user)/dashboard/+page.svelte" "upstream/web/src/routes/(user)/dashboard/+page.svelte" custom/src/routes/admin/feature-updates/+page.svelte upstream/web/src/routes/admin/feature-updates/+page.svelte
git commit -F - <<'EOF'
fix(admin): bảng user/thư viện và dashboard đọc được trên điện thoại, tablet

- Users: dòng email dưới tên khi < md, quota hiện từ md, email dài xuống dòng
- Thư viện: dòng "chủ sở hữu · dung lượng" khi < md, số ảnh/video hiện từ md
- Dashboard: heatmap rộng tối thiểu 48rem để cuộn ngang và cuộn sẵn tới tuần mới nhất; header xuống dòng; 2xl rộng tới max-w-7xl
- Feature updates: email người đăng ký dài xuống dòng

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11 (nhóm 6-c): Tablet / wide — albums, explore, shared-favorites columns

**Findings covered:**
- C: Albums expand/collapse-all controls only exist at `xl` (`AlbumsControls.svelte`, `<div class="hidden gap-0 xl:flex">`)
- C: Album list name cell: `text-ellipsis` has no effect (`AlbumsTableRow.svelte:44`; audit line numbers were stale) — the 105%-width part is dropped
- C: Explore "recently added" strip: fixed height, images without dimensions (CLS, no lazy, ragged)
- C: Explore: person names `text-ellipsis` without `truncate`; "view all" links ~20px targets
- C: Shared-favorites: wide-screen columns stop at 6 (`xl:grid-cols-6`) — the "wide-screen columns" part

**Files:**
- Modify: `custom/src/routes/(user)/albums/AlbumsControls.svelte` (expand/collapse from `md`)
- Modify: `custom/src/routes/(user)/albums/+page.svelte` (expand/collapse in the `xl:hidden` block below `md`)
- Modify: `overrides/lib/components/album-page/AlbumsTableRow.svelte` (`truncate` on the name cell)
- Modify: `custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte` (recents via `SingleGridRow`, square lazy images; `truncate`; 44px "view all")
- Modify: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte` (`2xl:grid-cols-8`)
- Test: none (see Step 1)

**Interfaces:**
- Consumes: `pg-touch-target` (Task 3)
- Produces: none

- [ ] **Step 1: Write the failing test** — not jsdom-testable: all changes are breakpoint visibility (`md:flex`, `md:hidden`), CSS truncation/grid columns, or `SingleGridRow` item counts that depend on layout (`getBoundingClientRect` is 0 in happy-dom). These route pages have no spec harness. Verification is grep (Step 5). Pre-change baseline:

```bash
rg -n "hidden gap-0 xl:flex" "custom/src/routes/(user)/albums/AlbumsControls.svelte"
rg -n "flex h-24 max-w-fit|min-w-max|text-ellipsis dark:text-white" "custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte"
rg -n "xl:grid-cols-6'" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
```
Each prints one hit (explore: three).

- [ ] **Step 2: Run it, expect FAIL** — run the Step 5 grep commands now; the expected hits are absent.

- [ ] **Step 3: Implement**

**3.1 `custom/src/routes/(user)/albums/AlbumsControls.svelte`** — replace:

```svelte
    <div class="hidden gap-0 xl:flex">
```

with:

```svelte
    <div class="hidden gap-0 md:flex">
```

**3.2 `custom/src/routes/(user)/albums/+page.svelte`** — imports: replace:

```ts
  import { AlbumFilter, albumViewSettings } from '$lib/stores/preferences.store';
  import { createAlbumAndRedirect } from '$lib/utils/album-utils';
  import { t } from 'svelte-i18n';
```

with:

```ts
  import { AlbumFilter, AlbumGroupBy, albumViewSettings } from '$lib/stores/preferences.store';
  import {
    collapseAllAlbumGroups,
    createAlbumAndRedirect,
    expandAllAlbumGroups,
    getSelectedAlbumGroupOption,
  } from '$lib/utils/album-utils';
  import { IconButton } from '@immich/ui';
  import { mdiUnfoldLessHorizontal, mdiUnfoldMoreHorizontal } from '@mdi/js';
  import { t } from 'svelte-i18n';
```

Markup: replace:

```svelte
    <div class="w-60">
      <SearchBar placeholder={$t('search_albums')} bind:name={searchQuery} showLoadingSpinner={false} />
    </div>
  </div>
```

with:

```svelte
    <div class="flex items-center gap-2">
      <div class="w-60 min-w-0">
        <SearchBar placeholder={$t('search_albums')} bind:name={searchQuery} showLoadingSpinner={false} />
      </div>
      <!-- Mở/thu gọn tất cả nhóm: dưới md thanh công cụ không đủ chỗ, đặt cạnh ô tìm kiếm -->
      {#if getSelectedAlbumGroupOption($albumViewSettings) !== AlbumGroupBy.None}
        <div class="flex gap-0 md:hidden">
          <IconButton
            title={$t('expand_all')}
            onclick={() => expandAllAlbumGroups()}
            variant="ghost"
            color="secondary"
            shape="round"
            icon={mdiUnfoldMoreHorizontal}
            aria-label={$t('expand_all')}
          />
          <IconButton
            title={$t('collapse_all')}
            onclick={() => collapseAllAlbumGroups(albumGroups)}
            variant="ghost"
            color="secondary"
            shape="round"
            icon={mdiUnfoldLessHorizontal}
            aria-label={$t('collapse_all')}
          />
        </div>
      {/if}
    </div>
  </div>
```

(md..xl: toolbar shows them; <md: this row; ≥xl: toolbar. No duplication.)

**3.3 `overrides/lib/components/album-page/AlbumsTableRow.svelte`** — replace:

```svelte
  <td class="text-md w-8/12 items-center text-start text-ellipsis sm:w-4/12 md:w-4/12 xl:w-[30%] 2xl:w-[40%]">
```

with:

```svelte
  <td class="text-md w-8/12 items-center truncate text-start sm:w-4/12 md:w-4/12 xl:w-[30%] 2xl:w-[40%]">
```

**3.4 `custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte`**

"View all" links — this exact class string appears three times; use replace-all:

```svelte
          class="pe-4 text-sm font-medium hover:text-immich-primary dark:text-immich-dark-fg dark:hover:text-immich-dark-primary"
```

→

```svelte
          class="pg-touch-target relative pe-4 text-sm font-medium hover:text-immich-primary dark:text-immich-dark-fg dark:hover:text-immich-dark-primary"
```

Person name — replace:

```svelte
              <p class="mt-2 text-sm font-medium text-ellipsis dark:text-white">{person.name}</p>
```

with:

```svelte
              <p class="mt-2 truncate text-sm font-medium dark:text-white">{person.name}</p>
```

Recents strip — replace:

```svelte
      <div class="flex h-24 max-w-fit flex-wrap gap-x-1 overflow-hidden md:h-42">
        {#each recents as item (item.data.id)}
          <button
            type="button"
            class="relative h-full flex-auto"
            onclick={() => handlePromiseError(onViewAsset(item.data.id))}
            draggable="false"
          >
            <img
              src={getAssetMediaUrl({ id: item.data.id, size: AssetMediaSize.Thumbnail })}
              alt={$getAltText(toTimelineAsset(item.data))}
              class="size-full min-w-max rounded-xl object-cover"
            />
          </button>
        {/each}
      </div>
```

with:

```svelte
      <!-- Một hàng ô vuông lấp đủ bề rộng (như People/Places): không reflow khi ảnh tải, không lệch mép phải -->
      <SingleGridRow class="grid grid-flow-col grid-auto-fill-24 gap-x-1 md:grid-auto-fill-42">
        {#snippet children({ itemCount })}
          {#each recents.slice(0, itemCount) as item (item.data.id)}
            <button
              type="button"
              class="relative aspect-square overflow-hidden rounded-xl"
              onclick={() => handlePromiseError(onViewAsset(item.data.id))}
              draggable="false"
            >
              <img
                src={getAssetMediaUrl({ id: item.data.id, size: AssetMediaSize.Thumbnail })}
                alt={$getAltText(toTimelineAsset(item.data))}
                width="250"
                height="250"
                loading="lazy"
                decoding="async"
                class="size-full object-cover"
              />
            </button>
          {/each}
        {/snippet}
      </SingleGridRow>
```

(`SingleGridRow` is already imported in this page and used for People/Places. Design change to note in review: recents become square crops instead of variable-width tiles.)

**3.5 `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte`** — replace:

```svelte
      class="pg-photo-grid grid gap-2 {isMobileGrid ? '' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'}"
```

with:

```svelte
      class="pg-photo-grid grid gap-2 {isMobileGrid ? '' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8'}"
```

(The touch/narrow path uses `gridDensityManager.columns`, already width-aware after Task 6-a.)

- [ ] **Step 4: Regenerate copies**

```bash
bash scripts/prepare-custom.sh
git status --short
```

Expected:

```
 M "custom/src/routes/(user)/albums/+page.svelte"
 M "custom/src/routes/(user)/albums/AlbumsControls.svelte"
 M "custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M overrides/lib/components/album-page/AlbumsTableRow.svelte
 M "upstream/web/src/routes/(user)/albums/+page.svelte"
 M "upstream/web/src/routes/(user)/albums/AlbumsControls.svelte"
 M "upstream/web/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
 M upstream/web/src/lib/components/album-page/AlbumsTableRow.svelte
```

- [ ] **Step 5: Verify**

```bash
rg -n "hidden gap-0 md:flex" "custom/src/routes/(user)/albums/AlbumsControls.svelte"
rg -n "md:hidden|expandAllAlbumGroups|collapseAllAlbumGroups" "custom/src/routes/(user)/albums/+page.svelte"
rg -n "items-center truncate text-start" overrides/lib/components/album-page/AlbumsTableRow.svelte
rg -c "pg-touch-target relative pe-4" "custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte"
rg -n "loading=\"lazy\"|grid-auto-fill-24|min-w-max|max-w-fit" "custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte"
rg -n "2xl:grid-cols-8" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
```
Expect: 1 hit; `md:hidden` + import + usage lines; 1 hit; count `3`; `loading="lazy"` and `grid-auto-fill-24` hits, no `min-w-max`/`max-w-fit`; 1 hit.

```bash
pnpm --filter immich-web exec svelte-check 2>&1 | tail -3
pnpm --filter immich-web exec eslint --max-warnings 0 "src/routes/(user)/albums/+page.svelte" "src/routes/(user)/albums/AlbumsControls.svelte" src/lib/components/album-page/AlbumsTableRow.svelte "src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte" "src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
```
Expect `30 errors and 1 warning`, eslint clean.

- [ ] **Step 6: Commit**

```bash
git add "custom/src/routes/(user)/albums/+page.svelte" "custom/src/routes/(user)/albums/AlbumsControls.svelte" "upstream/web/src/routes/(user)/albums/+page.svelte" "upstream/web/src/routes/(user)/albums/AlbumsControls.svelte" overrides/lib/components/album-page/AlbumsTableRow.svelte upstream/web/src/lib/components/album-page/AlbumsTableRow.svelte "custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte" "upstream/web/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte" "custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "upstream/web/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
git commit -F - <<'EOF'
fix(layout): albums, explore, shared-favorites trên tablet và màn rộng

- Albums: nút mở/thu gọn tất cả nhóm có từ md trên thanh công cụ, dưới md đặt cạnh ô tìm kiếm; tên album dài cắt bằng truncate
- Explore: hàng "mới thêm" dùng SingleGridRow ô vuông, ảnh lazy có width/height (hết CLS, hết lệch mép); tên người truncate; link "xem tất cả" vùng chạm 44px
- Shared-favorites: 2xl thêm 8 cột

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12 (nhóm 7-a): Focus ring, input focus and dashboard tone contrast

**Findings covered:**
- D: Focus ring fails 3:1 non-text contrast (40% alpha primary)
- D: Input focus indicator in search modal is only a 24% outline + 1px border colour change (also covers the same 24% rule on `.immich-form-input` in `components.css`)
- C: Dashboard stat icons/status pill use `-400` palette tones that fail contrast on light theme

**Files:**
- Modify: `branding/src/m3/tokens.css` (solid `--md-state-focus-ring` in the light and dark blocks)
- Modify: `branding/src/m3/search-filter.css` (modal input focus: solid outline, `:focus-visible` selectors)
- Modify: `branding/src/m3/components.css` (`.immich-form-input` focus: solid outline)
- Modify: `custom/src/routes/(user)/dashboard/+page.svelte` (tone classes `-700` on light, `dark:-400` on dark)
- Copy (regenerated): `upstream/web/src/routes/(user)/dashboard/+page.svelte`

**Interfaces:**
- Consumes: none
- Produces: `--md-state-focus-ring` becomes a solid colour (`var(--md-sys-color-primary)`). It is also consumed by `branding/src/m3/media-chrome.css:9` and `overrides/lib/components/asset-viewer/VideoNativeViewer.svelte:872` (`--media-focus-box-shadow`), so the video controls get the solid ring too. Later tasks can use `outline: 2px solid var(--md-state-focus-ring)` for custom focus styles.

**Contrast of the new focus ring.** Ring = `2px solid var(--md-sys-color-primary)` with `outline-offset: 2px`, so it is drawn on the surface around the control. Ratios use WCAG 2.x relative luminance, computed from the hex values in `branding/src/m3/tokens.css` by `scratchpad/contrast.py`. Old values composite 40 % primary over the surface. Which surface a given control actually sits on is `[Inference]`.

| Surface (token) | Light bg | Light new (#6750a4) | Light old 40% | Dark bg | Dark new (#d0bcff) | Dark old 40% |
|---|---|---|---|---|---|---|
| surface | #fef7ff | **6.12** | 1.84 | #141218 | **10.91** | 2.72 |
| surface-container-lowest | #ffffff | **6.44** | 1.87 | #0f0d13 | **11.33** | 2.70 |
| surface-container-low (`--pg-surface-raised` light) | #f7f2fa | **5.84** | 1.82 | #1d1b20 | **10.02** | 2.70 |
| surface-container (sidebar, EmptyPlaceholder) | #f3edf7 | **5.60** | 1.80 | #211f26 | **9.56** | 2.70 |
| surface-container-high (modal sections, `--pg-surface-raised` dark) | #ece6f0 | **5.26** | 1.77 | #2b2930 | **8.42** | 2.60 |
| surface-container-highest (input fill) | #e6e0e9 | **4.97** | 1.75 | #36343b | **7.20** | 2.43 |
| primary-container (selected tiles) | #eaddff | **5.00** | 1.73 | #4f378b | **5.47** | 2.14 |
| secondary-container (selected nav) | #e8def8 | **4.98** | 1.75 | #4a4458 | **5.45** | 2.16 |
| video scrim / black (media-chrome) | #000000 | **3.26** | 1.38 | #000000 | **12.32** | 2.57 |

Every pair is now ≥ 3:1 (WCAG 1.4.11 / 2.4.11). The lowest is light primary on black (3.26:1), which is the video controls in light theme; it passes, but only just. Over arbitrary photo content in the viewer navbar the ratio cannot be guaranteed `[Inference]`.

The input focus indicator becomes 1px primary border + 2px solid primary outline at offset 0. Against the modal section (container-high) that is 5.26:1 light / 8.42:1 dark. Against a page surface it is 6.12 / 10.91.

**Dashboard tones** use Tailwind v4 oklch from `upstream/web/node_modules/tailwindcss/theme.css`, converted to sRGB. Each tone background is `X-500` at 10 % (5 % for the info card), composited over `--pg-surface-raised` (cards) or `surface` (pill, info card) `[Inference: assumed backdrop]`:

| Element | Light bg | Light old `-400` | Light new `-700` | Dark (keeps `-400`) |
|---|---|---|---|---|
| Card icon sky / violet / amber / emerald (needs 3:1) | #deeaf9 / #ece2fa / #f8e9e1 / #deedee | 1.79 / 2.28 / 1.45 / 1.61 | **4.81 / 5.85 / 4.25 / 4.46** | 5.68 / 4.57 / 6.99 / 6.34 |
| Status pill text 14px emerald / red (needs 4.5:1) | #e5f1f2 / #fee3eb | 1.68 / 2.39 | **4.65 / 5.32** | 8.40 / 5.93 |
| Info icon amber (needs 3:1) | #fef2f2 | 1.57 | **4.60** | 10.05 |

- [ ] **Step 1: Write the failing test.** All of this is CSS or class strings, which jsdom cannot measure, so these checks stand in for a test:
  ```bash
  grep -n "md-state-focus-ring:" branding/src/m3/tokens.css
  grep -n "24%, transparent" branding/src/m3/components.css branding/src/m3/search-filter.css
  grep -n "input:focus-within\|textarea:focus,$" branding/src/m3/search-filter.css
  grep -nE "(^|[ '\"])text-(sky|violet|amber|emerald|red)-400" "custom/src/routes/(user)/dashboard/+page.svelte"
  ```
- [ ] **Step 2: Run it, expect FAIL.** Before the change:
  - line 1 prints 2 lines containing `color-mix(in srgb, var(--md-sys-color-primary) 40%, transparent)`;
  - line 2 prints 2 lines (`components.css` and `search-filter.css`);
  - line 3 prints 2 lines;
  - line 4 prints 7 lines (4 tone entries, emerald and red pill, amber info icon).
- [ ] **Step 3: Implement.**

  `branding/src/m3/tokens.css`. The line occurs twice (light block and dark block); replace both (Edit with `replace_all: true`):
  ```css
      --md-state-focus-ring: color-mix(in srgb, var(--md-sys-color-primary) 40%, transparent);
  ```
  →
  ```css
      /* Focus ring đặc để đạt ≥3:1 trên mọi surface; alpha chỉ dùng cho lớp hover/pressed */
      --md-state-focus-ring: var(--md-sys-color-primary);
  ```

  `branding/src/m3/search-filter.css`:
  ```css
    .ant-search-filter-modal__section input:focus-within,
    .ant-search-filter-modal__section textarea:focus,
    .ant-search-filter-modal__section [class*='Input']:focus-within {
      border-color: var(--md-sys-color-primary) !important;
      outline: 2px solid color-mix(in srgb, var(--md-sys-color-primary) 24%, transparent) !important;
      outline-offset: 0 !important;
    }
  ```
  →
  ```css
    .ant-search-filter-modal__section input:focus-visible,
    .ant-search-filter-modal__section textarea:focus-visible,
    .ant-search-filter-modal__section [class*='Input']:focus-within {
      border-color: var(--md-sys-color-primary) !important;
      outline: 2px solid var(--md-state-focus-ring) !important;
      outline-offset: 0 !important;
    }
  ```

  `branding/src/m3/components.css`. This is inside the `.immich-form-input:focus-within, …` rule and is the only occurrence:
  ```css
      outline: 2px solid color-mix(in srgb, var(--md-sys-color-primary) 24%, transparent) !important;
  ```
  →
  ```css
      outline: 2px solid var(--md-state-focus-ring) !important;
  ```

  `custom/src/routes/(user)/dashboard/+page.svelte`:
  ```ts
      sky: 'bg-sky-500/10 text-sky-400',
      violet: 'bg-violet-500/10 text-violet-400',
      amber: 'bg-amber-500/10 text-amber-400',
      emerald: 'bg-emerald-500/10 text-emerald-400',
  ```
  →
  ```ts
      sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
      violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
      amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ```
  ```svelte
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'}"
  ```
  →
  ```svelte
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'}"
  ```
  ```svelte
            <Icon icon={mdiInformationOutline} size="22" class="mt-0.5 shrink-0 text-amber-400" />
  ```
  →
  ```svelte
            <Icon icon={mdiInformationOutline} size="22" class="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
  ```
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected:
  ```
   M branding/src/m3/components.css
   M branding/src/m3/search-filter.css
   M branding/src/m3/tokens.css
   M "custom/src/routes/(user)/dashboard/+page.svelte"
   M "upstream/web/src/routes/(user)/dashboard/+page.svelte"
  ```
  The branding changes appear only under `upstream/web/static/branding/`, which is ignored.
- [ ] **Step 5: Verify.**
  - Re-run the Step 1 greps. Expected: line 1 prints 2 lines `--md-state-focus-ring: var(--md-sys-color-primary);`; lines 2, 3 and 4 print nothing.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 "src/routes/(user)/dashboard/+page.svelte"`
  - Manual check `[Unverified until run]`: Tab through the sidebar, a modal and the search filter modal in light and dark theme. The ring should be a solid primary outline.
- [ ] **Step 6: Commit.**
  ```bash
  git add branding/src/m3/tokens.css branding/src/m3/search-filter.css branding/src/m3/components.css \
    "custom/src/routes/(user)/dashboard/+page.svelte" "upstream/web/src/routes/(user)/dashboard/+page.svelte"
  git commit -m "$(cat <<'EOF'
  fix(a11y): nâng tương phản focus ring, focus input và màu trạng thái dashboard

  - --md-state-focus-ring dùng màu primary đặc (6.12:1 sáng / 10.91:1 tối trên surface) thay cho 40% alpha (~1.8:1 / 2.7:1)
  - Focus input trong modal lọc và .immich-form-input: outline 2px đặc; selector input:focus-within -> input:focus-visible
  - Dashboard: icon/pill dùng tông -700 trên nền sáng, giữ -400 cho dark

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 13 (nhóm 7-b): Album list keyboard/touch access, albums toolbar names, ServerAbout ids, person tiles

**Findings covered:**
- C: Album table row: not keyboard operable, context menu unreachable on iOS touch
- C (Low, partial): Album list name cell: `text-ellipsis` has no effect. The name cell gets `truncate` because it is rebuilt here. The 105 % column widths at `xl` are not touched.
- C: Albums toolbar buttons have no accessible name below `md`
- D: Duplicate `id="version-history"` and `<Label for>` pointing to a `<ul>`
- D: Person tiles are toggle buttons without state (`aria-pressed`, duplicate name via img alt)

**Files:**
- Modify: `overrides/lib/components/album-page/AlbumsTableRow.svelte` (name becomes `<a href>`, visible options `IconButton`)
- Create: `overrides/lib/components/album-page/AlbumsTableRow.spec.ts`
- Modify: `custom/src/routes/(user)/albums/AlbumsControls.svelte` (`hidden md:block` → `max-md:sr-only` span, drop `Text` import)
- Modify: `overrides/lib/modals/ServerAboutModal.svelte` (heading + `aria-labelledby`, remove duplicate id, drop `Label` import)
- Create: `overrides/lib/modals/ServerAboutModal.spec.ts`
- Modify: `overrides/lib/components/shared-components/search-bar/SearchPeopleSection.svelte` (`aria-pressed`, `altText=""`)
- Create: `overrides/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts`
- Copies (regenerated): the six matching paths under `upstream/web/src/lib/…` and `upstream/web/src/routes/(user)/albums/AlbumsControls.svelte`

**Interfaces:**
- Consumes: the Task 7-a focus ring. The new `<a>` and `IconButton` rely on `states.css` `a:focus-visible` / `button:focus-visible`.
- Produces: none. No new i18n keys: `show_album_options`, `create_album`, `covers`, `list` and `version_history` already exist in en and vi.

- [ ] **Step 1: Write the failing test.**

  `overrides/lib/components/album-page/AlbumsTableRow.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import userEvent from '@testing-library/user-event';
  import { goto } from '$app/navigation';
  import { albumFactory } from '@test-data/factories/album-factory';
  import type { AlbumResponseDto } from '@immich/sdk';
  import { init, register, waitLocale } from 'svelte-i18n';
  import AlbumsTableRow from './AlbumsTableRow.svelte';

  vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

  const renderRow = (album: AlbumResponseDto, onShowContextMenu = vi.fn()) => {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.append(tbody);
    document.body.append(table);
    render(AlbumsTableRow, { target: tbody, props: { album, onShowContextMenu } });
    return onShowContextMenu;
  };

  describe('AlbumsTableRow', () => {
    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    afterEach(() => {
      vi.mocked(goto).mockClear();
      document.body.innerHTML = '';
    });

    it('exposes the album name as a focusable link to the album', () => {
      const album = albumFactory.build({ shared: false });
      renderRow(album);

      const link = screen.getByRole('link', { name: album.albumName });
      expect(link).toHaveAttribute('href', `/albums/${album.id}`);
    });

    it('opens the context menu from a visible options button without navigating', async () => {
      const user = userEvent.setup();
      const album = albumFactory.build({ shared: false });
      const onShowContextMenu = renderRow(album);

      await user.click(screen.getByRole('button', { name: 'Show album options' }));

      expect(onShowContextMenu).toHaveBeenCalledWith(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        album,
      );
      expect(goto).not.toHaveBeenCalled();
    });
  });
  ```

  `overrides/lib/modals/ServerAboutModal.spec.ts`:
  ```ts
  import { render, screen, waitFor } from '@testing-library/svelte';
  import type { ServerAboutResponseDto, ServerVersionHistoryResponseDto } from '@immich/sdk';
  import { init, register, waitLocale } from 'svelte-i18n';
  import { getAnimateMock } from '$lib/__mocks__/animate.mock';
  import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
  import ServerAboutModal from './ServerAboutModal.svelte';

  const info = {
    version: 'v2.0.0',
    versionUrl: 'https://example.com/release',
    licensed: false,
    nodejs: 'v22.0.0',
    exiftool: '13.0',
    libvips: '8.16',
    imagemagick: '7.1',
    ffmpeg: '7.1',
  } as ServerAboutResponseDto;

  const versions = [
    { id: 'v2', createdAt: '2026-01-02T00:00:00.000Z', version: 'v2.0.0' },
    { id: 'v1', createdAt: '2025-12-01T00:00:00.000Z', version: 'v1.9.0' },
  ] as ServerVersionHistoryResponseDto[];

  describe('ServerAboutModal', () => {
    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    beforeEach(() => {
      vi.stubGlobal('visualViewport', getVisualViewportMock());
      Element.prototype.animate = getAnimateMock();
    });

    afterAll(async () => {
      await waitFor(() => {
        expect(document.body.style.pointerEvents).not.toBe('none');
      });
    });

    it('names the version history list and keeps ids unique', async () => {
      render(ServerAboutModal, { props: { onClose: vi.fn(), info, versions } });

      const list = await screen.findByRole('list', { name: 'Version History' });
      expect(list.querySelectorAll('li')).toHaveLength(2);
      expect(document.querySelectorAll('#version-history')).toHaveLength(0);
      expect(document.querySelectorAll('#version-history-label')).toHaveLength(1);
    });
  });
  ```

  `overrides/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import userEvent from '@testing-library/user-event';
  import { initAppConfig } from '@photo-gallery/config';
  import { personFactory } from '@test-data/factories/person-factory';
  import { init, register, waitLocale } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import { getResizeObserverMock } from '$lib/__mocks__/resize-observer.mock';
  import { sdkMock } from '$lib/__mocks__/sdk.mock';
  import SearchPeopleSection from './SearchPeopleSection.svelte';

  describe('SearchPeopleSection', () => {
    beforeAll(async () => {
      initAppConfig({});
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    beforeEach(() => {
      vi.stubGlobal('ResizeObserver', getResizeObserverMock());
    });

    it('exposes the selected state of a person tile', async () => {
      const user = userEvent.setup();
      const person = personFactory.build({ name: 'Ada Lovelace' });
      sdkMock.getAllPeople.mockResolvedValue({ people: [person], total: 1, hidden: 0 });

      render(SearchPeopleSection, { props: { selectedPeople: new SvelteSet<string>() } });

      const tile = await screen.findByRole('button', { name: 'Ada Lovelace' });
      expect(tile).toHaveAttribute('aria-pressed', 'false');

      await user.click(tile);
      expect(tile).toHaveAttribute('aria-pressed', 'true');
    });
  });
  ```
- [ ] **Step 2: Run it, expect FAIL.**
  ```bash
  bash scripts/prepare-custom.sh
  pnpm --filter immich-web exec vitest run src/lib/components/album-page/AlbumsTableRow.spec.ts src/lib/modals/ServerAboutModal.spec.ts src/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts
  ```
  Expected failures:
  - AlbumsTableRow: `Unable to find an accessible element with the role "link"`, and `… role "button" and name "Show album options"`.
  - ServerAboutModal: `Unable to find an accessible element with the role "list" and name "Version History"`.
  - SearchPeopleSection: `Expected the element to have attribute: aria-pressed="false"`.
- [ ] **Step 3: Implement.**

  `overrides/lib/components/album-page/AlbumsTableRow.svelte`. Imports:
  ```ts
    import type { ContextMenuPosition } from '$lib/utils/context-menu';
  ```
  →
  ```ts
    import { getContextMenuPositionFromEvent, type ContextMenuPosition } from '$lib/utils/context-menu';
  ```
  ```ts
    import { Icon } from '@immich/ui';
    import { mdiShareVariantOutline } from '@mdi/js';
  ```
  →
  ```ts
    import { Icon, IconButton } from '@immich/ui';
    import { mdiDotsVertical, mdiShareVariantOutline } from '@mdi/js';
  ```
  After the existing `oncontextmenu` function (before `</script>`):
  ```ts
    const oncontextmenu = (event: MouseEvent) => {
      event.preventDefault();
      showContextMenu({ x: event.x, y: event.y });
    };
  </script>
  ```
  →
  ```ts
    const oncontextmenu = (event: MouseEvent) => {
      event.preventDefault();
      showContextMenu({ x: event.x, y: event.y });
    };

    // iOS không bắn contextmenu khi nhấn giữ và bàn phím không tới được <tr> — cần nút tùy chọn hiển thị sẵn
    const onOptionsClick = (event: MouseEvent) => {
      event.stopPropagation();
      showContextMenu(getContextMenuPositionFromEvent(event));
    };
  </script>
  ```
  First cell:
  ```svelte
    <td class="text-md w-8/12 items-center text-start text-ellipsis sm:w-4/12 md:w-4/12 xl:w-[30%] 2xl:w-[40%]">
      {album.albumName}
      {#if album.shared}
        <Icon
          icon={mdiShareVariantOutline}
          size="16"
          class="ms-1 inline opacity-70"
  ```
  →
  ```svelte
    <td class="text-md flex w-8/12 min-w-0 items-center gap-1 text-start sm:w-4/12 md:w-4/12 xl:w-[30%] 2xl:w-[40%]">
      <!-- Link thật: Tab/Enter mở album, trình đọc màn hình đọc được tên -->
      <a href={Route.viewAlbum(album)} class="min-w-0 truncate rounded-sm" onclick={(event) => event.stopPropagation()}>
        {album.albumName}
      </a>
      {#if album.shared}
        <Icon
          icon={mdiShareVariantOutline}
          size="16"
          class="shrink-0 opacity-70"
  ```
  Then close the shared-icon block and add the button. Replace:
  ```svelte
              })}
        />
      {/if}
    </td>
    <td class="text-md text-center text-ellipsis sm:w-2/12 md:w-2/12 xl:w-[15%] 2xl:w-[12%]">
  ```
  →
  ```svelte
              })}
        />
      {/if}
      {#if onShowContextMenu}
        <IconButton
          variant="ghost"
          shape="round"
          color="secondary"
          size="small"
          icon={mdiDotsVertical}
          aria-label={$t('show_album_options')}
          class="ms-auto shrink-0"
          onclick={onOptionsClick}
        />
      {/if}
    </td>
    <td class="text-md text-center text-ellipsis sm:w-2/12 md:w-2/12 xl:w-[15%] 2xl:w-[12%]">
  ```

  `custom/src/routes/(user)/albums/AlbumsControls.svelte`:
  ```ts
    import { Button, IconButton, Text } from '@immich/ui';
  ```
  → `  import { Button, IconButton } from '@immich/ui';`

  `    <p class="hidden md:block">{$t('create_album')}</p>` → `    <span class="max-md:sr-only">{$t('create_album')}</span>`

  `    <Text class="hidden md:block">{$t('covers')}</Text>` → `    <span class="max-md:sr-only">{$t('covers')}</span>`

  `    <Text class="hidden md:block">{$t('list')}</Text>` → `    <span class="max-md:sr-only">{$t('list')}</span>`

  `overrides/lib/modals/ServerAboutModal.svelte`:
  ```ts
    import { Alert, Label, Modal, ModalBody } from '@immich/ui';
  ```
  → `  import { Alert, Modal, ModalBody } from '@immich/ui';`
  ```svelte
          <Label size="small" color="primary" for="version-history">{$t('version_history')}</Label>
          <ul id="version-history" class="list-none">
  ```
  →
  ```svelte
          <h3 id="version-history-label" class="text-sm font-medium text-primary">{$t('version_history')}</h3>
          <ul aria-labelledby="version-history-label" class="list-none">
  ```
  ```svelte
                <span
                  class="pb-2 text-xs immich-form-label"
                  id="version-history"
                  title={formatDateTime(createdAt.toJSDate(), $locale)}
                >
  ```
  →
  ```svelte
                <span class="pb-2 text-xs immich-form-label" title={formatDateTime(createdAt.toJSDate(), $locale)}>
  ```

  `overrides/lib/components/shared-components/search-bar/SearchPeopleSection.svelte`:
  ```svelte
            <button
              type="button"
              class={styles({ selected: selectedPeople.has(person.id) })}
              onclick={() => togglePersonSelection(person.id)}
            >
              <ImageThumbnail circle shadow url={getPeopleThumbnailUrl(person)} altText={person.name} widthStyle="100%" />
  ```
  →
  ```svelte
            <button
              type="button"
              class={styles({ selected: selectedPeople.has(person.id) })}
              aria-pressed={selectedPeople.has(person.id)}
              onclick={() => togglePersonSelection(person.id)}
            >
              <!-- Tên đã hiển thị bên dưới — alt rỗng để không đọc hai lần -->
              <ImageThumbnail circle shadow url={getPeopleThumbnailUrl(person)} altText="" widthStyle="100%" />
  ```
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected changed or new paths:
  ```
   M custom/src/routes/(user)/albums/AlbumsControls.svelte
   M overrides/lib/components/album-page/AlbumsTableRow.svelte
   M overrides/lib/components/shared-components/search-bar/SearchPeopleSection.svelte
   M overrides/lib/modals/ServerAboutModal.svelte
   M upstream/web/src/lib/components/album-page/AlbumsTableRow.svelte
   M upstream/web/src/lib/components/shared-components/search-bar/SearchPeopleSection.svelte
   M upstream/web/src/lib/modals/ServerAboutModal.svelte
   M upstream/web/src/routes/(user)/albums/AlbumsControls.svelte
  ?? overrides/lib/components/album-page/AlbumsTableRow.spec.ts
  ?? overrides/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts
  ?? overrides/lib/modals/ServerAboutModal.spec.ts
  ?? upstream/web/src/lib/components/album-page/AlbumsTableRow.spec.ts
  ?? upstream/web/src/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts
  ?? upstream/web/src/lib/modals/ServerAboutModal.spec.ts
  ```
- [ ] **Step 5: Verify.**
  - Re-run the Step 2 vitest command. Expect all PASS.
  - `grep -n "hidden md:block" "custom/src/routes/(user)/albums/AlbumsControls.svelte"`: expect no output.
  - `grep -c "max-md:sr-only" "custom/src/routes/(user)/albums/AlbumsControls.svelte"`: expect `3`.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/album-page/AlbumsTableRow.svelte src/lib/components/album-page/AlbumsTableRow.spec.ts src/lib/modals/ServerAboutModal.svelte src/lib/modals/ServerAboutModal.spec.ts src/lib/components/shared-components/search-bar/SearchPeopleSection.svelte src/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts "src/routes/(user)/albums/AlbumsControls.svelte"`
- [ ] **Step 6: Commit.**
  ```bash
  git add overrides/lib/components/album-page/AlbumsTableRow.svelte overrides/lib/components/album-page/AlbumsTableRow.spec.ts \
    upstream/web/src/lib/components/album-page/AlbumsTableRow.svelte upstream/web/src/lib/components/album-page/AlbumsTableRow.spec.ts \
    "custom/src/routes/(user)/albums/AlbumsControls.svelte" "upstream/web/src/routes/(user)/albums/AlbumsControls.svelte" \
    overrides/lib/modals/ServerAboutModal.svelte overrides/lib/modals/ServerAboutModal.spec.ts \
    upstream/web/src/lib/modals/ServerAboutModal.svelte upstream/web/src/lib/modals/ServerAboutModal.spec.ts \
    overrides/lib/components/shared-components/search-bar/SearchPeopleSection.svelte overrides/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts \
    upstream/web/src/lib/components/shared-components/search-bar/SearchPeopleSection.svelte upstream/web/src/lib/components/shared-components/search-bar/SearchPeopleSection.spec.ts
  git commit -m "$(cat <<'EOF'
  fix(a11y): hàng album dùng được bằng bàn phím/cảm ứng, đặt tên nút toolbar và sửa id trùng

  - AlbumsTableRow: tên album là link thật, thêm nút tùy chọn hiển thị sẵn (iOS không có contextmenu)
  - AlbumsControls: chữ nút ẩn bằng sr-only dưới md thay vì display:none
  - ServerAboutModal: bỏ id version-history trùng, danh sách dùng aria-labelledby
  - SearchPeopleSection: aria-pressed cho ô người, alt rỗng để không đọc tên hai lần

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 14 (nhóm 7-c): Shell and custom-page semantics (favorites popup, language toggle, upload bubble, misc)

**Findings covered:**
- A: Favorites popup menu: `role="menu"` without arrow-key/focus handling
- A (Low, partial): Language toggle has `aria-label` that hides its state. The BrandLogo parts are under Dropped.
- C: Upload bubble buttons have no accessible names; badge sizing is broken (`size-10 p-5`)
- C (Low) Misc a11y / semantics:
  - MaintenancePage `role="alert" aria-live="polite"` conflict
  - OnboardingTheme buttons without `aria-pressed`
  - UploadPanel `aria-labelledby={$t(...)}` points to a non-existent id
  - Favorites share-toggle subtitle exposed only by `title=`, and the Switch had no programmatic name
  - Admin users list sends the access token in the query string

**Files:**
- Modify: `overrides/lib/components/mobile/MobileBottomNav.svelte` (disclosure instead of menu; Escape returns focus)
- Create: `overrides/lib/components/mobile/MobileBottomNav.spec.ts`
- Modify: `overrides/lib/components/shared-components/navigation-bar/NavigationBar.svelte` (language toggle label)
- Modify: `custom/src/routes/UploadPanel.svelte` (bubble `aria-label`s, badge sizing, drop bogus `aria-labelledby`)
- Create: `custom/src/routes/UploadPanel.spec.ts`
- Modify: `custom/src/components/MaintenancePage.svelte` (`role="alert"` only)
- Modify: `custom/src/routes/auth/onboarding/OnboardingTheme.svelte` (`aria-pressed`)
- Create: `custom/src/routes/auth/onboarding/OnboardingTheme.spec.ts`
- Modify: `custom/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte` (Switch `aria-labelledby` / `aria-describedby`)
- Modify: `custom/src/routes/admin/users/(list)/+layout.svelte` (Bearer header)
- Modify: `upstream/i18n/en.json`, `upstream/i18n/vi.json` (3 keys)
- Copies (regenerated): matching `upstream/web/src/lib/components/mobile/…`, `…/navigation-bar/NavigationBar.svelte`, `upstream/web/src/routes/UploadPanel.svelte(.spec.ts)`, `…/auth/onboarding/OnboardingTheme.svelte(.spec.ts)`, `…/(user)/favorites/…/+page.svelte`, `…/admin/users/(list)/+layout.svelte`

**Interfaces:**
- Consumes: none
- Produces:
  - i18n keys `pg_language_toggle`, `pg_upload_show_details`, `pg_upload_errors_count`;
  - element id `pg-mobile-favorites-menu`, present while the popup is open;
  - ids `pg-share-toggle-label` and `pg-share-toggle-description` on the favorites page.

- [ ] **Step 1: Write the failing test.**

  `overrides/lib/components/mobile/MobileBottomNav.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import userEvent from '@testing-library/user-event';
  import { init, register, waitLocale } from 'svelte-i18n';
  import MobileBottomNav from './MobileBottomNav.svelte';

  vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/photos') } }));
  vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
  vi.mock('$custom/utils/capabilities.svelte', () => ({
    can: () => true,
    isMobileShell: () => true,
    isMobileNavActive: () => false,
  }));

  describe('MobileBottomNav favorites popup', () => {
    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    it('is a disclosure, not an ARIA menu', async () => {
      const user = userEvent.setup();
      render(MobileBottomNav);

      const trigger = screen.getByRole('button', { name: 'Favorites' });
      expect(trigger).not.toHaveAttribute('aria-haspopup');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-controls', 'pg-mobile-favorites-menu');
      expect(document.getElementById('pg-mobile-favorites-menu')).toBeInTheDocument();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Shared favorites' })).toBeInTheDocument();
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      render(MobileBottomNav);

      const trigger = screen.getByRole('button', { name: 'Favorites' });
      await user.click(trigger);
      screen.getByRole('button', { name: 'Shared favorites' }).focus();
      await user.keyboard('{Escape}');

      expect(document.getElementById('pg-mobile-favorites-menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
  ```

  `custom/src/routes/UploadPanel.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import userEvent from '@testing-library/user-event';
  import { init, register, waitLocale } from 'svelte-i18n';
  import { uploadAssetsStore } from '$lib/stores/upload';
  import UploadPanel from './UploadPanel.svelte';

  describe('UploadPanel', () => {
    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    afterEach(() => {
      uploadAssetsStore.reset();
    });

    it('gives every collapsed bubble button an accessible name', async () => {
      const user = userEvent.setup();
      uploadAssetsStore.addItem({ id: 'a', file: new File(['x'], 'a.jpg') });
      uploadAssetsStore.track('error');
      render(UploadPanel);

      await user.click(await screen.findByRole('button', { name: 'Minimize' }));

      expect(await screen.findByRole('button', { name: 'Show upload details' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remaining 1 - Processed 0/1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 upload error' })).toBeInTheDocument();
    });

    it('labels the concurrency input only through its <label>', async () => {
      const user = userEvent.setup();
      uploadAssetsStore.addItem({ id: 'b', file: new File(['x'], 'b.jpg') });
      render(UploadPanel);

      await user.click(await screen.findByRole('button', { name: 'Toggle settings' }));

      expect(screen.getByLabelText('Upload concurrency')).not.toHaveAttribute('aria-labelledby');
    });
  });
  ```

  `custom/src/routes/auth/onboarding/OnboardingTheme.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import { init, register, waitLocale } from 'svelte-i18n';
  import OnboardingTheme from './OnboardingTheme.svelte';

  describe('OnboardingTheme', () => {
    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    it('marks exactly one theme option as pressed', () => {
      render(OnboardingTheme);

      const options = screen.getAllByRole('button');
      expect(options).toHaveLength(3);
      for (const option of options) {
        expect(option).toHaveAttribute('aria-pressed');
      }
      expect(options.filter((option) => option.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    });
  });
  ```

  Grep checks for the parts jsdom cannot cover (a component that is not collected, a route that is too heavy to render, a page script):
  ```bash
  grep -n 'role="alert" aria-live' custom/src/components/MaintenancePage.svelte
  grep -n "accessToken=" "custom/src/routes/admin/users/(list)/+layout.svelte"
  grep -n "aria-labelledby=\"pg-share-toggle-label\"" "custom/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte"
  grep -n "pg_language_toggle" overrides/lib/components/shared-components/navigation-bar/NavigationBar.svelte
  ```
- [ ] **Step 2: Run it, expect FAIL.**
  ```bash
  bash scripts/prepare-custom.sh
  pnpm --filter immich-web exec vitest run src/lib/components/mobile/MobileBottomNav.spec.ts src/routes/UploadPanel.spec.ts src/routes/auth/onboarding/OnboardingTheme.spec.ts
  ```
  Expected failures:
  - MobileBottomNav: `Expected the element not to have attribute: aria-haspopup`. The second test fails on `toHaveFocus`.
  - UploadPanel: `Unable to find an accessible element with the role "button" and name "Show upload details"`, and `Expected the element not to have attribute: aria-labelledby`.
  - OnboardingTheme: `Expected the element to have attribute: aria-pressed`.

  Grep checks before the change: the MaintenancePage grep prints 1 line, the `accessToken=` grep prints 1 line, and the last two greps print nothing.
- [ ] **Step 3: Implement.**

  `overrides/lib/components/mobile/MobileBottomNav.svelte`:
  ```ts
    let favoritesOpen = $state(false);
  ```
  →
  ```ts
    let favoritesOpen = $state(false);
    let favoritesTrigger: HTMLButtonElement | undefined = $state();
  ```
  ```ts
    const chooseFavorite = async (href: string) => {
  ```
  →
  ```ts
    // Escape đóng popup và trả focus về nút mở (mẫu disclosure, không phải ARIA menu)
    const closeFavoritesMenu = () => {
      if (!favoritesOpen) {
        return;
      }
      favoritesOpen = false;
      favoritesTrigger?.focus();
    };

    const chooseFavorite = async (href: string) => {
  ```
  ```svelte
              onEscape: () => (favoritesOpen = false),
  ```
  → `              onEscape: closeFavoritesMenu,`
  ```svelte
              <div class="pg-mobile-favorites-menu" role="menu" aria-label={$t('favorites')}>
  ```
  → `            <div class="pg-mobile-favorites-menu" id="pg-mobile-favorites-menu">`
  ```svelte
                    class:pg-mobile-favorites-menu__item--active={choiceActive}
                    role="menuitem"
                    onclick={() => chooseFavorite(choice.href)}
  ```
  →
  ```svelte
                    class:pg-mobile-favorites-menu__item--active={choiceActive}
                    aria-current={choiceActive ? 'page' : undefined}
                    onclick={() => chooseFavorite(choice.href)}
  ```
  ```svelte
            <button
              type="button"
              class="pg-mobile-bottom-nav__item"
              class:pg-mobile-bottom-nav__item--active={active}
              aria-current={active ? 'page' : undefined}
              aria-expanded={favoritesOpen}
              aria-haspopup="menu"
              onclick={openFavoritesMenu}
  ```
  →
  ```svelte
            <button
              bind:this={favoritesTrigger}
              type="button"
              class="pg-mobile-bottom-nav__item"
              class:pg-mobile-bottom-nav__item--active={active}
              aria-current={active ? 'page' : undefined}
              aria-expanded={favoritesOpen}
              aria-controls={favoritesOpen ? 'pg-mobile-favorites-menu' : undefined}
              onclick={openFavoritesMenu}
  ```
  If Task 5 has already added more attributes, such as `aria-label`, to this button, keep them. Only add `bind:this`, swap `aria-haspopup="menu"` for `aria-controls`, and keep the order shown.

  `overrides/lib/components/shared-components/navigation-bar/NavigationBar.svelte`:
  ```svelte
            aria-label={$t('language')}
  ```
  →
  ```svelte
            aria-label={$t('pg_language_toggle', {
              values: {
                current: isVietnamese ? 'Tiếng Việt' : 'English',
                next: isVietnamese ? 'English' : 'Tiếng Việt',
              },
            })}
  ```

  `custom/src/routes/UploadPanel.svelte`:
  ```svelte
                aria-labelledby={$t('upload_concurrency')}
  ```
  Delete this line. The `<label for="upload-concurrency">` already names the input.
  ```svelte
            onclick={() => (showDetail = true)}
            class="absolute -inset-s-4 -top-4 flex size-10 place-content-center place-items-center rounded-full bg-primary p-5 text-xs text-light"
          >
  ```
  →
  ```svelte
            onclick={() => (showDetail = true)}
            aria-label={$t('upload_progress', {
              values: {
                remaining: $remainingUploads,
                processed: $stats.total - $remainingUploads,
                total: $stats.total,
              },
            })}
            class="absolute -inset-s-4 -top-4 grid size-10 place-items-center rounded-full bg-primary text-xs text-light"
          >
  ```
  ```svelte
              onclick={() => (showDetail = true)}
              class="absolute -inset-e-4 -top-4 flex size-10 place-content-center place-items-center rounded-full bg-danger p-5 text-xs text-light"
            >
  ```
  →
  ```svelte
              onclick={() => (showDetail = true)}
              aria-label={$t('pg_upload_errors_count', { values: { count: $stats.errors } })}
              class="absolute -inset-e-4 -top-4 grid size-10 place-items-center rounded-full bg-danger text-xs text-light"
            >
  ```
  ```svelte
            onclick={() => (showDetail = true)}
            class="flex size-16 place-content-center place-items-center rounded-full bg-subtle p-5 text-sm text-primary shadow-lg"
          >
  ```
  →
  ```svelte
            onclick={() => (showDetail = true)}
            aria-label={$t('pg_upload_show_details')}
            class="flex size-16 place-content-center place-items-center rounded-full bg-subtle p-5 text-sm text-primary shadow-lg"
          >
  ```

  `custom/src/components/MaintenancePage.svelte`:
  `<div class="pg-maintenance" role="alert" aria-live="polite">` → `<div class="pg-maintenance" role="alert">`

  `custom/src/routes/auth/onboarding/OnboardingTheme.svelte`. Three replacements:
  - `      onclick={() => themeManager.setPreference(ThemePreference.System)}` → `      aria-pressed={currentPreference === ThemePreference.System}` + newline + the same `onclick` line
  - `      onclick={() => themeManager.setPreference(ThemePreference.Light)}` → `      aria-pressed={currentPreference === ThemePreference.Light}` + newline + the same `onclick` line
  - `      onclick={() => themeManager.setPreference(ThemePreference.Dark)}` → `      aria-pressed={currentPreference === ThemePreference.Dark}` + newline + the same `onclick` line

  `custom/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte`:
  ```svelte
          <span class="text-end text-xs font-medium text-primary sm:text-sm">{$t('shared_favorites_share_toggle')}</span>
          <Switch
            checked={partnerFavoritesStore.shareWithEveryone}
  ```
  →
  ```svelte
          <span id="pg-share-toggle-label" class="text-end text-xs font-medium text-primary sm:text-sm"
            >{$t('shared_favorites_share_toggle')}</span
          >
          <!-- title= chỉ hiện khi hover — mô tả cho trình đọc màn hình qua aria-describedby -->
          <span id="pg-share-toggle-description" class="sr-only">{$t('shared_favorites_share_toggle_subtitle')}</span>
          <Switch
            aria-labelledby="pg-share-toggle-label"
            aria-describedby="pg-share-toggle-description"
            checked={partnerFavoritesStore.shareWithEveryone}
  ```

  `custom/src/routes/admin/users/(list)/+layout.svelte`. The server already reads `Authorization: Bearer` first (`api/admin-block-user.ts` `resolveAdmin`):
  ```ts
        const response = await fetch('/api/admin-block-user?list=1&accessToken=' + (getStoredAccessToken() || ''), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
  ```
  →
  ```ts
        // Token đi qua header, không nằm trong URL (tránh lộ ở log/proxy/lịch sử)
        const accessToken = getStoredAccessToken();
        const response = await fetch('/api/admin-block-user?list=1', {
          method: 'GET',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
  ```

  `upstream/i18n/en.json`. Insert after the line `  "pg_maintenance_description": "The system is being updated. We expect to be back on {date} at {time}.",`:
  ```json
    "pg_language_toggle": "Language: {current} (VN / EN). Switch to {next}",
    "pg_upload_errors_count": "{count, plural, one {# upload error} other {# upload errors}}",
    "pg_upload_show_details": "Show upload details",
  ```
  `upstream/i18n/vi.json`. Insert after the line `  "pg_maintenance_description": "Hệ thống đang được cập nhật, chúng tôi sẽ trở lại vào {date} lúc {time}.",`:
  ```json
    "pg_language_toggle": "Ngôn ngữ: {current} (VN / EN). Chuyển sang {next}",
    "pg_upload_errors_count": "{count, number} lỗi tải lên",
    "pg_upload_show_details": "Xem chi tiết tải lên",
  ```
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected:
  ```
   M custom/src/components/MaintenancePage.svelte
   M custom/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte
   M custom/src/routes/UploadPanel.svelte
   M custom/src/routes/admin/users/(list)/+layout.svelte
   M custom/src/routes/auth/onboarding/OnboardingTheme.svelte
   M overrides/lib/components/mobile/MobileBottomNav.svelte
   M overrides/lib/components/shared-components/navigation-bar/NavigationBar.svelte
   M upstream/i18n/en.json
   M upstream/i18n/vi.json
   M upstream/web/src/lib/components/mobile/MobileBottomNav.svelte
   M upstream/web/src/lib/components/shared-components/navigation-bar/NavigationBar.svelte
   M upstream/web/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte
   M upstream/web/src/routes/UploadPanel.svelte
   M upstream/web/src/routes/admin/users/(list)/+layout.svelte
   M upstream/web/src/routes/auth/onboarding/OnboardingTheme.svelte
  ?? custom/src/routes/UploadPanel.spec.ts
  ?? custom/src/routes/auth/onboarding/OnboardingTheme.spec.ts
  ?? overrides/lib/components/mobile/MobileBottomNav.spec.ts
  ?? upstream/web/src/lib/components/mobile/MobileBottomNav.spec.ts
  ?? upstream/web/src/routes/UploadPanel.spec.ts
  ?? upstream/web/src/routes/auth/onboarding/OnboardingTheme.spec.ts
  ```
- [ ] **Step 5: Verify.**
  - Re-run the Step 2 vitest command. Expect all PASS.
  - Grep checks: MaintenancePage grep prints nothing, `accessToken=` grep prints nothing, favorites grep prints 1 line, NavigationBar grep prints 1 line.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1. This also confirms the three new keys type-check against en.json.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/mobile/MobileBottomNav.svelte src/lib/components/mobile/MobileBottomNav.spec.ts src/lib/components/shared-components/navigation-bar/NavigationBar.svelte src/routes/UploadPanel.svelte src/routes/UploadPanel.spec.ts src/routes/auth/onboarding/OnboardingTheme.svelte src/routes/auth/onboarding/OnboardingTheme.spec.ts "src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "src/routes/admin/users/(list)/+layout.svelte"`
  - The JSON files must still parse: `node -e "for (const f of ['upstream/i18n/en.json','upstream/i18n/vi.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"` should exit 0.
- [ ] **Step 6: Commit.**
  ```bash
  git add overrides/lib/components/mobile/MobileBottomNav.svelte overrides/lib/components/mobile/MobileBottomNav.spec.ts \
    upstream/web/src/lib/components/mobile/MobileBottomNav.svelte upstream/web/src/lib/components/mobile/MobileBottomNav.spec.ts \
    overrides/lib/components/shared-components/navigation-bar/NavigationBar.svelte upstream/web/src/lib/components/shared-components/navigation-bar/NavigationBar.svelte \
    custom/src/routes/UploadPanel.svelte custom/src/routes/UploadPanel.spec.ts upstream/web/src/routes/UploadPanel.svelte upstream/web/src/routes/UploadPanel.spec.ts \
    custom/src/components/MaintenancePage.svelte \
    custom/src/routes/auth/onboarding/OnboardingTheme.svelte custom/src/routes/auth/onboarding/OnboardingTheme.spec.ts \
    upstream/web/src/routes/auth/onboarding/OnboardingTheme.svelte upstream/web/src/routes/auth/onboarding/OnboardingTheme.spec.ts \
    "custom/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" "upstream/web/src/routes/(user)/favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte" \
    "custom/src/routes/admin/users/(list)/+layout.svelte" "upstream/web/src/routes/admin/users/(list)/+layout.svelte" \
    upstream/i18n/en.json upstream/i18n/vi.json
  git commit -m "$(cat <<'EOF'
  fix(a11y): đặt tên nút shell và bubble upload, sửa ngữ nghĩa trang custom

  - Popup yêu thích ở bottom nav: bỏ role=menu (không có điều hướng phím), dùng aria-expanded/aria-controls, Escape trả focus
  - Nút ngôn ngữ đọc được ngôn ngữ hiện tại và ngôn ngữ sẽ chuyển sang
  - Bubble upload: aria-label cho 3 nút, bỏ p-5 làm vỡ badge, bỏ aria-labelledby trỏ id không tồn tại
  - MaintenancePage chỉ dùng role=alert; OnboardingTheme có aria-pressed
  - Switch chia sẻ yêu thích có tên và mô tả cho trình đọc màn hình
  - Danh sách user bị khóa gửi access token qua header Authorization thay vì query string

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 15 (nhóm 8): Form inputs (login, DateInput, date range labels, search input)

**Findings covered:**
- C (High) H5: Login: delayed `readonly` anti-autofill trick likely blocks the keyboard on iOS. Removed, per the user's decision.
- C: Login inputs defeat OS/browser input assistance. Only `inputmode` / `enterkeyhint` are added; the rest conflicts with the user's decision (see Dropped).
- C: Login 14px inputs depend on the viewport zoom hack. Login inputs and the FeatureUpdateModal email input get `size="medium"` (16px).
- D: DateInput (vi locale): `inputmode="decimal"` hides `/` and `:` on iOS
- D: DateInput calendar button: 20px wide, `tabindex="-1"`, hard-coded Vietnamese label
- D (Low): Date range in Vietnamese: unlabeled text input
- D (Low): `--immich-fg` is a raw RGB triplet used as a CSS colour. Its only use is the DateInput picker rule rewritten here; listed for Task 9 but done here.
- A (Low): Search input font-size 14px (iOS focus-zoom), no `enterkeyhint`. The audit blamed `fluent/navigation.css:118`, but that file is not imported. The real cause is that `<nav id="dashboard-navbar" class="… text-sm …">` is inherited by the input through Tailwind preflight `font: inherit`. The finding still holds.

**Files:**
- Modify: `custom/src/routes/auth/login/+page.svelte`
- Create: `custom/src/routes/auth/login/login-page.spec.ts`
- Modify: `custom/src/routes/FeatureUpdateModal.svelte` (email `Input size="medium"`)
- Modify: `overrides/lib/elements/DateInput.svelte`
- Modify: `overrides/lib/elements/DateTimeField.svelte` (pass `aria-labelledby` through)
- Create: `overrides/lib/elements/DateInput.spec.ts`
- Modify: `overrides/lib/components/shared-components/search-bar/SearchDateSection.svelte`
- Modify: `overrides/lib/components/shared-components/search-bar/SearchBar.svelte`
- Modify: `upstream/i18n/en.json`, `upstream/i18n/vi.json` (`pg_select_date`)
- Copies (regenerated): `upstream/web/src/routes/auth/login/+page.svelte`, `…/login/login-page.spec.ts`, `upstream/web/src/routes/FeatureUpdateModal.svelte`, `upstream/web/src/lib/elements/DateInput.svelte`, `…/DateTimeField.svelte`, `…/DateInput.spec.ts`, `upstream/web/src/lib/components/shared-components/search-bar/SearchDateSection.svelte`, `…/SearchBar.svelte`

**Interfaces:**
- Consumes: the Task 7-a solid focus ring, which the DateInput picker button picks up through `button:focus-visible`.
- Produces:
  - i18n key `pg_select_date`;
  - `DateTimeField` prop `'aria-labelledby'?: string`;
  - ids `search-date-start-label` / `search-date-end-label`.

- [ ] **Step 1: Write the failing test.**

  `custom/src/routes/auth/login/login-page.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import userEvent from '@testing-library/user-event';
  import { initAppConfig } from '@photo-gallery/config';
  import { init, register, waitLocale } from 'svelte-i18n';
  import LoginPage from './+page.svelte';

  vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
  vi.mock('$lib/managers/feature-flags-manager.svelte', () => ({
    featureFlagsManager: { value: { passwordLogin: true, oauth: false, oauthAutoLaunch: false } },
  }));
  vi.mock('$lib/managers/server-config-manager.svelte', () => ({
    serverConfigManager: { value: { loginPageMessage: '', isOnboarded: true, oauthButtonText: 'OAuth' } },
  }));

  const data = { meta: { title: 'Login' }, continueUrl: '/photos' };

  describe('login page inputs', () => {
    beforeAll(async () => {
      initAppConfig({});
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    it('keeps anti-autofill markers but never starts read-only', () => {
      render(LoginPage, { props: { data } as never });

      const email = screen.getByRole('textbox', { name: 'Email' });
      const password = screen.getByRole('textbox', { name: 'Password' });

      expect(email).toHaveAttribute('autocomplete', 'nope');
      expect(email).toHaveAttribute('inputmode', 'email');
      expect(email).toHaveAttribute('enterkeyhint', 'next');
      expect(email).not.toHaveAttribute('readonly');
      expect(email.className).toContain('text-base');

      expect(password).toHaveAttribute('autocomplete', 'nope');
      expect(password).toHaveAttribute('enterkeyhint', 'go');
      expect(password).not.toHaveAttribute('readonly');
      expect(password.className).toContain('text-base');
    });

    it('moves to the password field when Enter is pressed on email with no password', async () => {
      const user = userEvent.setup();
      render(LoginPage, { props: { data } as never });

      const email = screen.getByRole('textbox', { name: 'Email' });
      await user.type(email, 'a@b.c{Enter}');

      expect(screen.getByRole('textbox', { name: 'Password' })).toHaveFocus();
    });
  });
  ```

  `overrides/lib/elements/DateInput.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import { init, register, waitLocale } from 'svelte-i18n';
  import { locale } from '$lib/stores/preferences.store';
  import DateInput from './DateInput.svelte';
  import DateTimeField from './DateTimeField.svelte';

  describe('DateInput (Vietnamese text mode)', () => {
    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    beforeEach(() => {
      locale.set('vi');
    });

    afterEach(() => {
      locale.set('default');
    });

    it('uses a keyboard that can type "/" and ":" and a Done key', () => {
      render(DateInput, { props: { type: 'datetime-local', value: '', id: 'when' } });

      const input = document.getElementById('when');
      expect(input).toHaveAttribute('inputmode', 'text');
      expect(input).toHaveAttribute('enterkeyhint', 'done');
    });

    it('keeps the calendar button in the tab order with a translated name', () => {
      render(DateInput, { props: { type: 'date', value: '' } });

      const picker = screen.getByRole('button', { name: 'Select date' });
      expect(picker).not.toHaveAttribute('tabindex');
    });

    it('passes aria-labelledby from DateTimeField to the text input', () => {
      render(DateTimeField, { props: { id: 'start', 'aria-labelledby': 'start-label' } });

      expect(document.getElementById('start')).toHaveAttribute('aria-labelledby', 'start-label');
    });
  });
  ```
  The search-bar input has no spec, because SearchBar pulls in the search store, suggestions and shortcuts. It gets grep checks instead:
  ```bash
  grep -n 'enterkeyhint="search"' overrides/lib/components/shared-components/search-bar/SearchBar.svelte
  grep -n "aria-labelledby=\"search-date-start-label\"\|aria-labelledby=\"search-date-end-label\"" overrides/lib/components/shared-components/search-bar/SearchDateSection.svelte
  grep -n 'size="medium"' custom/src/routes/FeatureUpdateModal.svelte
  ```
- [ ] **Step 2: Run it, expect FAIL.**
  ```bash
  bash scripts/prepare-custom.sh
  pnpm --filter immich-web exec vitest run src/routes/auth/login/login-page.spec.ts src/lib/elements/DateInput.spec.ts
  ```
  Expected failures:
  - login, first test: `Expected the element to have attribute: inputmode="email"`;
  - login, second test: focus stays on email, because the email field is `readonly` and Enter calls `handleLogin`;
  - DateInput: `inputmode="text"` (received `decimal`), `Unable to find … name "Select date"`, and the `aria-labelledby` attribute is missing.

  Before the change the three greps print nothing.
- [ ] **Step 3: Implement.**

  `custom/src/routes/auth/login/+page.svelte`. Keep `autocomplete="nope"`, the `data-1p-ignore` / `data-lpignore` / `data-bwignore` / `data-form-type` attributes and the masked `type="text"` password.
  1. `  import { onDestroy, onMount } from 'svelte';` → `  import { onMount } from 'svelte';`
  2. ```ts
       let blockAutofill = $state(true);
       let loginFieldsMounted = $state(true);
       let autofillUnlockTimer: ReturnType<typeof setTimeout> | undefined;
     ```
     →
     ```ts
       let loginFieldsMounted = $state(true);
       let passwordInput = $state<HTMLInputElement | null>(null);
     ```
  3. Delete this whole block, including the blank line after it:
     ```ts
       const unlockAutofill = (event?: Event) => {
         if (!blockAutofill) {
           return;
         }

         if (autofillUnlockTimer !== undefined) {
           clearTimeout(autofillUnlockTimer);
           autofillUnlockTimer = undefined;
         }

         const input = event?.target instanceof HTMLInputElement ? event.target : null;
         input?.removeAttribute('readonly');
         blockAutofill = false;
       };

       const scheduleUnlockAutofill = () => {
         if (!blockAutofill || autofillUnlockTimer !== undefined) {
           return;
         }

         // Chrome quét autofill ngay lúc focus — giữ readonly qua nhịp đó.
         autofillUnlockTimer = setTimeout(() => {
           autofillUnlockTimer = undefined;
           unlockAutofill();
         }, 200);
       };
     ```
  4. Delete, including the blank line after it:
     ```ts
       onDestroy(() => {
         if (autofillUnlockTimer !== undefined) {
           clearTimeout(autofillUnlockTimer);
         }
       });
     ```
  5. ```ts
       const onFieldKeydown = (event: KeyboardEvent) => {
         unlockAutofill(event);
         onLoginKeydown(event);
       };
     ```
     →
     ```ts
       // Bỏ mẹo readonly-khi-focus (iOS không bật bàn phím ở lần chạm đầu); chống password manager vẫn nhờ
       // autocomplete="nope" + data-*-ignore + ô mật khẩu type=text có che ký tự.
       const onEmailKeydown = (event: KeyboardEvent) => {
         if (event.key !== 'Enter' || loading) {
           return;
         }

         event.preventDefault();
         // Phím "Tiếp" (enterkeyhint=next): sang ô mật khẩu nếu còn trống
         if (!password) {
           passwordInput?.focus();
           return;
         }

         void handleLogin();
       };
     ```
  6. Email input:
     ```svelte
                     <Input
                       name={loginIdName}
                       type="text"
                       autocapitalize="none"
     ```
     →
     ```svelte
                     <Input
                       name={loginIdName}
                       type="text"
                       size="medium"
                       inputmode="email"
                       enterkeyhint="next"
                       autocapitalize="none"
     ```
     and, in the same element:
     ```svelte
                       readonly={blockAutofill}
                       onfocus={scheduleUnlockAutofill}
                       onkeydown={onFieldKeydown}
                       bind:value={email}
     ```
     →
     ```svelte
                       onkeydown={onEmailKeydown}
                       bind:value={email}
     ```
  7. Password input:
     ```svelte
                       <Input
                         name={loginSecretName}
                         type="text"
                         autocapitalize="none"
     ```
     →
     ```svelte
                       <Input
                         name={loginSecretName}
                         type="text"
                         size="medium"
                         enterkeyhint="go"
                         autocapitalize="none"
     ```
     and:
     ```svelte
                         readonly={blockAutofill}
                         onfocus={scheduleUnlockAutofill}
                         onkeydown={onFieldKeydown}
                         bind:value={password}
     ```
     →
     ```svelte
                         onkeydown={onLoginKeydown}
                         bind:ref={passwordInput}
                         bind:value={password}
     ```

  `custom/src/routes/FeatureUpdateModal.svelte`:
  ```svelte
            <Input
              type="email"
              inputmode="email"
  ```
  →
  ```svelte
            <Input
              type="email"
              size="medium"
              inputmode="email"
  ```

  `overrides/lib/elements/DateInput.svelte`:
  - `  import type { HTMLInputAttributes } from 'svelte/elements';` → the same line + newline + `  import { t } from 'svelte-i18n';`
  - `      inputmode="decimal"` → two lines: `      inputmode="text"` and `      enterkeyhint="done"`. Reason: the decimal keypad has no `/` `:` or space, and in the vi region its separator is `,`, which `DISPLAY_INPUT_RE` (`overrides/lib/utils/date-format.ts:144`, separators `[/.-]`) rejects.
  - Picker button:
    ```svelte
          <button
            type="button"
            class="pg-date-input__picker"
            tabindex="-1"
            aria-label="Chọn ngày"
            onclick={openPicker}
          >
    ```
    →
    ```svelte
          <button type="button" class="pg-date-input__picker" aria-label={$t('pg_select_date')} onclick={openPicker}>
    ```
  - Styles:
    ```css
      .pg-date-input__text {
        width: 100%;
        min-width: 0;
        padding-inline-end: 2.25rem;
      }

      .pg-date-input__picker {
        position: absolute;
        inset-inline-end: 0.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--immich-fg, currentColor);
        opacity: 0.7;
        cursor: pointer;
      }

      .pg-date-input__picker:hover {
        opacity: 1;
      }
    ```
    →
    ```css
      .pg-date-input__text {
        width: 100%;
        min-width: 0;
        padding-inline-end: 3rem;
      }

      /* Vùng chạm 44×44 (icon vẫn 20px); màu token thật thay cho --immich-fg (bộ ba RGB, không phải màu hợp lệ) */
      .pg-date-input__picker {
        position: absolute;
        top: 50%;
        inset-inline-end: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2.75rem;
        min-height: 2.75rem;
        padding: 0;
        border: 0;
        border-radius: 9999px;
        background: transparent;
        color: var(--md-sys-color-on-surface-variant);
        cursor: pointer;
        transform: translateY(-50%);
      }

      .pg-date-input__picker:hover {
        color: var(--md-sys-color-on-surface);
      }
    ```
    The icon colour `on-surface-variant` on the input fill `surface-container-highest` is 7.21:1 light / 7.20:1 dark, computed from the tokens.

  `overrides/lib/elements/DateTimeField.svelte`:
  ```ts
      id?: string;
      onChange?: (date: DateTime | undefined) => void;
    }
  ```
  →
  ```ts
      id?: string;
      'aria-labelledby'?: string;
      onChange?: (date: DateTime | undefined) => void;
    }
  ```
  ```ts
      id,
      onChange,
    }: Props = $props();
  ```
  →
  ```ts
      id,
      'aria-labelledby': ariaLabelledby,
      onChange,
    }: Props = $props();
  ```
  ```svelte
  <DateInput {type} {id} class={className} bind:value={() => iso, setIso} min={toBound(minDate)} max={toBound(maxDate)} />
  ```
  →
  ```svelte
  <DateInput
    {type}
    {id}
    aria-labelledby={ariaLabelledby}
    class={className}
    bind:value={() => iso, setIso}
    min={toBound(minDate)}
    max={toBound(maxDate)}
  />
  ```

  `overrides/lib/components/shared-components/search-bar/SearchDateSection.svelte`. `Text` stays a `<p>`, so the modal's `[class*='Text']` / `p` styling is unchanged:
  ```svelte
      <div>
        <Text class="mb-2" fontWeight="medium">{$t('start_date')}</Text>
        <DateTimeField bind:value={filters.takenAfter} maxDate={filters.takenBefore} />
      </div>

      <div>
        <Text class="mb-2" fontWeight="medium">{$t('end_date')}</Text>
        <DateTimeField bind:value={filters.takenBefore} minDate={filters.takenAfter} />
      </div>
  ```
  →
  ```svelte
      <div>
        <Text id="search-date-start-label" class="mb-2" fontWeight="medium">{$t('start_date')}</Text>
        <DateTimeField
          aria-labelledby="search-date-start-label"
          bind:value={filters.takenAfter}
          maxDate={filters.takenBefore}
        />
      </div>

      <div>
        <Text id="search-date-end-label" class="mb-2" fontWeight="medium">{$t('end_date')}</Text>
        <DateTimeField
          aria-labelledby="search-date-end-label"
          bind:value={filters.takenBefore}
          minDate={filters.takenAfter}
        />
      </div>
  ```

  `overrides/lib/components/shared-components/search-bar/SearchBar.svelte`:
  ```svelte
        <input
          type="text"
          name="q"
          id="main-search-bar"
          class="w-full border-2 py-4 ps-14 text-immich-fg/75 transition-all max-md:py-2 dark:text-immich-dark-fg
  ```
  →
  ```svelte
        <input
          type="text"
          inputmode="search"
          enterkeyhint="search"
          name="q"
          id="main-search-bar"
          class="w-full border-2 py-4 ps-14 text-base text-immich-fg/75 transition-all max-md:py-2 dark:text-immich-dark-fg
  ```

  i18n. In en.json, after the `pg_maintenance_description` line, add `  "pg_select_date": "Select date",`. In vi.json, after its `pg_maintenance_description` line, add `  "pg_select_date": "Chọn ngày",`.
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected:
  ```
   M custom/src/routes/FeatureUpdateModal.svelte
   M custom/src/routes/auth/login/+page.svelte
   M overrides/lib/components/shared-components/search-bar/SearchBar.svelte
   M overrides/lib/components/shared-components/search-bar/SearchDateSection.svelte
   M overrides/lib/elements/DateInput.svelte
   M overrides/lib/elements/DateTimeField.svelte
   M upstream/i18n/en.json
   M upstream/i18n/vi.json
   M upstream/web/src/lib/components/shared-components/search-bar/SearchBar.svelte
   M upstream/web/src/lib/components/shared-components/search-bar/SearchDateSection.svelte
   M upstream/web/src/lib/elements/DateInput.svelte
   M upstream/web/src/lib/elements/DateTimeField.svelte
   M upstream/web/src/routes/FeatureUpdateModal.svelte
   M upstream/web/src/routes/auth/login/+page.svelte
  ?? custom/src/routes/auth/login/login-page.spec.ts
  ?? overrides/lib/elements/DateInput.spec.ts
  ?? upstream/web/src/lib/elements/DateInput.spec.ts
  ?? upstream/web/src/routes/auth/login/login-page.spec.ts
  ```
- [ ] **Step 5: Verify.**
  - Re-run the Step 2 vitest command. Expect PASS. Also run `pnpm --filter immich-web exec vitest run src/lib/utils/date-format.spec.ts`; it should still pass, because the parser is unchanged.
  - The three Step 1 greps should now print 1, 2 and 1 line respectively.
  - `grep -n "blockAutofill\|scheduleUnlockAutofill\|readonly=" custom/src/routes/auth/login/+page.svelte`: expect no output.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 src/routes/auth/login/+page.svelte src/routes/auth/login/login-page.spec.ts src/routes/FeatureUpdateModal.svelte src/lib/elements/DateInput.svelte src/lib/elements/DateInput.spec.ts src/lib/elements/DateTimeField.svelte src/lib/components/shared-components/search-bar/SearchDateSection.svelte src/lib/components/shared-components/search-bar/SearchBar.svelte`
  - Manual check on an iOS device `[Unverified until run]`: the first tap on email opens the keyboard and shows the `@` key. The return key reads "Next" on email and "Go" on password.
- [ ] **Step 6: Commit.**
  ```bash
  git add custom/src/routes/auth/login/+page.svelte custom/src/routes/auth/login/login-page.spec.ts \
    upstream/web/src/routes/auth/login/+page.svelte upstream/web/src/routes/auth/login/login-page.spec.ts \
    custom/src/routes/FeatureUpdateModal.svelte upstream/web/src/routes/FeatureUpdateModal.svelte \
    overrides/lib/elements/DateInput.svelte overrides/lib/elements/DateInput.spec.ts overrides/lib/elements/DateTimeField.svelte \
    upstream/web/src/lib/elements/DateInput.svelte upstream/web/src/lib/elements/DateInput.spec.ts upstream/web/src/lib/elements/DateTimeField.svelte \
    overrides/lib/components/shared-components/search-bar/SearchDateSection.svelte overrides/lib/components/shared-components/search-bar/SearchBar.svelte \
    upstream/web/src/lib/components/shared-components/search-bar/SearchDateSection.svelte upstream/web/src/lib/components/shared-components/search-bar/SearchBar.svelte \
    upstream/i18n/en.json upstream/i18n/vi.json
  git commit -m "$(cat <<'EOF'
  fix(form): bỏ readonly trì hoãn ở login, sửa bàn phím DateInput và cỡ chữ input

  - Login: bỏ blockAutofill/scheduleUnlockAutofill (iOS không bật bàn phím lần chạm đầu); giữ autocomplete=nope, data-*-ignore và ô mật khẩu che ký tự
  - Login: inputmode=email, enterkeyhint next/go, Enter ở email chuyển sang mật khẩu; input 16px (size=medium), cả ô email FeatureUpdateModal
  - DateInput (vi): inputmode=text + enterkeyhint=done; nút lịch 44px, vào được bằng Tab, nhãn qua $t, màu token thay --immich-fg
  - Khoảng ngày trong bộ lọc tìm kiếm có tên qua aria-labelledby
  - Ô tìm kiếm navbar: text-base (16px), inputmode/enterkeyhint=search

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 16 (nhóm 9-a): Delete branding CSS files that are not imported

**Findings covered:**
- D (Low): Dead/legacy token files carry a sub-16px input size and a failing palette; risk if re-enabled. This also covers the consolidated audit note about `--colorNeutral*` variables that do not exist; they appear only in the files deleted here.

**Files (delete, 17):**
- `branding/src/component-overrides.css`
- `branding/src/fluent-tokens.css`
- `branding/src/typography.css` (the root one; `branding/src/m3/typography.css` stays)
- `branding/src/immich-bridge.css` (the root one; `branding/src/m3/immich-bridge.css` stays)
- `branding/src/fluent/admin.css`, `fluent/forms.css`, `fluent/globals.css`, `fluent/navigation.css`, `fluent/primitives.css`, `fluent/search-filter.css`, `fluent/shell.css`, `fluent/timeline.css`
- `branding/src/tokens/colors.css`, `tokens/motion.css`, `tokens/radius.css`, `tokens/shadows.css`, `tokens/typography.css`

**Kept (active chain).** These are the files imported by `custom/src/styles/custom.css:1-20`:
- `fonts.css`, `tokens/spacing.css`
- `m3/{tokens,shape,elevation,typography,immich-bridge,components,search-filter,admin,timeline,shell,states,media-chrome}.css`
- `theme-light.css`, `theme-dark.css`
- `fluent/responsive.css`, `fluent/viewer.css`
- `loading.css`

`branding/src/index.ts` is also kept.

**Interfaces:**
- Consumes: none
- Produces: none. A later task that edits anything in the deleted list would be working on dead code; see the Cross-task notes about Task 3 and `fluent/navigation.css`.

**Grep evidence (run 2026-10-27 at HEAD `9c0b2d440`).**

How branding CSS can reach the page:
1. `upstream/web/src/routes/+layout.svelte:47` `import '$custom/styles/custom.css'` (bundled), and `upstream/web/src/app.html:115` `<link rel="stylesheet" href="/custom.css">`, which is the sed copy where `@import '../../../branding/src/` becomes `/branding/` (`scripts/prepare-custom.sh:45-47`).
2. Aliases `$branding` / `@photo-gallery/branding` (`config/src/vite.integration.ts:20,24`). `git grep -nE "\\\$branding|@photo-gallery/branding" -- custom overrides upstream/web/src config scripts` finds only the sed expression in `scripts/prepare-custom.sh:45`, which is not an import.
3. `branding/package.json` exports only `index.ts`, `theme-light.css`, `theme-dark.css` and `loading.css`, all kept.
4. `import.meta.glob`: the only use is `upstream/web/src/lib/utils/i18n.ts:24` (`$i18n/*.json`).

Command (scope = everything that can load CSS):
```bash
SCOPE="custom overrides branding scripts config api patches upstream/web/src upstream/web/static upstream/web/vite.config.ts upstream/web/svelte.config.js upstream/web/package.json package.json"
chk(){ echo "### $1"; git grep -nE "$2" -- $SCOPE; echo "(exit $?)"; }
chk component-overrides.css 'component-overrides(\.css)?'
chk fluent-tokens.css 'fluent-tokens'
chk "typography.css (root)" "(branding/(src/)?|/branding/|['\"(]\./|['\"(]\.\./)typography\.css"
chk "immich-bridge.css (root)" "(branding/(src/)?|/branding/|['\"(]\./|['\"(]\.\./)immich-bridge\.css"
for n in admin forms globals navigation primitives search-filter shell timeline; do chk "fluent/$n.css" "fluent/$n(\.css)?|['\"(]\./$n\.css"; done
for n in colors motion radius shadows typography; do chk "tokens/$n.css" "tokens/$n\.css"; done
```
Observed output, as captured during planning:
```
### component-overrides.css
branding/src/fluent/forms.css:2: * Ant Design 6.5.4 — Settings & forms (see component-overrides.css for shared classes)   ← comment inside a file being deleted
### fluent-tokens.css                 (exit 1, no reference)
### typography.css (root)             (exit 1)
### immich-bridge.css (root)          (exit 1)   ← custom.css imports m3/immich-bridge.css; theme-*.css only mention m3/immich-bridge.css in a comment
### fluent/admin.css                  (exit 1)
### fluent/forms.css                  (exit 1)
### fluent/globals.css                (exit 1)
### fluent/navigation.css             (exit 1)
### fluent/primitives.css             (exit 1)
### fluent/search-filter.css          (exit 1)
### fluent/shell.css                  (exit 1)
### fluent/timeline.css               (exit 1)
### tokens/colors.css     → branding/src/fluent-tokens.css:5  (only importer is itself dead)
### tokens/motion.css     → branding/src/fluent-tokens.css:10 (same)
### tokens/radius.css     → branding/src/fluent-tokens.css:8  (same)
### tokens/shadows.css    → branding/src/fluent-tokens.css:9  (same)
### tokens/typography.css → branding/src/fluent-tokens.css:6  (same)
```
Supporting checks:
- `git grep -nE "fluent-tokens|component-overrides|fluent/(globals|primitives|forms|admin|navigation|search-filter|shell|timeline)|tokens/(colors|motion|radius|shadows|typography)|branding/src/typography|branding/src/immich-bridge" -- '*.md' '*.json' '*.yml' '*.yaml' '*.toml' ':!docs/superpowers/audits/**'` prints nothing.
- No active file uses a variable that only the dead files define. `git grep -nE "var\(--(ant-|color[A-Z]|borderRadius|shadow[0-9]|duration[A-Z]|curve[A-Z]|fontFamily|fontSize|fontWeight|lineHeight)" -- custom overrides branding/src/m3 branding/src/fluent/responsive.css branding/src/fluent/viewer.css branding/src/loading.css branding/src/fonts.css branding/src/theme-light.css branding/src/theme-dark.css branding/src/tokens/spacing.css` prints nothing.
- `--pg-font-sans` / `--pg-font-mono` are also defined in the active `branding/src/fonts.css:43-44`, so the copy in `tokens/typography.css` is redundant.

- [ ] **Step 1: Write the failing test.** Deleting dead files is not a jsdom behaviour, so this check stands in for a test:
  ```bash
  ls branding/src/component-overrides.css branding/src/fluent-tokens.css branding/src/typography.css branding/src/immich-bridge.css \
    branding/src/fluent/{admin,forms,globals,navigation,primitives,search-filter,shell,timeline}.css \
    branding/src/tokens/{colors,motion,radius,shadows,typography}.css 2>&1 | grep -c "No such file"
  ```
- [ ] **Step 2: Run it, expect FAIL.** Before deletion it prints `0`, since all 17 files exist. First re-run the evidence command above. If any line other than the ones listed appears, for example because an earlier task added an import, stop and keep that file.
- [ ] **Step 3: Implement.**
  ```bash
  git rm branding/src/component-overrides.css branding/src/fluent-tokens.css branding/src/typography.css branding/src/immich-bridge.css \
    branding/src/fluent/admin.css branding/src/fluent/forms.css branding/src/fluent/globals.css branding/src/fluent/navigation.css \
    branding/src/fluent/primitives.css branding/src/fluent/search-filter.css branding/src/fluent/shell.css branding/src/fluent/timeline.css \
    branding/src/tokens/colors.css branding/src/tokens/motion.css branding/src/tokens/radius.css branding/src/tokens/shadows.css branding/src/tokens/typography.css
  ```
- [ ] **Step 4: Regenerate copies.** Clear the ignored static copy so `/branding/` stops serving stale files, then regenerate:
  ```bash
  rm -rf upstream/web/static/branding
  bash scripts/prepare-custom.sh
  git status --short
  ```
  Expected: the 17 `D  branding/src/...` entries and nothing else. `upstream/web/static/branding/` is ignored, and `upstream/web/static/custom.css` is unchanged because `custom.css` did not change.
- [ ] **Step 5: Verify.**
  - The Step 1 command now prints `17`.
  - `ls branding/src branding/src/fluent branding/src/tokens` should list exactly:
    - root: `fluent fonts.css index.ts loading.css m3 theme-dark.css theme-light.css tokens`
    - fluent: `responsive.css viewer.css`
    - tokens: `spacing.css`
  - Every `@import` in `custom/src/styles/custom.css` should resolve:
    ```bash
    grep -o "branding/src/[^']*" custom/src/styles/custom.css | while read p; do test -f "$p" && echo "ok $p" || echo "MISSING $p"; done
    ```
    Expect 19 `ok` lines and no `MISSING`.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1.
  - `pnpm --filter immich-web exec vite build` is optional and slow; if run, it must succeed, because Vite resolves every CSS `@import`.
- [ ] **Step 6: Commit.**
  ```bash
  git commit -m "$(cat <<'EOF'
  chore(branding): xóa file CSS branding không còn được import

  Chuỗi CSS thật là custom/src/styles/custom.css (fonts, spacing, m3/*, theme-*, fluent/responsive, fluent/viewer, loading).
  Các file fluent-tokens, component-overrides, typography/immich-bridge gốc, fluent/{admin,forms,globals,navigation,primitives,search-filter,shell,timeline}
  và tokens/{colors,motion,radius,shadows,typography} không được import ở đâu (git grep), chứa input 14px, palette không đạt AA
  và biến --colorNeutral* không tồn tại — xóa để tránh bật lại nhầm.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 17 (nhóm 9-b): Respect prefers-reduced-motion in JS smooth scroll and Svelte transitions

**Findings covered:**
- D (Low): Reduced-motion: smooth `scrollIntoView` (SettingAccordion) and a dead escape hatch (`.immich-allow-motion`)
- B (Low): JS smooth scroll ignores `prefers-reduced-motion` (MobilePreviewStrip, Timeline `scrollBy`); Svelte `fly`/`fade` in AssetViewer and Thumbnail do not use `motionDuration()`. The SettingAccordion `slide` is included because it is in the same file and has the same problem.

**Files:**
- Modify: `custom/src/styles/custom.css` (drop the `html:not(.immich-allow-motion)` prefix; `git grep -n immich-allow-motion` shows it is never set)
- Modify: `overrides/lib/components/shared-components/settings/SettingAccordion.svelte`
- Create: `overrides/lib/components/shared-components/settings/SettingAccordion.spec.ts`
- Modify: `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte`
- Create: `overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts`
- Modify: `overrides/lib/components/timeline/Timeline.svelte`
- Modify: `overrides/lib/components/asset-viewer/AssetViewer.svelte`
- Modify: `overrides/lib/components/assets/thumbnail/Thumbnail.svelte`
- Copies (regenerated): `upstream/web/static/custom.css`, plus each override's copy under `upstream/web/src/lib/…` (with specs)

**Interfaces:**
- Consumes: `prefersReducedMotion`, `motionDuration` from `$lib/utils/mobile-performance.svelte` (existing). The edits are anchored on text because Task 2 (AssetViewer, MobilePreviewStrip) and Task 4 (Thumbnail) edit the same files earlier.
- Produces: none

- [ ] **Step 1: Write the failing test.**

  `overrides/lib/components/shared-components/settings/SettingAccordion.spec.ts`:
  ```ts
  import { render, screen } from '@testing-library/svelte';
  import userEvent from '@testing-library/user-event';
  import SettingAccordion from './SettingAccordion.svelte';

  const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: reduce && query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

  describe('SettingAccordion auto-scroll', () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
      Element.prototype.scrollIntoView = scrollIntoView;
      scrollIntoView.mockClear();
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('scrolls instantly when the user prefers reduced motion', async () => {
      stubReducedMotion(true);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(SettingAccordion, { props: { title: 'General', key: 'general-reduced', autoScrollTo: true } });

      await user.click(screen.getByRole('button', { name: /General/ }));
      vi.advanceTimersByTime(250);

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    });

    it('keeps smooth scrolling when motion is allowed', async () => {
      stubReducedMotion(false);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(SettingAccordion, { props: { title: 'General', key: 'general-motion', autoScrollTo: true } });

      await user.click(screen.getByRole('button', { name: /General/ }));
      vi.advanceTimersByTime(250);

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });
  ```

  `overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts`. Task 9-c adds more cases to this file. i18n is set up now because 9-c adds `$t` to the component.
  ```ts
  import { render } from '@testing-library/svelte';
  import { init, register, waitLocale } from 'svelte-i18n';
  import MobilePreviewStrip from './MobilePreviewStrip.svelte';

  const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: reduce && query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

  const assets = [
    { id: 'a', thumbhash: null, originalFileName: 'a.jpg' },
    { id: 'b', thumbhash: null, originalFileName: 'b.jpg' },
  ];

  describe('MobilePreviewStrip', () => {
    const scrollIntoView = vi.fn();

    beforeAll(async () => {
      await init({ fallbackLocale: 'en-US' });
      register('en-US', () => import('$i18n/en.json'));
      await waitLocale('en-US');
    });

    beforeEach(() => {
      Element.prototype.scrollIntoView = scrollIntoView;
      scrollIntoView.mockClear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('centres the current thumb without smooth scrolling under reduced motion', async () => {
      stubReducedMotion(true);
      render(MobilePreviewStrip, { props: { assets, currentId: 'b', onSelect: vi.fn() } });

      await vi.waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'center', block: 'nearest', behavior: 'auto' }),
      );
    });
  });
  ```
  The remaining items are grep checks (Svelte transition durations and Timeline `scrollBy` cannot be observed in jsdom):
  ```bash
  grep -n "immich-allow-motion" custom/src/styles/custom.css
  grep -n "transition:fly={{ duration: 150 }}" overrides/lib/components/asset-viewer/AssetViewer.svelte
  grep -n "fade={{ duration: 100 }}" overrides/lib/components/assets/thumbnail/Thumbnail.svelte
  grep -n "behavior: 'smooth' })" overrides/lib/components/timeline/Timeline.svelte
  ```
- [ ] **Step 2: Run it, expect FAIL.**
  ```bash
  bash scripts/prepare-custom.sh
  pnpm --filter immich-web exec vitest run src/lib/components/shared-components/settings/SettingAccordion.spec.ts src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts
  ```
  Expected:
  - SettingAccordion, reduced-motion case: `expected … toHaveBeenCalledWith({ behavior: 'auto', … })`, received `'smooth'`. The motion-allowed case passes.
  - MobilePreviewStrip: `vi.waitFor` times out, because the call is made with `behavior: 'smooth'`.

  The greps print 3, 2, 3 and 2 lines respectively.

  `[Inference]`: these tests assume `$app/environment` `browser` is `true` under vitest. The existing `timeline-manager` baseline failure (`matchMedia` undefined in `mobile-performance.svelte.ts`) shows that this code path runs in tests.
- [ ] **Step 3: Implement.**

  `custom/src/styles/custom.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    html:not(.immich-allow-motion) *,
    html:not(.immich-allow-motion) *::before,
    html:not(.immich-allow-motion) *::after {
  ```
  →
  ```css
  /* Chỉ áp cho CSS animation/transition. Transition Svelte 5 (element.animate) và scroll bằng JS
     tự kiểm tra qua motionDuration() / prefersReducedMotion() trong $lib/utils/mobile-performance.svelte */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
  ```

  `overrides/lib/components/shared-components/settings/SettingAccordion.svelte`:
  - `  import { accordionManager } from '$lib/managers/accordion-manager.svelte';` → the same line + newline + `  import { motionDuration, prefersReducedMotion } from '$lib/utils/mobile-performance.svelte';`
  - `            behavior: 'smooth',` → `            behavior: prefersReducedMotion() ? 'auto' : 'smooth',`
  - `    <ul transition:slide={{ duration: 150 }} class="ms-4 mb-2">` → `    <ul transition:slide={{ duration: motionDuration(150) }} class="ms-4 mb-2">`

  `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte`:
  - `  import { getAssetMediaUrl } from '$lib/utils';` → the same line + newline + `  import { prefersReducedMotion } from '$lib/utils/mobile-performance.svelte';`
  - `    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior });` → `    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : behavior });`

  `overrides/lib/components/timeline/Timeline.svelte`:
  - `  import { getTimelineLayoutOptions, networkManager } from '$lib/utils/mobile-performance.svelte';` → `  import { getTimelineLayoutOptions, networkManager, prefersReducedMotion } from '$lib/utils/mobile-performance.svelte';`
  - Both occurrences (Edit `replace_all: true`): `behavior: 'smooth' })` → `behavior: prefersReducedMotion() ? 'auto' : 'smooth' })`

  `overrides/lib/components/asset-viewer/AssetViewer.svelte`:
  - `  import { fly } from 'svelte/transition';`: add before it `  import { motionDuration } from '$lib/utils/mobile-performance.svelte';`
  - Both occurrences (Edit `replace_all: true`): `transition:fly={{ duration: 150 }}` → `transition:fly={{ duration: motionDuration(150) }}`. If Task 2 has changed these params, for example to `{{ y: …, duration: 150 }}`, wrap the existing `duration` value of each `transition:fly` on `#detail-panel` and `#activity-panel` in `motionDuration(...)`.

  `overrides/lib/components/assets/thumbnail/Thumbnail.svelte`:
  - ```ts
      import {
        networkManager,
        shouldLazyLoadThumbnails,
    ```
    →
    ```ts
      import {
        motionDuration,
        networkManager,
        shouldLazyLoadThumbnails,
    ```
  - Every occurrence (Edit `replace_all: true`): `fade={{ duration: 100 }}` → `fade={{ duration: motionDuration(100) }}`. This covers two `in:fade` and one `out:fade`. If Task 4 moved or renamed these elements, apply the same wrap to every `fade={{ duration: N }}` left in the file.
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected:
  ```
   M custom/src/styles/custom.css
   M overrides/lib/components/asset-viewer/AssetViewer.svelte
   M overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte
   M overrides/lib/components/assets/thumbnail/Thumbnail.svelte
   M overrides/lib/components/shared-components/settings/SettingAccordion.svelte
   M overrides/lib/components/timeline/Timeline.svelte
   M upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte
   M upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte
   M upstream/web/src/lib/components/assets/thumbnail/Thumbnail.svelte
   M upstream/web/src/lib/components/shared-components/settings/SettingAccordion.svelte
   M upstream/web/src/lib/components/timeline/Timeline.svelte
   M upstream/web/static/custom.css
  ?? overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts
  ?? overrides/lib/components/shared-components/settings/SettingAccordion.spec.ts
  ?? upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts
  ?? upstream/web/src/lib/components/shared-components/settings/SettingAccordion.spec.ts
  ```
  Confirm `patch_timeline` kept the edit:
  ```bash
  git diff upstream/web/src/lib/components/timeline/Timeline.svelte | grep "^[-+] " | grep -v "^[-+]\s*$"
  ```
  This should show only the import line and the two `scrollBy` lines.
- [ ] **Step 5: Verify.**
  - Re-run the Step 2 vitest command. Expect PASS.
  - Re-run the greps. All four should print nothing.
  - Also check `grep -c "motionDuration(" overrides/lib/components/assets/thumbnail/Thumbnail.svelte`: expect `3`.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/shared-components/settings/SettingAccordion.svelte src/lib/components/shared-components/settings/SettingAccordion.spec.ts src/lib/components/asset-viewer/MobilePreviewStrip.svelte src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts src/lib/components/timeline/Timeline.svelte src/lib/components/asset-viewer/AssetViewer.svelte src/lib/components/assets/thumbnail/Thumbnail.svelte`
- [ ] **Step 6: Commit.**
  ```bash
  git add custom/src/styles/custom.css upstream/web/static/custom.css \
    overrides/lib/components/shared-components/settings/SettingAccordion.svelte overrides/lib/components/shared-components/settings/SettingAccordion.spec.ts \
    upstream/web/src/lib/components/shared-components/settings/SettingAccordion.svelte upstream/web/src/lib/components/shared-components/settings/SettingAccordion.spec.ts \
    overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts \
    upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts \
    overrides/lib/components/timeline/Timeline.svelte upstream/web/src/lib/components/timeline/Timeline.svelte \
    overrides/lib/components/asset-viewer/AssetViewer.svelte upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte \
    overrides/lib/components/assets/thumbnail/Thumbnail.svelte upstream/web/src/lib/components/assets/thumbnail/Thumbnail.svelte
  git commit -m "$(cat <<'EOF'
  fix(a11y): tôn trọng prefers-reduced-motion cho cuộn mượt JS và transition Svelte

  - CSS scroll-behavior không ghi đè behavior:'smooth' trong JS: SettingAccordion, filmstrip, Timeline dùng prefersReducedMotion()
  - Transition Svelte 5 chạy bằng element.animate nên rule CSS toàn cục không có tác dụng: fly/fade/slide dùng motionDuration()
  - Bỏ lối thoát .immich-allow-motion không được đặt ở đâu

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 18 (nhóm 9-c): Move hard-coded strings to i18n

**Findings covered:**
- C (Low): Hard-coded Vietnamese strings bypass i18n (dashboard page and title, ErrorLayout stale-chunk page, `/more` "Dashboard", AppSettings touch note, Blocked page title); dashboard number and date formats fixed to `'vi-VN'`
- B (Low): `MobilePreviewStrip` `aria-label="Filmstrip"` and fallback labels hard-coded in English / raw `asset.id`

**Files:**
- Modify: `custom/src/routes/(user)/dashboard/+page.svelte`
- Modify: `custom/src/routes/(user)/dashboard/+page.ts` (`meta.title`)
- Modify: `custom/src/routes/ErrorLayout.svelte`
- Modify: `custom/src/routes/(user)/more/+page.svelte`
- Modify: `custom/src/routes/(user)/user-settings/AppSettings.svelte`
- Modify: `custom/src/routes/(user)/blocked/+page.svelte`
- Modify: `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte`
- Modify: `overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts` (created in 9-b)
- Modify: `upstream/i18n/en.json`, `upstream/i18n/vi.json`
- Copies (regenerated): the matching `upstream/web/src/routes/…` and `upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte(.spec.ts)`

**Interfaces:**
- Consumes: the 7-a dashboard tone classes and Task 6 dashboard layout edits, both earlier (edits here are anchored on the string literals); the Task 5 Blocked page rewrite; the 9-b MobilePreviewStrip spec.
- Produces: i18n keys `pg_dashboard`, `pg_dashboard_*` (25 keys), `pg_stale_chunk_title`, `pg_stale_chunk_description`, `pg_stale_chunk_reload`, `pg_video_hover_touch_note`, `pg_blocked_title`, `pg_filmstrip`, `pg_filmstrip_item_fallback`, `pg_filmstrip_video`, `pg_filmstrip_video_duration`.

- [ ] **Step 1: Write the failing test.** Add to `overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts`, inside the `describe('MobilePreviewStrip', …)` block after the existing `it`:
  ```ts
    it('uses translated labels for the strip and its thumbs', () => {
      render(MobilePreviewStrip, {
        props: {
          assets: [
            { id: 'v', thumbhash: null, originalFileName: 'clip.mp4', isVideo: true, duration: 65_000 },
            { id: 'x', thumbhash: null },
          ],
          currentId: 'v',
          onSelect: vi.fn(),
        },
      });

      expect(document.querySelector('nav')).toHaveAttribute('aria-label', 'Filmstrip');
      expect(document.querySelector('button[aria-current="true"]')).toHaveAttribute(
        'aria-label',
        'clip.mp4 (video, 1:05)',
      );
      expect(document.querySelectorAll('button')[1]).toHaveAttribute('aria-label', 'Item 2 of 2');
    });
  ```
  Grep checks for the routes. The Vietnamese-character class matches any diacritic letter. ErrorLayout is excluded on purpose, because it keeps Vietnamese fallbacks.
  ```bash
  VN='[ạảãàáâậầấẩẫăắằặẳẵđêềếểễệôốồổỗộơớờởỡợưứừửữựỳýỵỷỹ]'
  grep -nP "$VN" "custom/src/routes/(user)/dashboard/+page.svelte" "custom/src/routes/(user)/user-settings/AppSettings.svelte" "custom/src/routes/(user)/blocked/+page.svelte"
  grep -n "'vi-VN'" "custom/src/routes/(user)/dashboard/+page.svelte"
  grep -n "title: 'Dashboard'" "custom/src/routes/(user)/more/+page.svelte" "custom/src/routes/(user)/dashboard/+page.ts"
  grep -n ">Đang tải bản mới<\|>Tải lại<" custom/src/routes/ErrorLayout.svelte
  ```
- [ ] **Step 2: Run it, expect FAIL.**
  ```bash
  bash scripts/prepare-custom.sh
  pnpm --filter immich-web exec vitest run src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts
  ```
  Expected: `aria-label` is `"clip.mp4 (video, 1:05)"`, which matches already. The failure is the item fallback: expected `"Item 2 of 2"`, received `"x"`.

  The greps print lines: the dashboard has about 25 Vietnamese lines, AppSettings 1, blocked 1, the `'vi-VN'` grep 6, the `title: 'Dashboard'` grep 2, and ErrorLayout 2. Blocked may print nothing if Task 5 already translated it.
- [ ] **Step 3: Implement.**

  `custom/src/routes/(user)/dashboard/+page.svelte`, script:
  - `  import { formatDateTime } from '$lib/utils/date-format';` → three lines:
    ```ts
      import FormatMessage from '$lib/elements/FormatMessage.svelte';
      import { locale } from '$lib/stores/preferences.store';
      import { formatDateTime } from '$lib/utils/date-format';
    ```
  - `  import type { PageData } from './$types';` → `  import { t } from 'svelte-i18n';` + newline + `  import type { PageData } from './$types';`
  - ```ts
      const statCards = $derived([
        { label: 'Ảnh', value: data.photoCount.toLocaleString('vi-VN'), icon: mdiImageMultipleOutline, tone: 'sky' },
        { label: 'Video', value: data.videoCount.toLocaleString('vi-VN'), icon: mdiVideoOutline, tone: 'violet' },
        { label: 'Albums', value: data.albumCount.toLocaleString('vi-VN'), icon: mdiImageAlbum, tone: 'amber' },
        { label: 'Phiên bản', value: `v${data.serverVersion}`, icon: mdiCheckCircle, tone: 'emerald' },
      ]);
    ```
    →
    ```ts
      const statCards = $derived([
        { id: 'photos', label: $t('photos'), value: data.photoCount.toLocaleString($locale), icon: mdiImageMultipleOutline, tone: 'sky' },
        { id: 'videos', label: $t('videos'), value: data.videoCount.toLocaleString($locale), icon: mdiVideoOutline, tone: 'violet' },
        { id: 'albums', label: $t('albums'), value: data.albumCount.toLocaleString($locale), icon: mdiImageAlbum, tone: 'amber' },
        { id: 'version', label: $t('version'), value: `v${data.serverVersion}`, icon: mdiCheckCircle, tone: 'emerald' },
      ]);
    ```
  - `  const formatSessionTime = (iso: string) => formatDateTime(new Date(iso), 'vi-VN');` → `  const formatSessionTime = (iso: string) => formatDateTime(new Date(iso), $locale);`

  Markup (each literal below is unique in the file):

  | old | new |
  |---|---|
  | `description={publicEnv.companyName \|\| 'Quản trị hệ thống'}` | `description={publicEnv.companyName \|\| $t('pg_dashboard_admin_fallback')}` |
  | `{data.serverOnline ? 'Server online' : 'Server offline'}` | `{data.serverOnline ? $t('pg_dashboard_server_online') : $t('pg_dashboard_server_offline')}` |
  | `>Tổng quan thư viện — chỉ dành cho admin</p>` | `>{$t('pg_dashboard_intro')}</p>` |
  | `{#each statCards as card (card.label)}` | `{#each statCards as card (card.id)}` |
  | `>Dung lượng lưu trữ</h2>` | `>{$t('pg_dashboard_storage_title')}</h2>` |
  | `>Media: {data.mediaUsageGiB}</p>` | `>{$t('pg_dashboard_media_usage', { values: { size: data.mediaUsageGiB } })}</p>` |
  | `<span>{data.storageUsedGiB} đã dùng</span>` | `<span>{$t('pg_dashboard_storage_used', { values: { size: data.storageUsedGiB } })}</span>` |
  | `<span>{data.storageTotalGiB} tổng</span>` | `<span>{$t('pg_dashboard_storage_total', { values: { size: data.storageTotalGiB } })}</span>` |
  | `>Thống kê lịch sử</h2>` | `>{$t('pg_dashboard_history_title')}</h2>` |
  | `>Hoạt động upload và thiết bị đăng nhập của người dùng</p>` | `>{$t('pg_dashboard_history_description')}</p>` |
  | `>Lịch sử upload (52 tuần)</h3>` | `>{$t('pg_dashboard_upload_history_title')}</h3>` |
  | `>Tổng hợp upload của tất cả người dùng trên hệ thống</p>` | `>{$t('pg_dashboard_upload_history_description')}</p>` |
  | ``itemLabel={({ date, count }) => `${count} ảnh/video ngày ${date}`}`` | `itemLabel={({ date, count }) => $t('pg_dashboard_upload_day', { values: { count, date } })}` |
  | ``totalLabel={(count) => `${count.toLocaleString('vi-VN')} upload`}`` | `totalLabel={(count) => $t('pg_dashboard_upload_total', { values: { count } })}` |
  | `>Chưa có dữ liệu upload.</p>` | `>{$t('pg_dashboard_upload_empty')}</p>` |
  | `>Thiết bị được phép</h3>` | `>{$t('pg_dashboard_devices_title')}</h3>` |
  | `{data.totalSessions.toLocaleString('vi-VN')} phiên đăng nhập` | `{$t('pg_dashboard_sessions_count', { values: { count: data.totalSessions } })}` |
  | `Danh sách thiết bị đã đăng nhập — tương tự mục Authorized Devices trong quản lý người dùng` | `{$t('pg_dashboard_devices_description')}` |
  | `text-(--pg-primary)">Admin</span>` | `text-(--pg-primary)">{$t('pg_dashboard_admin_badge')}</span>` |
  | `<span>Đăng nhập: {formatSessionTime(session.createdAt)}</span>` | `<span>{$t('pg_dashboard_session_created', { values: { time: formatSessionTime(session.createdAt) } })}</span>` |
  | `<span>Hết hạn: {session.expiresAt ? formatSessionTime(session.expiresAt) : '—'}</span>` | `<span>{$t('pg_dashboard_session_expires', { values: { time: session.expiresAt ? formatSessionTime(session.expiresAt) : '—' } })}</span>` |
  | `>Không có thiết bị nào đang đăng nhập.</p>` | `>{$t('pg_dashboard_devices_empty')}</p>` |
  | `>Giới hạn theo dõi của WeGallery</p>` | `>{$t('pg_dashboard_tracking_title')}</p>` |

  The two paragraphs of the tracking card:
  ```svelte
              <p>
                WeGallery <strong>không</strong> lưu thống kê thời gian làm việc trong từng phiên hay danh sách ảnh đã xem
                của người dùng. API chỉ cung cấp phiên đăng nhập (thiết bị, lần hoạt động cuối) và lịch sử upload như
                trên.
              </p>
              <p>
                Để theo dõi chi tiết hơn (ảnh đã xem, thời lượng phiên), cần tích hợp riêng — ví dụ ghi log phía client
                hoặc mở rộng backend.
              </p>
  ```
  →
  ```svelte
              <p>
                <FormatMessage key="pg_dashboard_tracking_storage">
                  {#snippet children({ message })}
                    <strong>{message}</strong>
                  {/snippet}
                </FormatMessage>
              </p>
              <p>{$t('pg_dashboard_tracking_extend')}</p>
  ```

  `custom/src/routes/(user)/dashboard/+page.ts`:
  - `import type { PageLoad } from './$types';` → `import { getFormatter } from '$lib/utils/i18n';` + newline + `import type { PageLoad } from './$types';`
  - ```ts
      return {
        meta: { title: 'Dashboard' },
    ```
    →
    ```ts
      const $t = await getFormatter();

      return {
        meta: { title: $t('pg_dashboard') },
    ```
  `custom/src/hooks/ui-dev-mode.ts` (the dev mock) is intentionally left as is.

  `custom/src/routes/(user)/more/+page.svelte`: `title: 'Dashboard', icon: mdiViewDashboardOutline` → `title: $t('pg_dashboard'), icon: mdiViewDashboardOutline`

  `custom/src/routes/(user)/user-settings/AppSettings.svelte`:
  ```svelte
              Thiết bị cảm ứng không phát video khi hover — tùy chọn này chỉ có hiệu lực trên máy tính.
  ```
  →
  ```svelte
              {$t('pg_video_hover_touch_note')}
  ```

  `custom/src/routes/(user)/blocked/+page.svelte`. Task 5 runs earlier; skip this step if the title already uses `$t`:
  - Replace the literal `Trang web đã dừng hoạt động` with `{$t('pg_blocked_title')}`.
  - If the script has no `svelte-i18n` import, add `  import { t } from 'svelte-i18n';` after `  import { Text } from '@immich/ui';`. If Task 5 removed `Text`, add it as the first import line in `<script lang="ts">`.

  `custom/src/routes/ErrorLayout.svelte`:
  - `  import { onMount } from 'svelte';` → the same line + newline + `  import { locale as i18nLocale, t } from 'svelte-i18n';`
  - `  const showStaleChunkPage = $derived(isStaleChunkError(error));` → the same line, then:
    ```ts

      // Lỗi chunk cũ có thể xảy ra trước khi i18n nạp xong (chính file ngôn ngữ cũng là chunk) — giữ chuỗi gốc làm dự phòng
      const tr = (
        key: 'pg_stale_chunk_title' | 'pg_stale_chunk_description' | 'pg_stale_chunk_reload',
        fallback: string,
      ) => ($i18nLocale ? $t(key, { default: fallback }) : fallback);
    ```
  - Markup:
    ```svelte
          <h1 class="pg-maintenance__title">Đang tải bản mới</h1>
          <p class="pg-maintenance__description">
            Ứng dụng vừa được cập nhật. Trang sẽ tải lại — bạn không phải đăng nhập lại.
          </p>
          <button type="button" class="pg-stale-chunk-reload" onclick={() => reloadApp()}>Tải lại</button>
    ```
    →
    ```svelte
          <h1 class="pg-maintenance__title">{tr('pg_stale_chunk_title', 'Đang tải bản mới')}</h1>
          <p class="pg-maintenance__description">
            {tr('pg_stale_chunk_description', 'Ứng dụng vừa được cập nhật. Trang sẽ tải lại — bạn không phải đăng nhập lại.')}
          </p>
          <button type="button" class="pg-stale-chunk-reload" onclick={() => reloadApp()}>
            {tr('pg_stale_chunk_reload', 'Tải lại')}
          </button>
    ```

  `overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte`:
  - `  import { onDestroy } from 'svelte';` → the same line + newline + `  import { t } from 'svelte-i18n';`
  - After the `formatDuration` function (anchor on `    return Duration.fromMillis(durationMs).toFormat('m:ss');\n  };`), append:
    ```ts

      const thumbLabel = (asset: PreviewStripItem, index: number, durationLabel: string) => {
        const name =
          asset.originalFileName || $t('pg_filmstrip_item_fallback', { values: { index: index + 1, total: assets.length } });
        if (!asset.isVideo) {
          return name;
        }
        return durationLabel
          ? $t('pg_filmstrip_video_duration', { values: { name, duration: durationLabel } })
          : $t('pg_filmstrip_video', { values: { name } });
      };
    ```
  - `  aria-label="Filmstrip"` → `  aria-label={$t('pg_filmstrip')}`
  - `    {#each assets as asset (asset.id)}` → `    {#each assets as asset, index (asset.id)}`
  - ```svelte
            aria-label={asset.isVideo
              ? `${asset.originalFileName ?? asset.id} (video${durationLabel ? `, ${durationLabel}` : ''})`
              : (asset.originalFileName ?? asset.id)}
    ```
    →
    ```svelte
            aria-label={thumbLabel(asset, index, durationLabel)}
    ```

  `upstream/i18n/en.json`. Insert after the `"pg_maintenance_description"` line:
  ```json
    "pg_blocked_title": "This website has stopped working",
    "pg_dashboard": "Dashboard",
    "pg_dashboard_admin_badge": "Admin",
    "pg_dashboard_admin_fallback": "System administration",
    "pg_dashboard_devices_description": "Devices that have signed in — same as Authorized Devices in user management",
    "pg_dashboard_devices_empty": "No devices are signed in.",
    "pg_dashboard_devices_title": "Authorized devices",
    "pg_dashboard_history_description": "Upload activity and signed-in devices of users",
    "pg_dashboard_history_title": "History",
    "pg_dashboard_intro": "Library overview — admins only",
    "pg_dashboard_media_usage": "Media: {size}",
    "pg_dashboard_server_offline": "Server offline",
    "pg_dashboard_server_online": "Server online",
    "pg_dashboard_session_created": "Signed in: {time}",
    "pg_dashboard_session_expires": "Expires: {time}",
    "pg_dashboard_sessions_count": "{count, plural, one {# login session} other {# login sessions}}",
    "pg_dashboard_storage_title": "Storage",
    "pg_dashboard_storage_total": "{size} total",
    "pg_dashboard_storage_used": "{size} used",
    "pg_dashboard_tracking_extend": "More detailed tracking (photos viewed, session duration) needs a separate integration — for example client-side logging or a backend extension.",
    "pg_dashboard_tracking_storage": "WeGallery <b>does not</b> store per-session working time or the list of photos users viewed. The API only provides login sessions (device, last activity) and the upload history above.",
    "pg_dashboard_tracking_title": "WeGallery tracking limits",
    "pg_dashboard_upload_day": "{count, plural, one {# photo/video} other {# photos/videos}} on {date}",
    "pg_dashboard_upload_empty": "No upload data yet.",
    "pg_dashboard_upload_history_description": "Uploads from all users on the system",
    "pg_dashboard_upload_history_title": "Upload history (52 weeks)",
    "pg_dashboard_upload_total": "{count, plural, one {# upload} other {# uploads}}",
    "pg_filmstrip": "Filmstrip",
    "pg_filmstrip_item_fallback": "Item {index} of {total}",
    "pg_filmstrip_video": "{name} (video)",
    "pg_filmstrip_video_duration": "{name} (video, {duration})",
    "pg_stale_chunk_description": "The app was just updated. The page will reload — you won't need to sign in again.",
    "pg_stale_chunk_reload": "Reload",
    "pg_stale_chunk_title": "Loading the new version",
    "pg_video_hover_touch_note": "Touch devices don't play videos on hover — this option only applies on desktop.",
  ```
  `upstream/i18n/vi.json`. Insert after its `"pg_maintenance_description"` line:
  ```json
    "pg_blocked_title": "Trang web đã dừng hoạt động",
    "pg_dashboard": "Bảng điều khiển",
    "pg_dashboard_admin_badge": "Admin",
    "pg_dashboard_admin_fallback": "Quản trị hệ thống",
    "pg_dashboard_devices_description": "Danh sách thiết bị đã đăng nhập — tương tự mục Authorized Devices trong quản lý người dùng",
    "pg_dashboard_devices_empty": "Không có thiết bị nào đang đăng nhập.",
    "pg_dashboard_devices_title": "Thiết bị được phép",
    "pg_dashboard_history_description": "Hoạt động upload và thiết bị đăng nhập của người dùng",
    "pg_dashboard_history_title": "Thống kê lịch sử",
    "pg_dashboard_intro": "Tổng quan thư viện — chỉ dành cho admin",
    "pg_dashboard_media_usage": "Media: {size}",
    "pg_dashboard_server_offline": "Máy chủ ngoại tuyến",
    "pg_dashboard_server_online": "Máy chủ trực tuyến",
    "pg_dashboard_session_created": "Đăng nhập: {time}",
    "pg_dashboard_session_expires": "Hết hạn: {time}",
    "pg_dashboard_sessions_count": "{count, number} phiên đăng nhập",
    "pg_dashboard_storage_title": "Dung lượng lưu trữ",
    "pg_dashboard_storage_total": "{size} tổng",
    "pg_dashboard_storage_used": "{size} đã dùng",
    "pg_dashboard_tracking_extend": "Để theo dõi chi tiết hơn (ảnh đã xem, thời lượng phiên), cần tích hợp riêng — ví dụ ghi log phía client hoặc mở rộng backend.",
    "pg_dashboard_tracking_storage": "WeGallery <b>không</b> lưu thống kê thời gian làm việc trong từng phiên hay danh sách ảnh đã xem của người dùng. API chỉ cung cấp phiên đăng nhập (thiết bị, lần hoạt động cuối) và lịch sử upload như trên.",
    "pg_dashboard_tracking_title": "Giới hạn theo dõi của WeGallery",
    "pg_dashboard_upload_day": "{count, number} ảnh/video ngày {date}",
    "pg_dashboard_upload_empty": "Chưa có dữ liệu upload.",
    "pg_dashboard_upload_history_description": "Tổng hợp upload của tất cả người dùng trên hệ thống",
    "pg_dashboard_upload_history_title": "Lịch sử upload (52 tuần)",
    "pg_dashboard_upload_total": "{count, number} upload",
    "pg_filmstrip": "Dải ảnh",
    "pg_filmstrip_item_fallback": "Mục {index}/{total}",
    "pg_filmstrip_video": "{name} (video)",
    "pg_filmstrip_video_duration": "{name} (video, {duration})",
    "pg_stale_chunk_description": "Ứng dụng vừa được cập nhật. Trang sẽ tải lại — bạn không phải đăng nhập lại.",
    "pg_stale_chunk_reload": "Tải lại",
    "pg_stale_chunk_title": "Đang tải bản mới",
    "pg_video_hover_touch_note": "Thiết bị cảm ứng không phát video khi hover — tùy chọn này chỉ có hiệu lực trên máy tính.",
  ```
  `pg_dashboard_server_online` and `pg_dashboard_server_offline` are new keys on purpose. The existing upstream `vi.json` has `"server_online": "Phiên bản"` (a wrong translation, line 1971); fixing it there would be lost on the next upstream sync.
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected:
  ```
   M custom/src/routes/(user)/blocked/+page.svelte
   M custom/src/routes/(user)/dashboard/+page.svelte
   M custom/src/routes/(user)/dashboard/+page.ts
   M custom/src/routes/(user)/more/+page.svelte
   M custom/src/routes/(user)/user-settings/AppSettings.svelte
   M custom/src/routes/ErrorLayout.svelte
   M overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts
   M overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte
   M upstream/i18n/en.json
   M upstream/i18n/vi.json
   M upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts
   M upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte
   M upstream/web/src/routes/(user)/blocked/+page.svelte
   M upstream/web/src/routes/(user)/dashboard/+page.svelte
   M upstream/web/src/routes/(user)/dashboard/+page.ts
   M upstream/web/src/routes/(user)/more/+page.svelte
   M upstream/web/src/routes/(user)/user-settings/AppSettings.svelte
   M upstream/web/src/routes/ErrorLayout.svelte
  ```
- [ ] **Step 5: Verify.**
  - Re-run the Step 2 vitest command. Expect PASS for both cases.
  - Re-run the Step 1 greps. All should print nothing.
  - JSON parse check: `node -e "for (const f of ['upstream/i18n/en.json','upstream/i18n/vi.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"`
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1. This is the typed-key check for every new `$t` key and the `FormatMessage key`.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 "src/routes/(user)/dashboard/+page.svelte" "src/routes/(user)/dashboard/+page.ts" src/routes/ErrorLayout.svelte "src/routes/(user)/more/+page.svelte" "src/routes/(user)/user-settings/AppSettings.svelte" "src/routes/(user)/blocked/+page.svelte" src/lib/components/asset-viewer/MobilePreviewStrip.svelte src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts`
- [ ] **Step 6: Commit.**
  ```bash
  git add "custom/src/routes/(user)/dashboard/+page.svelte" "custom/src/routes/(user)/dashboard/+page.ts" \
    "upstream/web/src/routes/(user)/dashboard/+page.svelte" "upstream/web/src/routes/(user)/dashboard/+page.ts" \
    custom/src/routes/ErrorLayout.svelte upstream/web/src/routes/ErrorLayout.svelte \
    "custom/src/routes/(user)/more/+page.svelte" "upstream/web/src/routes/(user)/more/+page.svelte" \
    "custom/src/routes/(user)/user-settings/AppSettings.svelte" "upstream/web/src/routes/(user)/user-settings/AppSettings.svelte" \
    "custom/src/routes/(user)/blocked/+page.svelte" "upstream/web/src/routes/(user)/blocked/+page.svelte" \
    overrides/lib/components/asset-viewer/MobilePreviewStrip.svelte overrides/lib/components/asset-viewer/MobilePreviewStrip.spec.ts \
    upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.svelte upstream/web/src/lib/components/asset-viewer/MobilePreviewStrip.spec.ts \
    upstream/i18n/en.json upstream/i18n/vi.json
  git commit -m "$(cat <<'EOF'
  fix(i18n): chuyển chuỗi hard-code sang $t

  - Dashboard: toàn bộ nhãn qua key pg_dashboard_*, số/ngày theo locale người dùng thay cho 'vi-VN' cố định, tiêu đề trang dịch được
  - Trang tải bản mới (stale chunk) dùng $t, giữ chuỗi tiếng Việt làm dự phòng khi i18n chưa nạp
  - /more, AppSettings, trang blocked không còn chuỗi cố định
  - Filmstrip: nhãn nav/thumb dịch được, không còn lộ asset.id khi thiếu tên file

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 19 (nhóm 9-d): Viewer/shell blur cost, EmptyPlaceholder CLS, modal selector scope, `vh`

**Findings covered:**
- B (Medium): Three blurred (48px) full-viewport backdrops stacked in the mobile photo viewer
- A (Low): Blur (`backdrop-filter`) on header and bottom nav where nothing scrolls underneath
- A (Low): EmptyPlaceholder image has a width but no height (CLS). The focus-visible part is under Dropped.
- D (Low): Modal-wide forced fullscreen selector hits any dialog while the filter modal is open. The viewport-meta part is under Dropped.
- D (Low): `max-height: min(40vh, 18rem)` uses `vh`

**Files:**
- Modify: `overrides/lib/components/asset-viewer/PhotoBlurBackdrop.svelte` (new `peek` prop; blur image only on a `fast` network)
- Modify: `overrides/lib/components/asset-viewer/PhotoSwipePeek.svelte` (pass `peek`)
- Create: `overrides/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts`
- Modify: `custom/src/styles/mobile-shell.css` (opaque header and bottom-nav; favorites popup keeps its blur)
- Modify: `overrides/lib/components/shared-components/EmptyPlaceholder.svelte` (`height="333"`, `h-auto`)
- Create: `overrides/lib/components/shared-components/EmptyPlaceholder.spec.ts`
- Modify: `overrides/lib/modals/SearchFilterModal.svelte` (`:has(.ant-search-filter-modal)` scope)
- Modify: `branding/src/m3/search-filter.css` (`40vh` → `40dvh`)
- Copies (regenerated): `upstream/web/static/mobile-shell.css`, plus the copies of the four overrides and two specs under `upstream/web/src/lib/…`

**Interfaces:**
- Consumes: none. Edits are anchored on text because Tasks 1, 3 and 5 edit `mobile-shell.css` and Task 3 edits `search-filter.css`.
- Produces: `PhotoBlurBackdrop` prop `peek?: boolean` (default `false`).

- [ ] **Step 1: Write the failing test.**

  `overrides/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts`:
  ```ts
  import { render } from '@testing-library/svelte';
  import { initAppConfig } from '@photo-gallery/config';
  import { assetFactory } from '@test-data/factories/asset-factory';
  import PhotoBlurBackdrop from './PhotoBlurBackdrop.svelte';

  describe('PhotoBlurBackdrop', () => {
    beforeAll(() => {
      initAppConfig({});
    });

    it('keeps the 48px blur layer for the current asset', () => {
      const { container } = render(PhotoBlurBackdrop, { props: { asset: assetFactory.build({ thumbhash: null }) } });

      expect(container.querySelector('[style*="blur(48px)"]')).not.toBeNull();
    });

    it('renders no blur layer and no image for swipe peeks', () => {
      const { container } = render(PhotoBlurBackdrop, {
        props: { asset: assetFactory.build({ thumbhash: null }), peek: true },
      });

      expect(container.querySelector('[style*="blur("]')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
    });
  });
  ```

  `overrides/lib/components/shared-components/EmptyPlaceholder.spec.ts`:
  ```ts
  import { render } from '@testing-library/svelte';
  import EmptyPlaceholder from './EmptyPlaceholder.svelte';

  describe('EmptyPlaceholder', () => {
    it('reserves the 3:2 image box before the SVG loads', () => {
      const { container } = render(EmptyPlaceholder, { props: { text: 'Nothing here' } });

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('width', '500');
      expect(img).toHaveAttribute('height', '333');
      expect(img).toHaveClass('h-auto');
    });
  });
  ```
  The CSS-only parts get grep checks:
  ```bash
  grep -n "backdrop-filter" custom/src/styles/mobile-shell.css
  grep -n "html\[data-search-filter-modal='open'\] \[data-dialog-content\]" overrides/lib/modals/SearchFilterModal.svelte
  grep -n "40vh" branding/src/m3/search-filter.css
  ```
- [ ] **Step 2: Run it, expect FAIL.**
  ```bash
  bash scripts/prepare-custom.sh
  pnpm --filter immich-web exec vitest run src/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts src/lib/components/shared-components/EmptyPlaceholder.spec.ts
  ```
  Expected failures:
  - PhotoBlurBackdrop, peek case: `expected <div …> to be null`, because `peek` is ignored.
  - EmptyPlaceholder: `Expected the element to have attribute: height="333"`.

  Greps before the change:
  - `backdrop-filter` prints 6 lines: header, nav and favorites popup, two each.
  - the `[data-dialog-content]` grep prints 2 lines, because the selector does not yet use `:has(`;
  - `40vh` prints 1 line.
- [ ] **Step 3: Implement.**

  `overrides/lib/components/asset-viewer/PhotoBlurBackdrop.svelte`. Full new content:
  ```svelte
  <script lang="ts">
    import Image from '$lib/components/Image.svelte';
    import Thumbhash from '$lib/components/Thumbhash.svelte';
    import { getAssetUrls } from '$lib/utils';
    import { networkManager } from '$lib/utils/mobile-performance.svelte';
    import type { AssetResponseDto, SharedLinkResponseDto } from '@immich/sdk';

    interface Props {
      asset: AssetResponseDto;
      sharedLink?: SharedLinkResponseDto;
      /** Ảnh kề khi vuốt: chỉ thumbhash, không lớp blur 48px — tránh 3 lớp blur full-viewport cùng lúc */
      peek?: boolean;
    }

    let { asset, sharedLink, peek = false }: Props = $props();

    const urls = $derived(getAssetUrls(asset, sharedLink));
    // Chỉ tải thumbnail làm nền blur khi mạng nhanh; mạng chậm / save-data dùng thumbhash
    const showPhotoBlur = $derived(!peek && networkManager.quality === 'fast');
  </script>

  <div class="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
    {#if peek}
      {#if asset.thumbhash}
        <Thumbhash base64ThumbHash={asset.thumbhash} class="absolute inset-0 size-full" />
      {/if}
    {:else}
      <div class="absolute -inset-[22%] saturate-150" style="filter: blur(48px); transform: translateZ(0);">
        {#if asset.thumbhash}
          <Thumbhash base64ThumbHash={asset.thumbhash} class="absolute inset-0 size-full" />
        {/if}
        {#if showPhotoBlur}
          <Image src={urls.thumbnail} alt="" class="absolute inset-0 size-full object-cover" draggable="false" />
        {/if}
      </div>
    {/if}
    <div class="absolute inset-0 bg-black/40"></div>
  </div>
  ```

  `overrides/lib/components/asset-viewer/PhotoSwipePeek.svelte`: `  <PhotoBlurBackdrop {asset} {sharedLink} />` → `  <PhotoBlurBackdrop {asset} {sharedLink} peek />`

  `custom/src/styles/mobile-shell.css`. Header, inside `html[data-mobile-shell] #dashboard-navbar`:
  ```css
    background-color: color-mix(in srgb, var(--md-sys-color-surface) 82%, transparent);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 0 !important;
  ```
  →
  ```css
    /* Nội dung không cuộn dưới header (header là flex sibling của vùng cuộn) — nền đặc, bỏ blur tốn GPU */
    background-color: var(--md-sys-color-surface);
    border-bottom: 0 !important;
  ```
  Bottom nav, inside `.pg-mobile-bottom-nav`:
  ```css
    background-color: color-mix(in srgb, var(--md-sys-color-surface) 78%, transparent);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 55%, transparent);
  ```
  →
  ```css
    /* .pg-mobile-content dừng ở --mobile-bottom-nav-offset nên không có gì cuộn dưới nav — nền đặc, bỏ blur */
    background-color: var(--md-sys-color-surface);
    border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 55%, transparent);
  ```
  Leave `.pg-mobile-favorites-menu` alone; it floats over scrolling content.

  `overrides/lib/components/shared-components/EmptyPlaceholder.svelte`:
  ```svelte
    <img {src} alt="" width="500" draggable="false" class="max-w-full" />
  ```
  →
  ```svelte
    <!-- width/height theo tỉ lệ 900×600 của các empty-*.svg: giữ chỗ trước khi ảnh tải (tránh CLS) -->
    <img {src} alt="" width="500" height="333" draggable="false" class="h-auto max-w-full" />
  ```
  Every SVG passed today is 900×600 (`upstream/web/src/lib/assets/empty-{1..5,folders,workflows}.svg`). A caller passing a different `src` ratio still gets the correct height after load, because of `h-auto`.

  `overrides/lib/modals/SearchFilterModal.svelte`:
  ```css
      :global(html[data-search-filter-modal='open'] [data-dialog-content]) {
  ```
  →
  ```css
      /* Chỉ dialog chứa modal lọc — không ép fullscreen dialog khác mở chồng lên */
      :global(html[data-search-filter-modal='open'] [data-dialog-content]:has(.ant-search-filter-modal)) {
  ```
  ```css
      :global(html[data-search-filter-modal='open'] [data-dialog-content] > div) {
  ```
  →
  ```css
      :global(html[data-search-filter-modal='open'] [data-dialog-content]:has(.ant-search-filter-modal) > div) {
  ```
  `[Inference]`: `:has()` needs Safari 15.4+, Chrome 105+ or Firefox 121+. On older browsers the filter modal falls back to the centred card from the non-mobile rule.

  `branding/src/m3/search-filter.css`: `    max-height: min(40vh, 18rem);` → `    max-height: min(40dvh, 18rem);`
- [ ] **Step 4: Regenerate copies.** Run `bash scripts/prepare-custom.sh`, then `git status --short`. Expected:
  ```
   M branding/src/m3/search-filter.css
   M custom/src/styles/mobile-shell.css
   M overrides/lib/components/asset-viewer/PhotoBlurBackdrop.svelte
   M overrides/lib/components/asset-viewer/PhotoSwipePeek.svelte
   M overrides/lib/components/shared-components/EmptyPlaceholder.svelte
   M overrides/lib/modals/SearchFilterModal.svelte
   M upstream/web/src/lib/components/asset-viewer/PhotoBlurBackdrop.svelte
   M upstream/web/src/lib/components/asset-viewer/PhotoSwipePeek.svelte
   M upstream/web/src/lib/components/shared-components/EmptyPlaceholder.svelte
   M upstream/web/src/lib/modals/SearchFilterModal.svelte
   M upstream/web/static/mobile-shell.css
  ?? overrides/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts
  ?? overrides/lib/components/shared-components/EmptyPlaceholder.spec.ts
  ?? upstream/web/src/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts
  ?? upstream/web/src/lib/components/shared-components/EmptyPlaceholder.spec.ts
  ```
- [ ] **Step 5: Verify.**
  - Re-run the Step 2 vitest command. Expect PASS.
  - Greps:
    - `backdrop-filter` should now print exactly 2 lines, both inside `.pg-mobile-favorites-menu`;
    - `grep -c ":has(.ant-search-filter-modal)" overrides/lib/modals/SearchFilterModal.svelte` should print `2`;
    - `40vh` should print nothing.
  - `pnpm --filter immich-web exec svelte-check`: no new errors over 30/1.
  - `pnpm --filter immich-web exec eslint --max-warnings 0 src/lib/components/asset-viewer/PhotoBlurBackdrop.svelte src/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts src/lib/components/asset-viewer/PhotoSwipePeek.svelte src/lib/components/shared-components/EmptyPlaceholder.svelte src/lib/components/shared-components/EmptyPlaceholder.spec.ts src/lib/modals/SearchFilterModal.svelte`
  - Manual check on a phone `[Unverified until run]`: swiping between photos still shows a dark thumbhash behind the neighbouring photos. The header and bottom nav are opaque surfaces with no visual gap.
- [ ] **Step 6: Commit.**
  ```bash
  git add overrides/lib/components/asset-viewer/PhotoBlurBackdrop.svelte overrides/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts overrides/lib/components/asset-viewer/PhotoSwipePeek.svelte \
    upstream/web/src/lib/components/asset-viewer/PhotoBlurBackdrop.svelte upstream/web/src/lib/components/asset-viewer/PhotoBlurBackdrop.spec.ts upstream/web/src/lib/components/asset-viewer/PhotoSwipePeek.svelte \
    custom/src/styles/mobile-shell.css upstream/web/static/mobile-shell.css \
    overrides/lib/components/shared-components/EmptyPlaceholder.svelte overrides/lib/components/shared-components/EmptyPlaceholder.spec.ts \
    upstream/web/src/lib/components/shared-components/EmptyPlaceholder.svelte upstream/web/src/lib/components/shared-components/EmptyPlaceholder.spec.ts \
    overrides/lib/modals/SearchFilterModal.svelte upstream/web/src/lib/modals/SearchFilterModal.svelte \
    branding/src/m3/search-filter.css
  git commit -m "$(cat <<'EOF'
  perf(ui): giảm blur trong viewer và shell, chống CLS EmptyPlaceholder, thu hẹp selector modal lọc

  - Ảnh kề khi vuốt chỉ vẽ thumbhash (bỏ 2 lớp blur 48px full-viewport); ảnh blur nền chỉ tải khi mạng nhanh
  - Header và bottom nav mobile dùng nền đặc, bỏ backdrop-filter vì không có nội dung cuộn bên dưới
  - EmptyPlaceholder có height để giữ chỗ (tỉ lệ 3:2)
  - Rule fullscreen của modal lọc chỉ áp cho dialog chứa .ant-search-filter-modal
  - Lưới người trong modal lọc: 40vh -> 40dvh

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  )"
  ```
