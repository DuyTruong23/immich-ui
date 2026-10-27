# Audit A — App shell & navigation

Scope read: overrides layouts (User/Admin/Auth), NavigationBar, SearchBar, UserSidebar, BottomInfo, Sidebar, MobileBottomNav, MobileBackGuard, SwipeBackEdge, MobileThumbnailHint, FullScreenLoadingOverlay, EmptyPlaceholder, UserAvatar, BrandLogo, branding navigation.css / component-overrides.css / immich-bridge.css, plus custom/src/styles/mobile-shell.css (where all `pg-mobile-*` CSS actually lives).
Note: `isMobileShell()` = `!isFullSidebar && signedIn() && !pathname.startsWith('/admin')` (custom/src/utils/capabilities.svelte.ts:54-55). Upstream `isFullSidebar` breakpoint = 850px (`--breakpoint-sidebar: 850px`, upstream/web/src/app.css:33).

## Medium

### [Medium] Bottom-nav labels are `display:none` in landscape, leaving icon-only links with no accessible name
- Where: custom/src/styles/mobile-shell.css:408-410 (markup: overrides/lib/components/mobile/MobileBottomNav.svelte:187-198)
- Device: mobile (landscape phones, height <= 500px)
- Evidence: `.pg-mobile-bottom-nav__label { display: none; }` ; the `<a>`/`<button>` has only `<span class="pg-mobile-bottom-nav__icon" aria-hidden="true">` + the label span, no `aria-label`.
- Problem: `display:none` removes the label from the accessibility tree, so each nav item has an empty accessible name for screen-reader users in landscape, and sighted users lose all text.
- Fix: replace `display:none` with a visually-hidden pattern (`position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)`) or add `aria-label={item.title}` / `title` to the `<a>` and `<button>`.

### [Medium] No left/right safe-area padding on page content in mobile shell (landscape notch / Dynamic Island)
- Where: overrides/lib/components/layouts/UserPageLayout.svelte:86 ; custom/src/styles/mobile-shell.css:89-92
- Device: mobile (iPhone landscape, PWA standalone)
- Evidence: `<div class="{scrollbarClass} absolute {hasTitleClass} w-full overflow-y-auto p-2"` ; `.pg-mobile-content { bottom: ...; height: unset; }`
- Problem: header and bottom nav add `env(safe-area-inset-left/right)` (mobile-shell.css:21-22, 185-186) but the scrolling content area only has `p-2` (8px), so the first/last column of the gallery/lists sits under the notch in landscape. [Inference] assumes `viewport-fit=cover` is set (not verified in this scope).
- Fix: add to `.pg-mobile-content` `padding-inline: max(0.5rem, env(safe-area-inset-left)) max(0.5rem, env(safe-area-inset-right));` (and keep Tailwind `p-2` from overriding it, e.g. use `p-0` on mobile).

### [Medium] Mobile header controls are below 44px touch target and tightly packed
- Where: custom/src/styles/mobile-shell.css:60-64, 53-58 ; overrides/.../NavigationBar.svelte:110
- Device: mobile
- Evidence: `.pg-mobile-header__lang { min-height: 2rem; padding: 0 0.375rem; ...}` ; `.pg-mobile-header__actions { gap: 0.125rem }` ; `<ThemeSwitcher size="small" ...>`
- Problem: language toggle is 32px tall and ~50px wide, sits 2px from the small ThemeSwitcher; mis-taps likely, below Apple HIG 44pt (meets only WCAG 2.5.8 24px minimum). ThemeSwitcher "small" size is [Inference] ~32px.
- Fix: `min-height: 2.75rem; min-width: 2.75rem; padding: 0 0.5rem; justify-content:center;` and `gap: 0.25rem`; use `size="medium"` for ThemeSwitcher.

### [Medium] Admin sidebar hamburger is 32px and admin pages on phones use the desktop navbar
- Where: branding/src/fluent/navigation.css:305-308 ; overrides/.../NavigationBar.svelte:106,125,146 ; custom/src/utils/capabilities.svelte.ts:55
- Device: mobile / tablet (admin routes <850px)
- Evidence: `#top-menu-button { min-width: 32px; min-height: 32px; }` ; `grid h-full grid-cols-[--spacing(32)_auto] ... py-2` ; `isMobileShell = ... && !page.url.pathname.startsWith('/admin')`
- Problem: on /admin the mobile shell is disabled, so a phone gets the desktop navbar with a fixed 128px left column (menu + logo) leaving ~208px for search icon, theme, bell, cast, avatar (+ upload where passed). The only way to open the admin sidebar is a 32px button. [Inference] right section is tight/overflows at 360px when Cast and notifications are all present.
- Fix: raise to `min-width/height: 44px` for `(pointer: coarse)`; change left column to `grid-cols-[auto_minmax(0,1fr)]` below `sm`, and hide Cast/ThemeButton (move into avatar panel) under `sm`.

