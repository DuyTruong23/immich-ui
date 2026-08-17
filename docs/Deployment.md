# Triển khai — Photo Gallery UI

## Kiến trúc

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  Vercel         │ ─────────────► │  Immich Docker       │
│  Static Frontend│  REST + WS     │  VPS / NAS / Mini PC │
└─────────────────┘                └──────────────────────┘
```

Frontend **không có backend riêng** — chỉ cần URL Immich API lúc build.

## Option A — Reverse proxy cùng origin (khuyến nghị)

```
https://photos.example.com/           → Vercel (frontend)
https://photos.example.com/api/       → Immich :2283
https://photos.example.com/api/socket.io → Immich WebSocket
```

**Biến môi trường Vercel:** chỉ cần branding/feature flags — **không cần** `PUBLIC_IMMICH_SERVER_URL` vì SDK dùng relative `/api`.

Caddy example: [docker/caddy/Caddyfile.example](../docker/caddy/Caddyfile.example)

## Option B — Frontend và API khác domain

```
https://gallery.vercel.app   → Frontend
https://immich.example.com   → Immich API
```

**Biến bắt buộc trên Vercel:**

```env
PUBLIC_IMMICH_SERVER_URL=https://immich.example.com
PUBLIC_APP_NAME=WeGallery
```

SDK được cấu hình qua `configureApiClient()` trong `custom/src/providers/api-client.ts`.

> **Lưu ý:** WebSocket (`/api/socket.io`) cần cùng origin hoặc proxy. Option B có thể mất realtime notifications nếu không proxy WebSocket.

---

## Frontend — Vercel

### 1. Import project

- Connect GitHub repo
- Framework: **Other**
- Root: repository root

### 2. Build settings (auto từ `vercel.json`)

| Setting | Value |
|---|---|
| Install | `pnpm install` |
| Build | `pnpm build` |
| Output | `upstream/web/build` |
| Node | 20 |

### 3. Environment variables

**Tối thiểu (Option A — same origin proxy):**

```env
PUBLIC_APP_NAME=WeGallery
PUBLIC_COMPANY_NAME=My Company
```

**Option B (cross-origin):**

```env
PUBLIC_IMMICH_SERVER_URL=https://immich.yourdomain.com
PUBLIC_APP_NAME=WeGallery
```

**Feature flags (tùy chọn):**

```env
PUBLIC_ENABLE_ADMIN=false
PUBLIC_ENABLE_MAP=true
```

Xem đầy đủ: [Environment.md](./Environment.md)

### 4. Deploy

```bash
git push origin main
# Vercel auto-deploy
```

### 5. Verify

- [ ] Login/logout
- [ ] Timeline load
- [ ] Upload ảnh
- [ ] Dashboard `/dashboard`
- [ ] WebSocket notifications

---

## Backend — Immich Docker

### Dev (local)

```bash
pnpm docker:up
```

### Production (VPS/NAS/Mini PC)

```bash
# Trên server
mkdir -p /opt/immich && cd /opt/immich
wget -O docker-compose.yml https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
wget -O .env https://github.com/immich-app/immich/releases/latest/download/example.env

# Sửa .env: DB_PASSWORD, UPLOAD_LOCATION
# Pin version: IMMICH_VERSION=v1.x.x

docker compose up -d
```

Reference: [docker/docker-compose.prod.example.yml](../docker/docker-compose.prod.example.yml)

### Yêu cầu

| Resource | Khuyến nghị |
|---|---|
| RAM | 8 GB |
| Storage | SSD/NAS cho ảnh |
| Port | 2283 (bind localhost, expose via proxy) |

### Môi trường

| Platform | Ghi chú |
|---|---|
| VPS | Hetzner, DigitalOcean, Linode |
| Mini PC | Intel NUC, chạy 24/7 |
| NAS | Synology/TrueNAS — đủ RAM |

---

## Checklist production

1. [ ] Pin Immich Docker image tag (không `latest`)
2. [ ] Strong DB password
3. [ ] HTTPS via Caddy/Nginx
4. [ ] Backup `UPLOAD_LOCATION` + Postgres
5. [ ] Vercel env vars set
6. [ ] Test end-to-end sau deploy

## Rollback

| Layer | Cách |
|---|---|
| Frontend | Vercel → Redeploy previous |
| Backend | `docker compose down` + restore backup |
