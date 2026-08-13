# Production — Vercel + Cloudflare Tunnel (gallery-app.pp.ua)

## Kiến trúc (hybrid — khuyến nghị)

```
Browser → gallery-app.pp.ua/api/*       → Vercel middleware → immich tunnel (REST JSON)
Browser → api.gallery-app.pp.ua/api/assets/* → Cloudflare tunnel (video/ảnh trực tiếp)
Browser → wss://immich.gallery-app.pp.ua/api/socket.io → Cloudflare tunnel (WebSocket)
Browser → gallery-app.pp.ua/*           → Vercel static (custom UI)
```

**REST vẫn same-origin** (`/api`) — tránh CORS Immich. **Media bypass Vercel** qua `PUBLIC_IMMICH_MEDIA_URL`.

## Vercel Environment Variables

```env
# ĐỂ TRỐNG — SDK dùng relative /api (cùng origin) cho REST JSON
PUBLIC_IMMICH_SERVER_URL=

# Media (video/ảnh) trực tiếp qua tunnel — KHÔNG qua Vercel proxy
# Giữ REST qua /api để tránh CORS; chỉ media bypass Vercel
PUBLIC_IMMICH_MEDIA_URL=https://api.gallery-app.pp.ua

# WebSocket trực tiếp — Vercel KHÔNG proxy WebSocket upgrade
PUBLIC_IMMICH_WS_URL=https://immich.gallery-app.pp.ua

# Server-side — Edge Function proxy (không PUBLIC)
IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua

PUBLIC_APP_NAME=Photo Gallery
PUBLIC_DEFAULT_LANGUAGE=vi
PUBLIC_THEME=system
PUBLIC_DEFAULT_THEME=dark
```

> **Quan trọng:** Xóa hoặc để trống `PUBLIC_IMMICH_SERVER_URL`, thêm `IMMICH_SERVER_URL`, rồi **Redeploy**.

## Proxy API

- **`middleware.ts`** (root) — **nguồn duy nhất** proxy `/api/*` → `IMMICH_SERVER_URL` (Edge Middleware, chạy trước SPA fallback)
- **`api/notify-login.ts`** — route riêng, không proxy Immich media
- **`api/notify-deploy.ts`** — webhook Vercel deploy success/fail → email Resend
- **`vercel.json`** — chỉ SPA fallback; **không** rewrite `/api` (tránh trùng hardcode tunnel URL)

Xem [CloudflareTunnel.md](./CloudflareTunnel.md) cho subdomain `api.gallery-app.pp.ua`.

## Kiểm tra

```bash
# Ping REST qua Vercel proxy
curl -sS https://gallery-app.pp.ua/api/server/ping
# → {"res":"pong"}

# Ping media subdomain (sau khi cấu hình tunnel)
curl -sS https://api.gallery-app.pp.ua/api/server/ping
# → {"res":"pong"}

# HTTP Range cho video (206 Partial Content)
pnpm check:range
ASSET_ID=<video-uuid> IMMICH_API_KEY=<key> pnpm check:range
```

Kỳ vọng Range OK:

```text
Status: 206
Accept-Ranges: bytes
Content-Range: bytes 0-65535/...
```

## Immich PC (.env)

```env
IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua
```

## Lỗi "Failed to fetch"

| Nguyên nhân | Fix |
|---|---|
| `PUBLIC_IMMICH_SERVER_URL` set → cross-origin CORS | Để **trống** trên Vercel |
| `/api/*` trả HTML (SPA fallback) | Kiểm tra `middleware.ts` deploy + `IMMICH_SERVER_URL`; redeploy |
| Chưa redeploy sau đổi env | Redeploy |
| Tunnel/Immich down | `docker compose ps` trên PC |
| Thiếu `IMMICH_SERVER_URL` | Set trên Vercel (server env) |
| WebSocket failed trên `/explore` | Set `PUBLIC_IMMICH_WS_URL=https://immich.gallery-app.pp.ua` + redeploy |
| Video seek chậm / tải full file | Chạy `pnpm check:range`; set `PUBLIC_IMMICH_MEDIA_URL`; xem [CloudflareTunnel.md](./CloudflareTunnel.md) |
