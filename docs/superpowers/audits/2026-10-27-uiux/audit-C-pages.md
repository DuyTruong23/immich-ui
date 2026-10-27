# Audit C — custom pages (read-only, code-only; no device/browser run)

Paths are relative to `D:\Personal\Coding\Immich-gallery\immich-ui`. Anything I could not confirm from code is labelled `[Inference]`.

Counts: High 2, Medium 12, Low 12.

---

## HIGH

### [High] Upload panel / progress bubble sits under the gallery FAB cluster on mobile
- Where: `custom/src/routes/UploadPanel.svelte:77-79`, `custom/src/styles/mobile-shell.css:132-138`, `custom/src/components/FeatureUpdatePin.svelte:159-163`
- Device: mobile (also desktop for non-admin users)
- Evidence:
  - UploadPanel: `class="fixed z-60 {isMobilePanel ? 'pg-upload-panel-mobile inset-x-3' : 'inset-e-16 bottom-6'}"`
  - mobile-shell.css: `html[data-mobile-shell] .pg-upload-panel-mobile { bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem); }` and `html[data-mobile-shell] .pg-gallery-fabs { bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem); }`
  - FeatureUpdatePin: `.pg-gallery-fabs { position: fixed; right: max(1rem,...); z-index: 80; }`
- Problem: Both elements use the identical bottom offset and the FAB cluster has z-80 vs the panel's z-60. The FAB cluster is shown whenever `isMobileShell() || !isAdmin` and no viewer is open, so it is present during uploads. On mobile it covers the collapsed 64px upload bubble (`ms-auto w-fit`, right-aligned) and the bottom-right of the expanded panel, including the last item. On desktop non-admin users (what's-new pin plus "+" FAB at right 1rem / bottom 1rem) it overlaps the panel at `inset-e-16 bottom-6`. [Inference] on exact overlap extents; the shared bottom value and z-index are in code.
- Fix: Stack them in one flex column container, or raise the panel offset by the FAB height (e.g. `bottom: calc(var(--mobile-bottom-nav-offset) + 0.75rem + 3.5rem)`). Alternatively hide `.pg-gallery-fabs` while `$isUploading` (set a `data-uploading` attr on `<html>`). Keep the panel above the FABs (`z-81`) if it must overlap.

### [High] Login: delayed "readonly" anti-autofill trick likely blocks the keyboard on iOS
- Where: `custom/src/routes/auth/login/+page.svelte:63-73`, `:394-395`, `:421-423`
- Device: mobile (iOS Safari / PWA)
- Evidence:
  - `autofillUnlockTimer = setTimeout(() => { ... unlockAutofill(); }, 200);`
  - `readonly={blockAutofill}` and `onfocus={scheduleUnlockAutofill}`
- Problem: Inputs are `readonly` on focus, and the attribute is removed only 200 ms later (or on the first keydown, which never fires if no keyboard appears). [Inference] iOS Safari does not open the on-screen keyboard for a field that was readonly at focus time, so the user has to tap again; some Android keyboards behave similarly. The commonly used snippet removes `readonly` synchronously in `onfocus`/`onpointerdown`.
- Fix: On touch (`pointerType !== 'mouse'`) call `unlockAutofill(event)` synchronously in `onfocus`/`onpointerdown`, or drop the readonly trick on coarse pointers (`mediaQueryManager.pointerCoarse`). `autocomplete="off"` plus the `data-*-ignore` attributes already cover password managers.

---

## MEDIUM

### [Medium] Login inputs defeat OS/browser input assistance and rely on a non-standard mask
- Where: `custom/src/routes/auth/login/+page.svelte:384-388`, `:410-416`, `:486-488`
- Device: mobile / all
- Evidence: `type="text" ... autocomplete="nope"` (email); `type="text" ... autocomplete="nope"` (password) with `:global(.pg-login-password-masked input) { -webkit-text-security: disc; }`
- Problem:
  - No `inputmode="email"` / `enterkeyhint="go"` / `enterkeyhint="next"`, so the email keyboard has no "@" key and the return key says "return".
  - `autocomplete="nope"` is not a valid token.
  - The password is `type="text"`, so screen readers, spellcheck/keyboard predictions and clipboard managers treat it as plain text.
  - [Inference] `-webkit-text-security` is WebKit/Blink-only, so Firefox may show the password in clear text.
  - Enter is handled by a keydown on a non-`<form>` (lines 286-298), so there is no native "Go" submit semantic.
