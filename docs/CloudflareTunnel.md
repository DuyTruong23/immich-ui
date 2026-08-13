# Cloudflare Tunnel — `api.gallery-app.pp.ua` + media trực tiếp

Hướng dẫn tách subdomain media khỏi Vercel UI, giữ REST JSON qua `/api` proxy (tránh CORS Immich).

## Kiến trúc mục tiêu

```text
gallery-app.pp.ua          → Vercel (UI static + /api REST proxy)
api.gallery-app.pp.ua      → Cloudflare Tunnel → Immich :2283 (video/ảnh)
immich.gallery-app.pp.ua   → Cloudflare Tunnel → Immich :2283 (WebSocket + admin)
```

Browser load video từ `api.gallery-app.pp.ua` — **không** đi qua Vercel Edge.

## 1. DNS (Cloudflare Dashboard)

Trong zone `gallery-app.pp.ua`:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `api` | `<tunnel-id>.cfargotunnel.com` | Proxied (orange) |
| CNAME | `immich` | `<tunnel-id>.cfargotunnel.com` | Proxied |

`gallery-app.pp.ua` trỏ Vercel (không qua tunnel).

## 2. Cloudflared config (PC chạy Immich)

File `~/.cloudflared/config.yml` (hoặc trong Docker):

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /path/to/<TUNNEL_UUID>.json

ingress:
  # Media + API trực tiếp (frontend dùng PUBLIC_IMMICH_MEDIA_URL)
  - hostname: api.gallery-app.pp.ua
    service: http://127.0.0.1:2283

  # WebSocket, admin, backup API
  - hostname: immich.gallery-app.pp.ua
    service: http://127.0.0.1:2283

  - service: http_status:404
```

Khởi động lại tunnel sau khi sửa:

```bash
cloudflared tunnel run <TUNNEL_NAME>
# hoặc: docker compose restart cloudflared
```

## 3. Cloudflare — không cache video private

**Không** bật Cache Everything cho `/api/assets/*` — Immich dùng auth cookie/key.

### Cache Rules (khuyến nghị)

Tạo rule **Bypass cache**:

- **If:** Hostname equals `api.gallery-app.pp.ua` AND URI Path starts with `/api/assets/`
- **Then:** Bypass cache

Hoặc Page Rule cũ: `api.gallery-app.pp.ua/api/assets/*` → Cache Level: Bypass.

### HTTP/2 và HTTP/3

Bật mặc định trong **Network** → HTTP/2, HTTP/3 (QUIC). Không cần tắt Range — Cloudflare forward `Range` header tới origin.

## 4. Immich server

Đảm bảo Immich lắng nghe `2283` và container healthy:

```bash
curl -sS http://127.0.0.1:2283/api/server/ping
# → {"res":"pong"}
```

Immich trả `Accept-Ranges: bytes` cho file video gốc và playback transcoded — không cần cấu hình thêm nếu không có reverse proxy phá Range.

## 5. Vercel env (UI)

```env
PUBLIC_IMMICH_SERVER_URL=
PUBLIC_IMMICH_MEDIA_URL=https://api.gallery-app.pp.ua
PUBLIC_IMMICH_WS_URL=https://immich.gallery-app.pp.ua
IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua
```

Redeploy sau khi set env.

## 6. Kiểm tra

```bash
# Ping subdomain media
curl -sS https://api.gallery-app.pp.ua/api/server/ping

# Range (cần ASSET_ID + API key)
ASSET_ID=<video-uuid> IMMICH_API_KEY=<key> pnpm check:range
```

Kỳ vọng mục **media trực tiếp**:

```text
Status: 206
Accept-Ranges: bytes
Content-Range: bytes 0-65535/...
```

## 7. Troubleshooting

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| `api.*` SSL error | DNS chưa trỏ tunnel | Kiểm tra CNAME + `cloudflared tunnel route dns` |
| `api.*` → Vercel `DEPLOYMENT_NOT_FOUND` | Subdomain trỏ nhầm Vercel thay vì tunnel | Xóa CNAME Vercel; trỏ `api` → `<tunnel>.cfargotunnel.com` (Cloudflare proxied) |
| Video 401 | Thiếu session trên media domain | Cookie không share cross-subdomain — UI dùng query `key` hoặc API key trong URL auth params Immich |
| Status 200 thay vì 206 | Proxy buffer full file | Bypass cache; kiểm tra không có nginx `proxy_buffering on` giữa tunnel và Immich |
| CORS error trên fetch API | Set nhầm `PUBLIC_IMMICH_SERVER_URL` | Để trống — chỉ set `PUBLIC_IMMICH_MEDIA_URL` |
| WebSocket fail | WS qua Vercel | Giữ `PUBLIC_IMMICH_WS_URL=https://immich.gallery-app.pp.ua` |

### Cookie cross-subdomain

Immich session cookie gắn domain tunnel. UI ở `gallery-app.pp.ua`, media ở `api.gallery-app.pp.ua` — **cookie login không tự gửi sang subdomain media**.

Frontend fork xử lý bằng auth query params (`authManager.params`) trên URL media — đúng với Immich shared-link pattern. Nếu playback 401 sau khi tách domain, kiểm tra DevTools → request media có `?key=` hoặc dùng API key test.

## 8. Upload bandwidth (PC nhà)

Tunnel không tăng upload ISP. Video 100 MB @ upload 20 Mbps ≈ 40 giây lý thuyết. Tối ưu tunnel/UI không thay thế nâng băng thông upload.

## Liên quan

- [VercelProduction.md](./VercelProduction.md) — env Vercel + proxy REST
- [Environment.md](./Environment.md) — biến `PUBLIC_IMMICH_MEDIA_URL`
- `pnpm check:range` — script kiểm tra Range
