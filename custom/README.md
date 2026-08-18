# Custom Layer

Trang và component mới — **không** duplicate logic Immich.

## Cấu trúc

```
custom/src/
├── api/              # Wrapper @immich/sdk theo domain
├── components/       # FeatureUpdatePin, error pages
├── hooks/            # feature-guard, lifecycle hooks
├── providers/        # app config bootstrap
├── routes/           # SvelteKit routes → sync vào upstream/web
├── styles/           # CSS tùy biến + mobile-shell
├── utils/            # capabilities (`can` / `canForAsset`)
└── types/            # TypeScript types
```

## Trang tương lai

| Module | Route | Trạng thái |
|---|---|---|
| Dashboard | `/dashboard` | ✓ Implemented |
| Explorer | `/explorer` | Planned |
| Settings | `/settings` | Planned |
| Widgets | — | Planned |
| Notifications | — | ✓ Login email notify (Resend) |
| User messaging | — | ✓ Modal tính năng + trang bảo trì — xem [UserMessaging.md](../docs/UserMessaging.md) |
| Statistics | — | Planned |

Thêm route mới trong `custom/src/routes/`, chạy `pnpm prepare:custom`.