- Fix: Use `inputmode="email"`, `enterkeyhint="next"` on email and `enterkeyhint="go"` on password. Use real `type="password"` (toggle to `text`) and accept manager prompts, or at minimum `autocomplete="off"`. Wrap in a `<form onsubmit>`.

### [Medium] Maintenance / stale-chunk page clips its top content in short viewports
- Where: `custom/src/styles/custom.css:64-93`
- Device: mobile landscape (≈360–430px high), small-height windows
- Evidence: `.pg-maintenance { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; ... overflow: auto; }`
- Problem: `align-items: center` with `overflow: auto` makes content taller than the viewport overflow equally at the top, where it cannot be scrolled to. Content is title + description + a 22rem-wide art (`.pg-maintenance__art`, `margin: 2rem auto 0`), roughly 400px+ high, so in landscape phones the title is unreachable. [Inference] on exact heights.
- Fix: Use `align-items: safe center`, or `margin-block: auto` on `.pg-maintenance__content` with `align-items: flex-start`. Hide the art with `@media (max-height: 480px) { .pg-maintenance__art { display: none; } }`.

### [Medium] Blocked page is hard-coded white and uses `100vh`
- Where: `custom/src/routes/(user)/blocked/+page.svelte:5-7`
- Device: mobile + dark mode
- Evidence: `<div class="flex h-screen w-full items-center justify-center bg-white">` and `class="text-2xl font-semibold text-gray-800"`
- Problem: White flash / unreadable-by-theme page in dark mode. `h-screen` (100vh) exceeds the visible viewport on iOS/Android address-bar browsers, so the page scrolls. There is no way out (logout) for the blocked user.
- Fix: Use `min-h-dvh bg-(--md-sys-color-surface) text-(--md-sys-color-on-surface)`, and add a sign-out link (`Route.logout()`).

### [Medium] Albums toolbar buttons have no accessible name below `md`
- Where: `custom/src/routes/(user)/albums/AlbumsControls.svelte:196-204`, `:266-284`
- Device: mobile / tablet portrait <768
- Evidence: `<Button leadingIcon={mdiPlusBoxOutline} ... size="small" ...><p class="hidden md:block">{$t('create_album')}</p></Button>` (same for `<Text class="hidden md:block">{$t('covers')}</Text>`)
- Problem: `hidden` is `display:none`, so below 768px the button is an icon-only control with an empty accessible name. `size="small"` ghost buttons are also below 44px. A `<p>` inside `<button>` is invalid HTML.
- Fix: Add `aria-label={$t('create_album')}` / `title` to the Button, use `<span class="max-md:sr-only">` instead of `hidden md:block`, and use `size="medium"` on touch.

### [Medium] Album table row: not keyboard operable, context menu unreachable on iOS touch
- Where: `overrides/lib/components/album-page/AlbumsTableRow.svelte:459-463`, `:453-456`
- Device: all (keyboard), iOS touch
- Evidence: `<tr class="... hover:cursor-pointer ..." onclick={() => goto(Route.viewAlbum(album))} {oncontextmenu}>`
- Problem: Row navigation is a click handler on `<tr>` with no `tabindex`, `role="link"`, or key handler, and there is no inner `<a>`, so it is not focusable and not announced. The only context menu is `oncontextmenu`. [Inference] iOS Safari does not fire `contextmenu` on long-press, so list-mode album actions are unavailable there. `hover:border-immich-primary/75` is the only hover affordance.
- Fix: Wrap the name cell content in `<a href={Route.viewAlbum(album)}>` (keep the `tr` click as a convenience), add `tabindex="0"` + Enter handler, and add a visible "more" IconButton that calls `showContextMenu` for touch.

