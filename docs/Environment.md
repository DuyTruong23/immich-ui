# Biến môi trường — Photo Gallery UI

Tài liệu chi tiết cho mọi biến trong `.env.example`.

## Backend (dev)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `IMMICH_SERVER_URL` | Dev | Target Vite proxy. Mặc định `http://localhost:2283` |
| `VITE_IMMICH_API_URL` | Không | Alias tương thích spec; fallback nếu `IMMICH_SERVER_URL` trống |

## Public (build-time)

SvelteKit inject `PUBLIC_*` vào bundle lúc build. Thay đổi trên Vercel yêu cầu rebuild.

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PUBLIC_IMMICH_SERVER_URL` | `""` | URL API production khi frontend/API khác origin |
| `PUBLIC_IMMICH_MEDIA_URL` | `""` | URL tunnel trực tiếp cho video/ảnh (bypass Vercel proxy). Ví dụ `https://api.gallery-app.pp.ua` |
| `PUBLIC_APP_NAME` | `Photo Gallery` | Tên app (title, dashboard) |
| `PUBLIC_COMPANY_NAME` | `""` | Tên công ty |
| `PUBLIC_THEME` | `system` | `light` \| `dark` \| `system` |
| `PUBLIC_DEFAULT_THEME` | `dark` | Fallback theme |
| `PUBLIC_DEFAULT_LANGUAGE` | `en` | Ngôn ngữ mặc định |
| `PUBLIC_ENABLE_ANALYTICS` | `false` | Analytics |
| `PUBLIC_ENABLE_ADMIN` | `true` | Route `/admin/*` |
| `PUBLIC_ENABLE_EXPERIMENTAL` | `false` | Tính năng thử nghiệm |

## Feature flags

Khi `false`, route **biến mất hoàn toàn** (sidebar + redirect).

| Biến | Route ảnh hưởng |
|---|---|
| `PUBLIC_ENABLE_MEMORIES` | `/memory` |
| `PUBLIC_ENABLE_PARTNER` | `/partners` |
| `PUBLIC_ENABLE_SHARING` | `/sharing` |
| `PUBLIC_ENABLE_MAP` | `/map` |
| `PUBLIC_ENABLE_PEOPLE` | `/people` |
| `PUBLIC_ENABLE_SEARCH` | `/search`, `/explore` |
| `PUBLIC_ENABLE_TRASH` | `/trash` |
| `PUBLIC_ENABLE_UTILITIES` | `/utilities` |
| `PUBLIC_ENABLE_WORKFLOWS` | `/workflows` |
| `PUBLIC_ENABLE_SHARED_LINKS` | `/shared-links`, `/share`, `/s` |
| `PUBLIC_ENABLE_FOLDERS` | `/folders` |
| `PUBLIC_ENABLE_TAGS` | `/tags` |
| `PUBLIC_ENABLE_ARCHIVE` | `/archive` |
| `PUBLIC_ENABLE_DASHBOARD` | `/dashboard` |

## Thông báo đăng nhập (email admin)

Chỉ hoạt động trên **Vercel production** (serverless function `api/notify-login.ts`). Dev local (`pnpm dev`) không có endpoint này.

### Client (build-time)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PUBLIC_ENABLE_LOGIN_NOTIFY` | `false` | Bật gọi `/api/notify-login` sau login thành công |

### Server (Vercel — không public)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `LOGIN_NOTIFY_ENABLED` | Có | `true` để bật gửi email |
| `RESEND_API_KEY` | Có | API key từ [Resend](https://resend.com) |
| `ADMIN_NOTIFY_EMAIL` | Có | Email admin nhận thông báo |
| `LOGIN_NOTIFY_FROM` | Có | Địa chỉ gửi, vd. `Gallery <noreply@yourdomain.com>` |
| `LOGIN_NOTIFY_SKIP_ADMIN` | Không | `false` để gửi cả khi admin đăng nhập (mặc định bỏ qua admin) |
| `IMMICH_SERVER_URL` | Không | Dùng để xác minh session (đã có sẵn) |

Ví dụ Vercel:

```env
PUBLIC_ENABLE_LOGIN_NOTIFY=true
LOGIN_NOTIFY_ENABLED=true
RESEND_API_KEY=re_xxxxxxxx
ADMIN_NOTIFY_EMAIL=admin@example.com
LOGIN_NOTIFY_FROM=Photo Gallery <noreply@yourdomain.com>
```

Luồng: user login → client gửi `accessToken` tới `/api/notify-login` → server xác minh qua `/api/users/me` → gửi email qua Resend.

## Production tối thiểu (Vercel)

Chỉ cần:

```env
PUBLIC_IMMICH_SERVER_URL=https://immich.example.com
PUBLIC_APP_NAME=My Gallery
```

Khuyến nghị dùng reverse proxy cùng origin để tránh CORS.
