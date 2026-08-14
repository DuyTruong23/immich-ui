# Kiến trúc — Photo Gallery UI

## Tổng quan

**Photo Gallery UI** là frontend tùy biến dựa trên [Immich Web](https://github.com/immich-app/immich/tree/main/web). Immich Docker Stack là backend duy nhất — không có custom media API.

```
┌─────────────────────────────────────────────────────────────┐
│                     Photo Gallery UI                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ branding │ │  custom  │ │ overrides│ │   patches    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       └────────────┴────────────┴──────────────┘          │
│                         │                                   │
│              ┌──────────▼──────────┐                        │
│              │   upstream/web      │  SvelteKit + @immich/sdk│
│              └──────────┬──────────┘                        │
└─────────────────────────┼───────────────────────────────────┘
                          │ REST + WebSocket
              ┌───────────▼───────────┐
              │   Immich Server       │  Docker (VPS/NAS/Mini PC)
              │   PostgreSQL + Redis  │
              └───────────────────────┘
```

## Nguyên tắc thiết kế

| Nguyên tắc | Mô tả |
|---|---|
| **Upstream-first** | Immich Web giữ nguyên kiến trúc SvelteKit. Không rewrite. |
| **Extend, don't replace** | Custom code nằm ngoài `upstream/`. Override trước, patch sau. |
| **API compatibility** | Chỉ dùng Immich REST API và WebSocket qua `@immich/sdk`. |
| **Isolated patches** | Thay đổi bắt buộc upstream → file `.patch` trong `patches/`. |
| **Feature flags** | Bật/tắt trang qua biến môi trường, không xóa route upstream. |

## Cấu trúc thư mục

```
photo-gallery-ui/
├── upstream/           # Immich Web + @immich/sdk (read-only mindset)
│   ├── web/            # SvelteKit app gốc
│   └── packages/sdk/   # OpenAPI SDK generated
├── branding/           # Logo, theme, favicon, manifest
├── custom/             # Trang & component mới (Dashboard, Explorer, …)
├── overrides/          # Thay thế component upstream qua alias
├── patches/            # Git patches cho thay đổi upstream bắt buộc
├── feature-updates/    # Tài liệu changelog modal — CI generate khi push main
├── docs/               # Tài liệu dự án
└── scripts/            # Sync upstream, apply patches, release notes
```

## Stack công nghệ

| Layer | Công nghệ |
|---|---|
| Framework | **SvelteKit 2** + Svelte 5 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + `@immich/ui` |
| API Client | `@immich/sdk` (OpenAPI generated) |
| Realtime | socket.io-client |
| Build | Vite 8 |
| Package manager | pnpm workspaces |

> **Lưu ý:** Immich Web dùng SvelteKit, không phải React. Mọi custom layer tuân theo convention SvelteKit/Svelte 5.

## Luồng dữ liệu

1. Browser load static bundle (Vercel hoặc CDN).
2. Frontend gọi `PUBLIC_IMMICH_SERVER_URL/api/*` (REST).
3. WebSocket kết nối qua cùng origin hoặc proxy.
4. Không có BFF (Backend-for-Frontend) — giao tiếp trực tiếp với Immich.

## Layer tùy biến

### Branding (`branding/`)
Theme, logo, loading screen, PWA manifest — inject qua Vite alias và CSS variables.

### Custom (`custom/`)
Trang và widget mới hoàn toàn. Route mới đăng ký qua SvelteKit `+page.svelte` wrapper.

### Overrides (`overrides/`)
Map `$lib/components/Foo.svelte` → `overrides/components/Foo.svelte` qua Vite alias. Ưu tiên cao nhất so với sửa upstream.

### Patches (`patches/`)
Git apply patches cho thay đổi không thể alias (ví dụ: sửa `svelte.config.js`).

## Tương thích upstream

- Giữ nguyên `@immich/sdk` workspace dependency.
- Không thay đổi API contract.
- Đồng bộ định kỳ qua nhánh `upstream-sync`.