### [Medium] Admin users / library tables drop data on phones, and hide stats on tablets
- Where: `custom/src/routes/admin/users/(list)/+layout.svelte:85-90`, `custom/src/routes/admin/library-management/(list)/+layout.svelte:191-198`
- Device: mobile, tablet portrait
- Evidence:
  - users: `column2: 'hidden md:block md:w-5/12 lg:w-4/12'` (email), `column3: 'hidden lg:block lg:w-2/12'` (quota)
  - libraries: `column2: 'hidden md:block ...'` (owner), `column3: 'hidden lg:block lg:w-1/12'` (photos), `column4: 'hidden lg:block lg:w-1/12'` (videos), `column5: 'hidden md:block md:w-2/12'` (size)
- Problem: On <768 the user list shows only the name (two users with the same name are indistinguishable; email only visible after opening the detail), and the library list shows only name + menu (owner, counts, size are hidden). Photos/videos stay hidden through the whole tablet range up to 1023px. There is no secondary line (e.g. email under name) as a mobile fallback.
- Fix: Add a secondary line in `column1` for mobile (`<span class="block text-xs text-(--md-sys-color-on-surface-variant) md:hidden">{user.email}</span>`; owner + size for libraries) and show counts from `md`.

### [Medium] Dashboard stat icons/status pill use `-400` palette tones that fail contrast on light theme
- Where: `custom/src/routes/(user)/dashboard/+page.svelte:241-244`, `:255-257`, `:383`
- Device: all (light theme)
- Evidence: `sky: 'bg-sky-500/10 text-sky-400'`, `'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'`, `text-amber-400`
- Problem: The Tailwind `*-400` shades on near-white surfaces are roughly 1.7–2.5:1, below 3:1 (icons) and 4.5:1 (the 14px "Server online/offline" text). These only look fine on dark.
- Fix: Pair with theme variants, e.g. `text-emerald-700 dark:text-emerald-400` (as `login/+page.svelte:305` and `shared-favorites ... :429` already do for amber).