### [Medium] Admin/desktop sidebar nav items are 36px high on touch tablets, forced with `!important`
- Where: branding/src/fluent/navigation.css:46-51
- Device: tablet (admin pages and any non-shell touch layout 768-849px; also touch laptops)
- Evidence: `#sidebar a[href] { padding-block: 8px !important; font-size: var(--fontSizeBase300); ...}` (14px font, ~20px line => ~36px row)
- Problem: below 44px touch target; `!important` also prevents per-component fixes.
- Fix: `@media (pointer: coarse) { #sidebar a[href] { min-height: 44px; } }`.

## Low

### [Low] Content top offset (`top-16`) not synced with mobile toolbar height override (3rem) -> 16px dead gap
- Where: overrides/lib/components/layouts/UserPageLayout.svelte:57,91 ; custom/src/styles/mobile-shell.css:124-126
- Device: mobile
- Evidence: `return showToolbar ? 'top-16 pg-mobile-content' ...` vs `html[data-mobile-shell] main .absolute.flex.h-16.w-full { height: 3rem; }`
- Problem: toolbar is shrunk to 48px by a CSS selector coupled to Tailwind class names, but the content still starts at 64px; also fragile (renaming `h-16` silently breaks it).
- Fix: in the component use `mobileShell ? 'top-12' : 'top-16'` and `h-12` on the toolbar; delete the class-coupled selector. Same for `.fixed.top-0.z-2` at mobile-shell.css:120.

### [Low] Landscape nav offset variable smaller than real nav height (~4px overlap)
- Where: custom/src/styles/mobile-shell.css:396-398 vs 209
- Device: mobile landscape
- Evidence: `--mobile-bottom-nav-height: 2.5rem;` while `.pg-mobile-bottom-nav__item { min-height: 44px; }`
- Problem: nav renders >= 44px (+safe-area) but content `bottom`, FABs and upload panel offset only reserve 40px.
- Fix: set landscape var to `2.75rem` (44px) or reduce item min-height accordingly.

### [Low] Bottom nav label 10px
- Where: custom/src/styles/mobile-shell.css:280
- Device: mobile
- Evidence: `font-size: 0.625rem; font-weight: 600; letter-spacing: 0.02em;`
- Problem: 10px labels are hard to read, don't scale with larger text settings meaningfully.
- Fix: `font-size: 0.6875rem` (11px) min, or `max(0.6875rem, ...)`.

### [Low] Search input font-size 14px (iOS focus-zoom)
- Where: branding/src/fluent/navigation.css:118 ; overrides/.../search-bar/SearchBar.svelte:270 ; branding/src/tokens/typography.css:15
- Device: tablet (iPad) / any iOS where SearchBar renders (>=850px or non-shell)
- Evidence: `font-size: var(--fontSizeBase300) !important;` (= 14px) ; input also lacks `inputmode="search"`/`enterkeyhint="search"` (SearchBar.svelte:279-291, `type="text"`)
- Problem: iOS Safari zooms inputs < 16px on focus; keyboard shows generic return key. In mobile shell the navbar search is not rendered, so impact limited to iPad / the search page if it reuses SearchBar [Inference].
- Fix: `@media (pointer: coarse) { #main-search-bar { font-size: 16px !important; } }`; use `type="search" inputmode="search" enterkeyhint="search"`.

### [Low] MobileThumbnailHint: breakpoint mismatch with shell, 24px close button, invisible hover on light theme
- Where: overrides/.../MobileThumbnailHint.svelte:9, 34, 42
- Device: mobile / tablet
- Evidence: `pointerCoarse || maxMd` (maxMd = <=767px) vs shell = <850px ; `class="flex size-6 ... hover:bg-white/10"` ; `text-[11px]`
- Problem: 768-849px mouse users get the shell but no hint; touch laptops at full-sidebar width get it; `bg-white/10` hover is invisible on light surface; 24px dismiss target and 11px text.
- Fix: use `mediaQueryManager.isMobileShell` (exists upstream, media-query-manager.svelte.ts:18); `size-11` hit area (visual icon can stay 24px); `hover:bg-(--md-state-on-surface-hover)` or `hover:bg-black/5 dark:hover:bg-white/10`.

### [Low] Favorites popup menu: `role="menu"` without arrow-key/focus handling
- Where: overrides/lib/components/mobile/MobileBottomNav.svelte:153-161
- Device: mobile with keyboard / screen reader, tablet
- Evidence: `<div class="pg-mobile-favorites-menu" role="menu" ...>` + `<button role="menuitem">`; no focus move on open, no ArrowUp/Down.
- Problem: ARIA menu contract unmet; focus stays on trigger after opening; Escape handled but focus not returned.
- Fix: drop `role=menu/menuitem` (plain list of links/buttons with `aria-expanded` disclosure) or move focus to first item on open and implement arrow keys. Items could also be `<a href>` instead of `goto`.

