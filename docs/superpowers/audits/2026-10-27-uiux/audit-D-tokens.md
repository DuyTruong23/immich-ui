# Audit D — modals, form elements, design tokens

Scope: overrides/lib/{modals,elements,settings,search-bar/Search*Section}, branding/src/**.
All paths relative to D:\Personal\Coding\Immich-gallery\immich-ui. Contrast ratios computed with the WCAG 2.x relative-luminance formula from the hex values in code; alpha-blended values (focus rings) were composited over the stated background by me, so treat those as [Inference] (the real backdrop may differ).

Important context: the ACTIVE stylesheet chain is `custom/src/styles/custom.css:1-20` (fonts, spacing, m3/*, theme-*, fluent/responsive.css, fluent/viewer.css, loading.css, mobile-shell.css). These branding files are NOT imported anywhere I could find and are dead code: fluent-tokens.css, typography.css, component-overrides.css, fluent/{globals,primitives,forms,admin,navigation,search-filter,shell,timeline}.css, immich-bridge.css (root), tokens/{colors,typography,motion,radius,shadows}.css. Findings below that hinge on this are marked.

Counts: High 1, Medium 8, Low 8.

---

## Findings

### [High] Page pinch-zoom is blocked globally (viewport meta + touch-action)
- Where: custom/src/styles/custom.css:22-26 ; upstream/web/src/app.html:10
- Device: mobile
- Evidence: `touch-action: pan-x pan-y;` on `html, body` and `content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"`
- Problem: Users cannot zoom text/UI (WCAG 1.4.4 Resize Text, 1.4.4/1.4.10 low-vision users). iOS Safari ignores `user-scalable=no` since iOS 10 but Android Chrome honours it; `touch-action: pan-x pan-y` blocks pinch on both. The comment says the viewer re-enables pinch, but every other page (settings, admin tables, search modal) has no zoom path. (app.html line is upstream's; grep found no patch for it, so the `user-scalable=no` is upstream behaviour, the `touch-action` is ours.)
- Fix: Drop `touch-action: pan-x pan-y` from `html,body` (keep `pan-y` only on `#asset-grid`/viewer content, which is already done at :29-31 and :39-42); if pinch must be limited, set it only on `body.asset-viewer-open`. Remove `maximum-scale=1, user-scalable=no` via a patch to app.html.

### [Medium] Focus ring fails 3:1 non-text contrast (40% alpha primary)
- Where: branding/src/m3/states.css:61-71 (ring), branding/src/m3/tokens.css:75 and :122 (`--md-state-focus-ring`)
- Device: all (keyboard / switch / external keyboard on tablet)
- Evidence: `outline: 2px solid var(--md-state-focus-ring) !important;` with `--md-state-focus-ring: color-mix(in srgb, var(--md-sys-color-primary) 40%, transparent)`
- Problem: [Inference on backdrop] Composite ring colour over surface: light #6750a4@40% on #fef7ff = ~#c2b4db, ratio 1.84:1; on container-high #ece6f0 ~1.77:1. Dark #d0bcff@40% on #141218 = ~#5f5674, 2.72:1; on #2b2930 2.60:1. All < 3:1 (WCAG 2.4.11/1.4.11). The dead fluent rule (fluent/globals.css:39-46) used a solid brand outline and would have passed; the active one regressed it. `!important` also prevents components from fixing it locally.
- Fix: `--md-state-focus-ring: var(--md-sys-color-primary);` (6.12:1 light / 10.91:1 dark on surface) and keep `outline-offset: 2px`; use 40% alpha only for the hover/pressed layers.

### [Medium] Input focus indicator in search modal is only a 24% outline + 1px border colour change
- Where: branding/src/m3/search-filter.css:120-126 ; branding/src/m3/components.css:435-442
- Device: all
- Evidence: `outline: 2px solid color-mix(in srgb, var(--md-sys-color-primary) 24%, transparent) !important;` with `border-color: var(--md-sys-color-primary)`
- Problem: Outline composite is ~1.39:1 (light, over #ece6f0) and ~1.76:1 (dark, over #2b2930) [Inference]. The only usable cue is the 1px border going #79747e -> #6750a4 (outline 4.33:1 -> primary 6.12:1 vs surface, a small delta). Also `.ant-search-filter-modal__section input:focus-within` (:120) is invalid-ish for an `<input>` (inputs have no descendants); `:focus-visible`/`:focus` would be correct, so for bare inputs inside the modal only the `[class*='Input']:focus-within` and `textarea:focus` branches fire.
- Fix: use `border-width: 2px` (or `box-shadow: 0 0 0 1px var(--md-sys-color-primary)`) plus a full-opacity outline; change selector `input:focus-within` -> `input:focus-visible`.

### [Medium] Person-filter icon buttons forced to 36px with `!important` (beats the 44px coarse rule)
- Where: branding/src/m3/search-filter.css:162-172
- Device: mobile
- Evidence: `width: 2.25rem !important; height: 2.25rem !important; min-width: 2.25rem !important; min-height: 2.25rem !important;`
- Problem: 36x36px < 44pt Apple HIG; `!important` also defeats `fluent/responsive.css:6-11` (`min-height:44px` on coarse pointers). Above WCAG 2.5.8 24px minimum, hence Medium.
- Fix: `min-width/min-height: 2.75rem !important` inside `@media (pointer: coarse)` (keep 2.25rem for fine pointers), or add hit-area padding via `::after { inset: -4px }`.

### [Medium] Checkbox rows in Display options: the 44px row is not the hit area
- Where: branding/src/m3/search-filter.css:218-243 ; overrides/lib/components/shared-components/search-bar/SearchDisplaySection.svelte:50-56
- Device: mobile
- Evidence: `.pg-search-display-options__item { display:flex; align-items:center; min-height: 2.75rem; }` with `<input ... class="pg-search-display-options__input"/> <label for=... class="pg-search-display-options__label">`
- Problem: Min-height is on the wrapper `div`, which is not interactive. Clickable area = 18x18px checkbox + the label's own line box (~20px tall at 0.9375rem/1.35). Real tap target is ~20px high, not 44px. [Inference from CSS; no padding on label/input.]
- Fix: make the label the hit area: `.pg-search-display-options__label { display:flex; align-items:center; min-height:2.75rem; }` (and drop `align-items:center` reliance), or wrap input+label in a single `<label>` with `min-height:2.75rem`.

### [Medium] DateInput (vi locale): `inputmode="decimal"` hides "/" and ":" on iOS
- Where: overrides/lib/elements/DateInput.svelte:88-91
- Device: mobile (iOS especially)
- Evidence: `inputmode="decimal"` ... `placeholder={type === 'date' ? 'dd/mm/yyyy' : 'dd/mm/yyyy hh:mm:ss'}`
- Problem: [Inference from known keyboard layouts] The decimal keypad exposes digits and a decimal separator only; the user cannot type the `/` and `:` required by the displayed format, so they must type digits only and rely on `displayToIsoInput` auto-parsing (not verified). Also no `enterkeyhint`.
- Fix: `inputmode="numeric"` is no better; use `inputmode="text"` (or omit) with `enterkeyhint="done"`, or auto-insert separators while typing. Verify `displayToIsoInput` accepts bare digits if keeping numeric keypad.

### [Medium] DateInput calendar button: 20px wide, `tabindex="-1"`, hard-coded Vietnamese label
- Where: overrides/lib/elements/DateInput.svelte:102-111, 157-169
- Device: mobile + desktop keyboard users
- Evidence: `tabindex="-1" aria-label="Chọn ngày"` ; `.pg-date-input__picker { padding:0; ... }` icon `size="20"`
- Problem: Hit area is the 20px icon (only height is lifted to 44 by `responsive.css:7-9` on coarse pointers; width stays 20) -> 20x44 target. `tabindex="-1"` makes the picker unreachable by keyboard (the text input has no alternative way to open the native picker). `aria-label` is not i18n (`$t`) although the component is locale-aware (renders only for vi, so Low impact today).
- Fix: `.pg-date-input__picker { min-width:2.75rem; min-height:2.75rem; inset-inline-end:0 }` and widen `padding-inline-end` of `__text` to 3rem; remove `tabindex="-1"`; use `$t('select_date')`.

### [Medium] Global `min-height:44px` on all buttons turns round icon buttons into ovals
- Where: branding/src/fluent/responsive.css:6-11 (with m3/components.css:342-345)
- Device: mobile / tablet touch
- Evidence: `@media (pointer: coarse) { button:not([disabled]), [role='button']:not([disabled]), a[role='menuitem'] { min-height: 44px; }`
- Problem: Only height is raised. Buttons sized `h-8 w-8`/`h-10 w-10` (e.g. icon buttons forced `border-radius: full` at components.css:342-345) become 32x44 / 40x44 ellipses, and dense inline buttons (chips, SettingAccordion inner controls) get stretched. [Inference — not rendered; follows from CSS.]
- Fix: use `min-height:44px; min-width:44px` only for icon-only buttons (`button[class*='w-']`), or enlarge hit area with a pseudo-element (`button::after{content:'';position:absolute;inset:-6px}`) to avoid layout change.

### [Medium] Duplicate `id="version-history"` and `<Label for>` pointing to a `<ul>`
- Where: overrides/lib/modals/ServerAboutModal.svelte:385-392
- Device: all
- Evidence: `<Label ... for="version-history">` / `<ul id="version-history" ...>` / `<span ... id="version-history" ...>` (inside `{#each}` up to 5x)
- Problem: Up to 6 elements share one id (invalid HTML; `getElementById`/label association undefined). `for` targets a non-labelable `<ul>`, so there is no accessible name for the list.
- Fix: remove the `id` from the `<span>`; replace the `Label` with `<h3 id="version-history-label">` and `<ul aria-labelledby="version-history-label">`.

### [Low] Reduced-motion: smooth scrollIntoView and a dead escape hatch
- Where: overrides/lib/components/shared-components/settings/SettingAccordion.svelte:43-46 ; custom/src/styles/custom.css:53-62
- Device: all
- Evidence: `accordionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });` ; `html:not(.immich-allow-motion) *, ... { animation-duration: 0.01ms !important; ... scroll-behavior: auto !important; }`
- Problem: CSS `scroll-behavior:auto` does not override an explicit JS `behavior:'smooth'`, so reduced-motion users still get smooth scroll. Separately `.immich-allow-motion` is never set anywhere in repo (grep), so the exception is dead. The CSS blanket rule is otherwise fine (also covers svelte `slide`/`fly` which are CSS-animation based).
- Fix: `behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`. Note `tokens/motion.css:21-27` zeroing durations is dead code (file not imported).

### [Low] Person tiles are toggle buttons without state; selected cue only colour
- Where: overrides/lib/components/shared-components/search-bar/SearchPeopleSection.svelte:169-176 ; branding/src/m3/search-filter.css:189-192
- Device: all (screen readers)
- Evidence: `<button type="button" class={styles({selected: ...})} onclick={() => togglePersonSelection(person.id)}>` ... `<ImageThumbnail ... altText={person.name}>` `<p ...>{person.name}</p>`
- Problem: No `aria-pressed`; selected state conveyed by border/background only (contrast of selected tile itself is fine: on-surface on primary-container 13.24:1 light / 7.20:1 dark). Name is announced twice (img alt + text).
- Fix: add `aria-pressed={selectedPeople.has(person.id)}`; set `altText=""` on the thumbnail since the name is rendered beneath.

### [Low] Date range in Vietnamese: unlabeled text input
- Where: overrides/lib/elements/DateInput.svelte:84-100 ; overrides/lib/components/shared-components/search-bar/SearchDateSection.svelte:19-24
- Device: all
- Evidence: `<Text class="mb-2" fontWeight="medium">{$t('start_date')}</Text>` followed by `<DateTimeField .../>` (no `id`, no `aria-label`)
- Problem: The visible heading is a `Text`, not a `<label for>`; the input gets no accessible name. [Inference: depends on `Text` rendering a `<p>`/`<span>`.]
- Fix: pass `id` through `DateTimeField` (it already accepts `id`) and render `<label for=...>`, or add `aria-label={$t('start_date')}`.

### [Low] `--immich-fg` is a raw RGB triplet used as a CSS colour
- Where: overrides/lib/elements/DateInput.svelte:166 ; branding/src/m3/immich-bridge.css:45
- Device: all
- Evidence: `color: var(--immich-fg, currentColor);` vs `--immich-fg: 29 27 32;`
- Problem: `color: 29 27 32` is invalid at computed-value time, so it silently falls back to inherited colour (works by accident); in dark mode `--immich-fg` is undefined so the fallback is used. Plus `opacity: .7` on the icon lowers contrast further.
- Fix: `color: var(--md-sys-color-on-surface-variant);` and drop opacity (on-surface-variant is 8.88:1 light / 10.91:1 dark on surface).

### [Low] Modal-wide forced fullscreen selector hits any dialog while the filter modal is open
- Where: overrides/lib/modals/SearchFilterModal.svelte:299-328
- Device: mobile
- Evidence: `:global(html[data-search-filter-modal='open'] [data-dialog-content]) { ... height: 100dvh !important; border-radius: 0 !important; }`
- Problem: The selector is not scoped to the filter modal, so any nested/stacked dialog (confirm, tag/combobox dialogs) opened while the attribute is set would also become fullscreen [Inference]. Also on iOS, `100dvh` does not shrink for the on-screen keyboard (layout viewport unchanged) so the sticky footer can sit under the keyboard [Inference].
- Fix: scope with `.ant-search-filter-modal`'s parent via `:has(.ant-search-filter-modal)`; add `interactive-widget=resizes-content` to the viewport meta (app.html patch) for Android.

### [Low] `max-height: min(40vh, 18rem)` uses `vh`
- Where: branding/src/m3/search-filter.css:200
- Device: mobile
- Evidence: `max-height: min(40vh, 18rem);`
- Problem: `vh` is the large viewport on mobile Safari/Chrome (URL bar collapsed), so the expanded people grid can be slightly taller than intended; low impact since capped at 18rem.
- Fix: `min(40dvh, 18rem)`.

### [Low] Dead/legacy token files carry sub-16px input size and failing palette; risk if re-enabled
- Where: branding/src/fluent/primitives.css:10 ; branding/src/tokens/colors.css:8-22,64-80 ; branding/src/fluent-tokens.css:12-34
- Device: all
- Evidence: `font-size: var(--fontSizeBase300) !important;` (14px) on `.immich-form-input`; `--ant-color-primary: #1677ff`
- Problem: Not imported by custom.css, but confusing and unsafe to re-import: 14px `.immich-form-input` would trigger iOS focus-zoom (upstream uses `text-base`, 16px: upstream/web/src/app.css:37). Palette contrast (estimates): #1677ff on white 4.10:1 (fails AA for body text), #faad14 warning on white 1.90:1, #52c41a success on white 2.27:1, dark primary #1668dc on #141414 3.55:1, dark error #dc4446 on #141414 4.35:1. Also `fluent-tokens.css`/`globals.css` reference `--colorNeutralForeground1`, `--colorBrandForeground1`, `--colorNeutralBackground1`, `--colorNeutralStroke1` etc. which are not defined anywhere in the repo (grep), so those rules would resolve to empty/invalid.
- Fix: delete the unused files (or the `@import` comments) to avoid regressions; keep only the M3 chain.

### [Low] No fluid typography / responsive type scale
- Where: branding/src/m3/typography.css:8-39 ; branding/src/m3/typography.css:41-49
- Device: all (esp. >=1536 and <=360)
- Evidence: `--md-sys-typescale-display-large-size: 3.5625rem;` ... fixed `rem` only, no `clamp()`; body `font-size: 1rem`.
- Problem: Scale is fixed (display 57px, headline 32px); no `clamp()`/breakpoint adjustments. Only a problem if display/headline tokens are used on mobile pages; I did not find them consumed in my scope. Body at 1rem (16px) is good for iOS. Fonts loaded `font-display: swap` with no `size-adjust` fallback (fonts.css:7), so a swap causes layout shift [Inference].
- Fix: `--md-sys-typescale-display-large-size: clamp(2.25rem, 1.5rem + 3vw, 3.5625rem);` and add `@font-face { font-family: 'SF Pro Fallback'; src: local('Arial'); size-adjust: ...; }`.

---

## Contrast table (hex from branding/src/m3/tokens.css; ratios computed, WCAG 2.x)

Light (surface #fef7ff)
| Pair | fg / bg | Ratio | AA |
|---|---|---|---|
| Primary text on-surface | #1d1b20 / #fef7ff | 16.23 | pass |
| Muted text on-surface-variant (body) | #49454f / #fef7ff | 8.88 | pass |
| Muted label in modal (container-high) | #49454f / #ece6f0 | 7.63 | pass |
| Muted on input fill (container-highest) | #49454f / #e6e0e9 | 7.21 | pass |
| Primary on surface | #6750a4 / #fef7ff | 6.12 | pass |
| Primary on container-high (modal) | #6750a4 / #ece6f0 | 5.26 | pass |
| Primary on container-highest | #6750a4 / #e6e0e9 | 4.97 | pass (barely) |
| Button text on filled primary | #ffffff / #6750a4 | 6.44 | pass |
| ... hover (8% white mix, #735eab) | #ffffff / #735eab | 5.36 | pass |
| Input border outline vs surface | #79747e / #fef7ff | 4.33 | pass 3:1 |
| Input border vs its fill | #79747e / #e6e0e9 | 3.51 | pass 3:1 |
| Card/section border outline-variant | #cac4d0 / #fef7ff | 1.62 | decorative (see note) |
| Error text | #b3261e / #fef7ff | 6.21 | pass |
| Selected nav on-secondary-container | #1d192b / #e8def8 | 13.24 | pass |
| Tooltip | #f5eff7 / #322f35 | 11.65 | pass |
| success/warning/info-500 (bridge) | #386a20 / #7d5700 / #00639b on #fef7ff | 6.14 / 6.17 / 6.13 | pass |
| immich-ui-primary-400 #7965a8 | on #fef7ff | 4.71 | pass (only if used as text) |
| immich-ui-primary-300 #8f7bb5 | on #fef7ff | 3.52 | FAIL as text (pass as non-text) |
| Focus ring 40% primary (composite ~#c2b4db) | / #fef7ff | 1.84 | FAIL 3:1 [Inference] |
| Modal input outline 24% (~#ccc2de) | / #ece6f0 | 1.39 | FAIL 3:1 [Inference] |

Dark (surface #141218)
| Pair | fg / bg | Ratio | AA |
|---|---|---|---|
| Primary text | #e6e0e9 / #141218 | 14.35 | pass |
| Muted on-surface-variant | #cac4d0 / #141218 | 10.91 | pass |
| Muted in modal container-high | #cac4d0 / #2b2930 | 8.42 | pass |
| Muted on input fill container-highest | #cac4d0 / #36343b | 7.20 | pass |
| Primary on surface | #d0bcff / #141218 | 10.91 | pass |
| Primary on container-high | #d0bcff / #2b2930 | 8.42 | pass |
| Button text on filled primary | #381e72 / #d0bcff | 7.71 | pass |
| Input border outline vs surface | #938f99 / #141218 | 5.87 | pass |
| Input border vs fill | #938f99 / #36343b | 3.87 | pass |
| Card border outline-variant | #49454f / #141218 | 1.99 (1.54 on #2b2930) | decorative |
| Error | #f2b8b5 / #141218 | 10.89 | pass |
| Nav selected | #e8def8 / #4a4458 | 7.19 | pass |
| Person selected tile text | #e6e0e9 / #4f378b | 7.20 | pass |
| Focus ring 40% primary (~#5f5674) | / #141218 | 2.72 | FAIL 3:1 [Inference] |
| Focus ring 40% on #2b2930 | (~#6d6483) | 2.60 | FAIL [Inference] |
| Modal input outline 24% | (~#534c62) / #2b2930 | 1.76 | FAIL [Inference] |

Note: section/card borders use `outline-variant` (1.5-2.0:1). They are decorative containers, but the modal sections (`.ant-search-filter-modal__section`, search-filter.css:42-48) rely on them alone to separate groups; on surface-container-high vs surface-container fill difference is also tiny. Low.

## Checked, no issue
- Text/button colour pairs in both themes (table above) pass AA; primary/on-primary, on-surface(-variant), error, nav-selected, tooltip all >= 5:1.
- Input font-size in active chain: `.immich-form-input` upstream = `text-base` (16px) (upstream/web/src/app.css:37); m3 CSS sets no smaller size; body base 1rem (m3/typography.css:43). No active input rule < 16px found. (SearchBar input in people filter inherits 16px via preflight [Inference].)
- `prefers-reduced-motion`: global blanket rule exists in custom/src/styles/custom.css:53-62 and covers animation/transition durations (apart from JS smooth scroll above).
- Focus-visible is not removed (no `outline:none` in branding/modals/elements); only weakened (see ring finding).
- 100vh: no `100vh` in scope; modal uses `100dvh`/`min(88dvh,720px)` (SearchFilterModal.svelte:273,305). `html { overflow-x: clip }` in responsive.css:19-21 (no scroll container created). loading.css uses `position:fixed; inset:0` stencil with fallbacks.
- Safe area: SearchFilterModal footer `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))` (search-filter.css:69) and top inset (SearchFilterModal.svelte:326) handled. Other @immich/ui modals (AvatarEdit, MapSettings, ServerAbout, date modals) are centred dialogs; not checked for bottom-sheet behaviour.
- Search filter grid: single column <768, two columns >=768 (search-filter.css:54-63); date section `grid-auto-fit-40` collapses to one column at phone widths.
- SettingAccordion: button has `aria-expanded`, full-width hit area, `text-start` RTL-safe; focus ring issue only via global ring.
- AvatarEditModal: file input hidden but triggered by real button; preview has alt; avatar is fixed `w-32` (128px) which fits 360px.
- DateTimeField/DateInput non-vi path uses native `type=date/datetime-local` (good mobile pickers).
- Overlay/scrim and dialog tokens (components.css:409-422) consistent in light/dark.
