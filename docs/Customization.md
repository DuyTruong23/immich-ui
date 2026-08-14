# Tùy biến — Photo Gallery UI

## Triết lý

> **Extend, don't replace.** Override trước, patch sau, sửa upstream cuối cùng.

## Thứ tự ưu tiên

```
1. Feature flags (ẩn trang)     ← Không đụng code
2. Branding (theme, logo)       ← CSS + static assets
3. Overrides (alias component)  ← Thay component cụ thể
4. Custom (trang mới)           ← Thêm route mới
5. Patches (sửa upstream)       ← Cuối cùng, có tài liệu
```

## Branding (`branding/`)

| Asset | File | Mô tả |
|---|---|---|
| Logo | `branding/logo.svg` | Logo chính |
| Logo dark | `branding/logo-dark.svg` | Logo cho dark mode |
| Favicon | `branding/favicon.ico` | Browser tab icon |
| Manifest | `branding/manifest.json` | PWA manifest |
| Loading | `branding/loading.css` | Splash/loading screen |
| Theme light | `branding/theme-light.css` | CSS variables light |
| Theme dark | `branding/theme-dark.css` | CSS variables dark |

Inject qua Vite alias trong Phase 6.

## Overrides (`overrides/`)

Mirror cấu trúc upstream để thay component:

```
overrides/
└── components/
    └── navigation/
        └── NavigationBar.svelte   → thay upstream equivalent
```

Cấu hình alias (Phase 3):
```js
// vite.config.ts
'@override': path.resolve('overrides'),
'$lib/components/NavigationBar.svelte': path.resolve('overrides/components/navigation/NavigationBar.svelte'),
```

## Custom pages (`custom/`)

Trang hoàn toàn mới, không có trong Immich:

```
custom/
├── Dashboard/
│   └── +page.svelte
├── Explorer/
│   └── +page.svelte
├── Settings/
│   └── +page.svelte
├── Widgets/
├── Notifications/
└── Statistics/
```

### Thông báo người dùng

| Tính năng | File chính | Tài liệu |
|---|---|---|
| Modal tính năng sau login | `custom/src/data/feature-updates.json` (sửa tay) | [FEAT-READ](../feature-updates/FEAT-READ.md), [UserMessaging.md](./UserMessaging.md) |
| Trang bảo trì / lỗi kết nối | `custom/src/utils/server-connection-error.ts` | [UserMessaging.md](./UserMessaging.md) |

Route đăng ký qua SvelteKit route group wrapper — không sửa route upstream.

## Feature flags

Ẩn trang Immich qua biến môi trường (Phase 8):

```env
PUBLIC_ENABLE_MEMORIES=false
PUBLIC_ENABLE_PARTNER=false
PUBLIC_ENABLE_SHARING=true
PUBLIC_ENABLE_MAP=true
PUBLIC_ENABLE_PEOPLE=true
PUBLIC_ENABLE_ADMIN=false
```

Route guard kiểm tra flag → redirect hoặc ẩn nav item. Trang **biến mất hoàn toàn**, không chỉ disabled UI.

## Những gì KHÔNG nên làm

- ❌ Copy-paste component upstream vào `custom/` rồi sửa
- ❌ Tạo custom REST API wrapper thay `@immich/sdk`
- ❌ Fork logic business từ Immich server
- ❌ Sửa `upstream/web/src/routes/` trực tiếp
- ❌ Thay đổi OpenAPI schema

## Những gì NÊN làm

- ✅ Override component UI (navbar, sidebar, login page)
- ✅ Thêm trang dashboard/analytics mới
- ✅ Custom theme/branding
- ✅ Feature flags cho module không cần
- ✅ Patch tối thiểu cho alias/hook injection point

## Ví dụ: Custom login page

1. Tạo `overrides/routes/(auth)/login/+page.svelte`
2. Alias route qua Vite/SvelteKit config
3. Dùng `@immich/sdk` cho authentication — cùng API contract
4. Test login flow end-to-end

## Ví dụ: Thêm Dashboard

1. Tạo `custom/Dashboard/+page.svelte`
2. Thêm route trong wrapper layout
3. Gọi `@immich/sdk` cho stats API
4. Thêm nav item qua override NavigationBar