### [Low] Blur (`backdrop-filter`) on header and bottom nav where nothing scrolls underneath
- Where: custom/src/styles/mobile-shell.css:23-25, 187-189 ; 89-92
- Device: mobile (low-end Android)
- Evidence: `backdrop-filter: saturate(180%) blur(20px);` while `.pg-mobile-content { bottom: var(--mobile-bottom-nav-offset); }` and header is a `shrink-0` flex sibling (UserPageLayout.svelte:65)
- Problem: [Inference] content ends above both bars, so the 20px blur is paid on every frame with no visible benefit; costly on weak GPUs.
- Fix: drop backdrop-filter and use opaque `--md-sys-color-surface`, or keep only where content scrolls under (viewer overlays).

### [Low] SwipeBackEdge: hard-coded 64px top and full-height `touch-action:none` strip
- Where: overrides/lib/components/shared-components/SwipeBackEdge.svelte:23-27 (used at overrides/lib/components/asset-viewer/AssetViewer.svelte:627)
- Device: mobile (iOS Safari)
- Evidence: `inset-block: 64px 0; z-index: 40; width: 32px; touch-action: none;`
- Problem: 64px ignores `env(safe-area-inset-top)` and mobile viewer overlay navbar height; [Inference] a 32px `touch-action:none` strip on the leading edge competes with iOS Safari's native edge-swipe back and blocks pan/zoom started at the edge of the photo.
- Fix: `inset-block-start: calc(env(safe-area-inset-top) + 64px)`; reduce width to ~20px; keep `touch-action: pan-y`.

### [Low] EmptyPlaceholder image has width but no height (CLS) and no focus-visible styling on the button variant
- Where: overrides/lib/components/shared-components/EmptyPlaceholder.svelte:31, 17-19
- Device: all
- Evidence: `<img {src} alt="" width="500" draggable="false" class="max-w-full" />` ; hover class only for clickable variant
- Problem: without `height`/aspect-ratio the box collapses to 0 until the SVG loads then jumps; at 640-767 `sm:w-1/2` (~320px) is narrower than the 500px attribute (scaled by max-w only).
- Fix: add `height="auto"` via `class="h-auto w-full max-w-[500px]"` plus `aspect-ratio` from the SVG viewBox; add `focus-visible:outline` ring on the button variant.

### [Low] Language toggle has `aria-label` that hides its state; BrandLogo alt hard-coded
- Where: overrides/.../NavigationBar.svelte:111-120 ; overrides/.../BrandLogo.svelte:40, 11-14
- Device: all
- Evidence: `aria-label={$t('language')}` on a button whose visible text is `VN / EN` ; `alt="WeGallery"` ; `variant: { inline: 'h-12 w-auto max-w-none' }` combined with `size: tiny: 'h-8' ...`
- Problem: screen readers hear "language" only, not the current/next language; logo alt not i18n'd (minor); `size` prop is silently ignored for `variant="inline"` because both set `h-*` (last wins) and `size="landing"` (h-64) is 256px tall - fixed px heights with no `max-h`/viewport clamp.
- Fix: `aria-label={isVietnamese ? 'Chuyển sang English' : 'Switch to Tiếng Việt'}` (via $t); in BrandLogo use compound variants so `inline` honours size; add `max-h-[40dvh]` for `landing`.

## Checked, no issue
- UserPageLayout uses `h-dvh` (not `100vh`), `min-h-0 flex-1`, mobile shell single-column grid override (mobile-shell.css:85-87).
- Mobile header: `padding-top/left/right: env(safe-area-inset-*)` (mobile-shell.css:20-22); title truncates with ellipsis (:44-51).
- Bottom nav: safe-area bottom/left/right padding (:184-186), items `min-height: 44px` (:209), `aria-current`, `aria-label={$t('primary')}`, hides when viewer open / dialogs open (:140-145, MobileBottomNav.svelte:98-103); FAB and upload panel offsets use `--mobile-bottom-nav-offset` (:128-138); reduced-motion globally handled in branding/src/fluent/globals.css:54-62 (covers Sidebar `transition-all` and `fly`).
- Account panel width `min(280px, calc(100vw - 2rem))` (navigation.css:173); favorites menu `max-width: min(18rem, calc(100vw - 1.5rem))` (mobile-shell.css:226).
- Modal scroll lock logic for mobile (mobile-shell.css:153-163) correct; dialog z-index (100) > nav (90).
- AuthPageLayout: `min-h-dvh`, `m-2 w-full max-w-xl`, decorative backdrop `alt=""`; AdminPageLayout/BottomInfo/Sidebar.svelte unchanged vs upstream apart from focus trap/inert (fine); Sidebar uses `w-[min(100vw,16rem)]`.
- FullScreenLoadingOverlay has role=status/aria-live/aria-busy/label; z-200 above nav z-90.
- UserAvatar: img has alt, fallback, `draggable=false`; avatar button in navbar has 40px avatar + padding (target >=44 wide).
- MobileBackGuard is a logic-only component (no UI); no `+layout.svelte` under overrides/ and the only ones under custom/ are admin library/users list layouts (not shell framing).
- Token bridge (immich-bridge.css) only maps colours; contrast of Ant-derived primaries not computed here (not verified).