### [Medium] Shared-favorites: 32px remove button over thumbnails and ~32px filter chips
- Where: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte:476-478`, `:437-441`
- Device: mobile
- Evidence: `class="absolute top-2 end-2 z-20 flex size-8 ... rounded-full bg-black/60 ..."`; chips `class="rounded-full border px-3 py-1.5 text-sm ..."`
- Problem: The remove (X) button is 32×32 and permanently overlays the top-right of every thumbnail; with `gridDensityManager.columns` up to 6 (`GRID_COLUMNS_MAX = 6` in upstream grid-density store) cells are ~55px, so the X occupies over half the thumbnail width and is easy to hit by accident instead of opening the asset. Filter chips are ~32px high and have no `aria-pressed`.
- Fix: Make the hit area 44px with a smaller visible disc (`before:absolute before:-inset-2`), or only show X in a selection/edit mode on touch. Chips: `min-h-11`, `aria-pressed={filter === item.id}`.

### [Medium] Upload panel renders full-width on tablets / iPad landscape
- Where: `custom/src/routes/UploadPanel.svelte:25`, `:77-79`, `:84-86`
- Device: tablet
- Evidence: `const isMobilePanel = $derived(mediaQueryManager.pointerCoarse || mediaQueryManager.maxMd);` then `'pg-upload-panel-mobile inset-x-3'` and `'w-full max-w-full'`
- Problem: Any touch-primary device (iPad at 1024/1180/1366px wide) gets the phone layout: a panel spanning almost the entire viewport width with `max-h-[min(70dvh,32rem)]`, covering the timeline. Desktop gets a 20rem card. There is no intermediate size.
- Fix: Use `max-w-md ms-auto` (or `md:w-96`) in the `isMobilePanel` branch when `!mediaQueryManager.maxMd`; reserve full-width only for `maxMd`.

### [Medium] Upload bubble buttons have no accessible names; badge sizing is broken
- Where: `custom/src/routes/UploadPanel.svelte:175-202`
- Device: all (a11y), mobile (touch)
- Evidence: `<button type="button" ... class="absolute -inset-s-4 -top-4 flex size-10 ... p-5 text-xs text-light">{$remainingUploads...}</button>` and the 64px `size-16` button wrapping only `<Icon ...>`
- Problem: The three collapsed-state buttons (remaining count, error count, expand icon) have no `aria-label`; the icon button has no text at all. The badge buttons combine `size-10` (40px) with `p-5` (20px each side), leaving a 0px content box so the count can overflow its circle. The badges are 40px, below 44px and offset outside the wrapper (`-top-4`), so they can be clipped by the FAB overlap above.
- Fix: Add `aria-label={$t('upload_progress', ...)}` / `$t('upload_status_errors')`; drop `p-5` and use `grid place-items-center`.

### [Medium] Feature-update modal: short landscape phones ≥768px wide and soft keyboard
- Where: `custom/src/routes/FeatureUpdateModal.svelte:480-485`, `:487-512`, `:533-553`
- Device: mobile landscape, mobile with keyboard
- Evidence: `max-height: min(88dvh, 640px)` (desktop rule), full-screen rule only inside `@media (max-width: 767px)`; `.feature-updates-section--scroll { flex: 1 1 auto; min-height: 0; ... overflow-y: auto; }`; body `overflow: hidden`
- Problem:
  - Phones in landscape are ≥ 768 wide (e.g. 844×390), so they get the 88dvh (≈340px) card, with header, intro, feedback textarea + email field and footer all `flex-shrink: 0`. The updates list (`min-height: 0`) collapses to a few pixels or nothing.
  - [Inference] `dvh` does not shrink for the virtual keyboard on iOS and Chrome Android (default `resizes-visual`), so with 100dvh full-screen the footer buttons / email field can sit under the keyboard while `.feature-update-body` is `overflow: hidden`.
- Fix: Add `@media (max-height: 500px)` to apply the fullscreen rules and let `.feature-update-body` scroll (`overflow-y: auto`) instead of only the list; set `interactive-widget=resizes-content` in the viewport meta, or use `visualViewport` height for the modal.

### [Medium] Login: `autocomplete`/zoom behavior depends on upstream viewport hack
- Where: `custom/src/routes/auth/login/+page.svelte:382-398` (Input without `size`), `@immich/ui` Input default
- Device: mobile
- Evidence: `Input` default `size = initialSize ?? labelProps.size ?? 'small'`, and `small: 'text-sm'` (14px) in `@immich/ui` 0.83.0 `dist/styles.js`; `upstream/web/src/app.html:10` has `maximum-scale=1, user-scalable=no`
- Problem: The login (and feature-update email) inputs are 14px, which would zoom on focus in iOS Safari. It is only avoided because of `maximum-scale=1`, which also blocks pinch zoom for low-vision users (WCAG 1.4.4). [Inference] this is the current mitigation; it makes the inputs fragile if the viewport meta is ever relaxed.
- Fix: Pass `size="medium"` (text-base, 16px) to the login inputs, `FeatureUpdateModal` email Input (`:415`), and drop `user-scalable=no` / `maximum-scale=1`.

---

## LOW

### [Low] Albums expand/collapse-all controls only exist at `xl`
- Where: `custom/src/routes/(user)/albums/AlbumsControls.svelte:235`
- Device: mobile / tablet / <1280 laptop
- Evidence: `<div class="hidden gap-0 xl:flex">` around the expand/collapse IconButtons
- Problem: When grouping by year/owner, there is no way to expand/collapse all below 1280px. Filter + search for <xl are duplicated in `albums/+page.svelte:33-45` but these two buttons are not.
- Fix: Move them into the `xl:hidden` block in `+page.svelte`, or show from `md`.

### [Low] Album list name cell: `text-ellipsis` has no effect
- Where: `overrides/lib/components/album-page/AlbumsTableRow.svelte:464`, `:479`, `:482`, `:485`
- Device: mobile
- Evidence: `class="text-md w-8/12 items-center text-start text-ellipsis sm:w-4/12 ..."`
- Problem: `text-overflow` needs `overflow: hidden; white-space: nowrap`; long album names wrap and make rows uneven. Widths also sum to 105% at `xl` (`xl:w-[30%]` + 5×`xl:w-[15%]`).
- Fix: Add `truncate` (or `min-w-0 truncate`) and `xl:w-[25%]` for the name.

### [Low] Explore "recently added" strip: fixed height, images without dimensions
- Where: `custom/src/routes/(user)/explore/[[photos=photos]]/[[assetId=id]]/+page.svelte:266-277`
- Device: all
- Evidence: `<div class="flex h-24 max-w-fit flex-wrap gap-x-1 overflow-hidden md:h-42">` ... `<img ... class="size-full min-w-max rounded-xl object-cover" />`
- Problem: Items are `flex-auto` with `min-w-max` and no width/height/aspect-ratio, so widths come from natural image size and the row reflows as thumbnails load (CLS); there is no `loading="lazy"`/`decoding="async"`. `max-w-fit` leaves the strip ragged on wide screens.
- Fix: Give buttons `aspect-square`/`w-24 md:w-42`, add `loading="lazy" decoding="async"` and `width`/`height`.

### [Low] Explore: person names and "view all" links
- Where: `explore/.../+page.svelte:215`, `:193-197`
- Device: mobile
- Evidence: `<p class="mt-2 text-sm font-medium text-ellipsis dark:text-white">`; `class="pe-4 text-sm font-medium ..."`
- Problem: `text-ellipsis` without `truncate` doesn't truncate; "view all" links are ~20px tall touch targets.
- Fix: `truncate`; add `py-2 -my-2` or `min-h-11 inline-flex items-center` to the links.

### [Low] Dashboard heatmap likely renders ~5px cells at 360px
- Where: `custom/src/routes/(user)/dashboard/+page.svelte:326-331`, `upstream/web/src/lib/components/CalendarHeatmap.svelte:58-78`
- Device: mobile
- Evidence: wrapper `<div class="overflow-x-auto">` around a `grid grid-flow-col grid-rows-7 gap-0.5` whose cells are `aspect-square size-full`
- Problem: [Inference] 52–53 week columns in ~280px of content width give ~4–5px cells; the `overflow-x-auto` wrapper probably never scrolls because columns shrink to fit. Not tappable/legible on phones; `title`/tooltips are hover-only.
- Fix: Give the heatmap inner grid `min-width: 52 * 12px` (or a `min-w-[40rem]`) so the `overflow-x-auto` actually scrolls, and scroll to the end (latest weeks) on mount.

### [Low] Dashboard: storage header and wide layout
- Where: `custom/src/routes/(user)/dashboard/+page.svelte:283-292`, `:264`, `:267`
- Device: mobile, ≥1536
- Evidence: `<div class="mb-4 flex items-end justify-between gap-4">`; `mx-auto max-w-6xl`; `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`
- Problem: Header has no `flex-wrap`, so the "Media: x" label squeezes the title block at 360px. Page is capped at `max-w-6xl` (1152px) so at ≥1536 there are large empty gutters; the grid has no `2xl` step. The 2-col → 4-col jump is only at `xl` (content ≈1024px after sidebar), so 768–1279 shows 2×2 which is fine.
- Fix: `flex-wrap` on the header; `2xl:max-w-7xl`.

### [Low] Hard-coded Vietnamese strings bypass i18n
- Where: `custom/src/routes/(user)/dashboard/+page.svelte:234-237`, `:260`, `:265`, `:285`, `:314`, `:342`; `custom/src/routes/ErrorLayout.svelte:37-41`; `custom/src/routes/(user)/more/+page.svelte:355`; `custom/src/routes/(user)/user-settings/AppSettings.svelte:165`; `custom/src/routes/(user)/blocked/+page.svelte:54`
- Device: all
- Evidence: `{ label: 'Ảnh', ...}`, `<h1 class="pg-maintenance__title">Đang tải bản mới</h1>`, `title: 'Dashboard'`
- Problem: Locale switch (en/vi) leaves these strings static, inconsistent with `MaintenancePage` which uses `$t('pg_maintenance_*')`. `dashboard` also formats numbers with a fixed `'vi-VN'` rather than `$locale`.
- Fix: Move to `$t()` keys; use `$locale` for `toLocaleString`.

### [Low] Small touch targets in feature-update UI and shared-link expiration
- Where: `custom/src/components/FeatureUpdatePin.svelte:240-248`, `custom/src/routes/FeatureUpdateModal.svelte:570-577`, `overrides/lib/components/SharedLinkExpiration.svelte:523-527`, `custom/src/styles/custom.css:145-154`, `overrides/lib/components/user-settings-page/DeviceCard.svelte:81-89`
- Device: mobile
- Evidence:
  - `.pg-whats-new-pin__dismiss { width: 1.75rem; height: 1.75rem; min-width: 1.75rem; ... }` (28px)
  - `.feature-update-notify-change { padding: 0; font-size: 0.8125rem; line-height: 1.4; ... }` (~18px)
  - `<Button size="tiny" variant={...}>` expiration presets
  - `.pg-stale-chunk-reload { padding: 0.625rem 1.25rem; font-size: 0.9375rem; }` (~38px)
  - DeviceCard `<IconButton ... size="small" aria-label={$t('log_out')}>`
- Problem: All below 44px (the dismiss and presets are also adjacent to other controls, so mis-taps are likely). 28px dismiss passes WCAG 2.5.8 (24px) but fails Apple HIG.
- Fix: Extend hit areas with `padding`/`::before { inset: -8px }` or `min-height: 44px` under `@media (pointer: coarse)`; use `size="medium"` on touch.

### [Low] Gallery FAB cluster: physical `right`, wrong group label, hover-gated hint
- Where: `custom/src/components/FeatureUpdatePin.svelte:107`, `:161`, `:169`
- Device: all
- Evidence: `<div class="pg-gallery-fabs" role="group" aria-label={$t('upload')}>`; `right: max(1rem, env(safe-area-inset-right, 0px));`; `max-width: calc(100vw - 2rem);`
- Problem: Group is labelled "upload" but also holds the What's-new pin; `right` is physical (RTL), and `100vw` ignores safe-area insets; `.pg-whats-new-pin__label` ellipsizes on narrow widths without a tooltip.
- Fix: `inset-inline-end`, `max-width: calc(100% - 2rem)`, drop the group label or use a neutral one.

### [Low] Shared-favorites: whole-list render, hover-only avatar tooltips, wide-screen columns
- Where: `custom/src/routes/(user)/shared-favorites/[[photos=photos]]/[[assetId=id]]/+page.svelte:465-498`, `:486-495`, `:458`
- Device: mobile, ≥1536
- Evidence: `{#each displayItems as item (item.assetId)}` ... `title={$t('shared_favorites_liked_by', ...)}`; `xl:grid-cols-6`
- Problem: [Inference] No virtualization, so thousands of favorites mount thousands of Thumbnail components plus 6-wide `getAssetInfo` batches on mount (lines 186-216). "Liked by" info is `title=` only (invisible on touch) and the avatar stack is `pointer-events-none`. Desktop grid stops at 6 columns so cells grow to ~280px at 1920 wide.
- Fix: Window the list (IntersectionObserver / content-visibility: auto on cells); add `2xl:grid-cols-8`; expose "liked by" via the asset viewer or an `aria-label`.

### [Low] Long emails/paths not wrapped in admin lists
- Where: `custom/src/routes/admin/feature-updates/+page.svelte:474`
- Device: mobile
- Evidence: `<li class="rounded-lg bg-(--md-sys-color-surface-container) px-3 py-2">{email}</li>`
- Problem: Long addresses can overflow the card horizontally (no `break-all`/`min-w-0`).
- Fix: Add `break-all`.

### [Low] Misc a11y / semantics
- Where: `custom/src/components/MaintenancePage.svelte:25` (`role="alert" aria-live="polite"` conflict), `custom/src/routes/auth/onboarding/OnboardingTheme.svelte:383-411` (theme buttons without `aria-pressed`), `custom/src/routes/UploadPanel.svelte:151` (`aria-labelledby={$t('upload_concurrency')}` references a non-existent id), `custom/src/routes/(user)/favorites/.../+page.svelte:159` (`title=` only conveys the share toggle subtitle), `custom/src/routes/admin/users/(list)/+layout.svelte:44` (access token sent in query string: `'/api/admin-block-user?list=1&accessToken=' + ...`)
- Device: all
- Problem: Redundant/conflicting live-region roles; toggle-like buttons with no pressed state; invalid ARIA id reference; hover-only help text; bearer token in URL ends up in server/proxy logs and history (privacy; use an `Authorization` header like `login/+page.svelte:127`).
- Fix: Use `role="alert"` only; add `aria-pressed`; `aria-labelledby="upload-concurrency-label"` or drop it; show subtitle as visible helper text on touch; send token via header.

---

## Checked, no issue
- `custom/src/routes/ErrorLayout.svelte`, `MaintenancePage.svelte`, `ServerConnectionErrorPage.svelte`, `error-page/+page.svelte`: safe-area padding and `100dvh` present (`custom.css:64-93`), fluid `clamp()` typography, 480/360px breakpoints.
- `overrides/lib/components/pages/SharedLinkErrorPage.svelte`: `h-dvh`, `px-4`, fine.
- Reduced motion: global rule at `custom/src/styles/custom.css:57-62` neutralizes the Feature-update modal keyframes, skeleton shimmer (`library-management/(list)/+layout.svelte:308`) and `animate-pulse` on the upload bubble; `FeatureUpdateModal.svelte:245` also short-circuits close.
- Feature-update modal on phones <768: fullscreen with `env(safe-area-inset-*)` and `100dvh` (`FeatureUpdateModal.svelte:487-512`); the `[data-dialog-*]` selectors match bits-ui Dialog (used by `@immich/ui` 0.83.0 `Modal.svelte:119-131`).
- Modal bottom nav handling: `mobile-shell.css:140-150` hides `.pg-mobile-bottom-nav` and `.pg-gallery-fabs` when a dialog overlay is open.
- `/more` page: rows `min-height: 44px`, safe-area bottom padding (`mobile-shell.css:116-118`, `:293-391`), email truncates.
- Login page layout (`AuthPageLayout.svelte`): `min-h-dvh`, `m-2`, `max-w-xl`; buttons `size="large"` full width; show/hide password button has `aria-label`.
- Library detail page (`admin/library-management/[id]/+layout.svelte`): table rows collapse to block layout below `md` (`block py-3 md:table-row`), `break-all` on paths, stats cards `sm:flex-row`.
- `explore`/`favorites` pages use shared `Timeline`/`SingleGridRow` with `UserPageLayout` content area offset above the bottom nav (`.pg-mobile-content { bottom: var(--mobile-bottom-nav-offset) }`).
- `UserSettingsList.svelte` / `AppSettings.svelte`: single-column `Field`/`Switch` layout, `sm:ms-8` only; no overflow.
- `MemoryVideoViewer.svelte`: `playsinline`, `preload="metadata"`, poster present.
- `FeatureUpdateOnLogin.svelte`, `FeatureUpdateOnLogin` logic: no UI.
- `--pg-*` tokens used by dashboard/shared-favorites are defined in `branding/src/m3/immich-bridge.css:48-55,117-124` for both themes.
