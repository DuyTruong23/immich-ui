# Phát triển — Photo Gallery UI

## Yêu cầu

| Tool | Version |
|---|---|
| Node.js | ≥ 20 (`.node-version`) |
| pnpm | ≥ 10 |
| Git | ≥ 2.30 |
| Docker | Khuyến nghị — Immich backend local |

## Setup nhanh

```bash
git clone <your-origin-url> photo-gallery-ui
cd photo-gallery-ui
pnpm install
cp .env.example .env
cp .env.example upstream/web/.env
```

## Docker Development (khuyến nghị)

```
Immich Docker (:2283)
       ↓ proxy
Custom Frontend (:5283, hot reload)
```

### Một lệnh

```bash
pnpm dev:full
```

Khởi động Immich stack + frontend dev server.

### Hai terminal

```bash
# Terminal 1 — Immich backend
pnpm docker:up

# Terminal 2 — Custom frontend
pnpm dev
```

| URL | Service |
|---|---|
| http://localhost:5283 | Custom frontend (Vite HMR) |
| http://localhost:2283 | Immich API trực tiếp |

Vite proxy forward `/api`, `/.well-known/immich`, `/custom.css`, WebSocket tới `IMMICH_SERVER_URL`.

### Dừng Docker

```bash
pnpm docker:down
```

Chi tiết: [docker/README.md](../docker/README.md)

## Scripts

| Script | Mô tả |
|---|---|
| `pnpm dev` | Frontend dev + hot reload |
| `pnpm dev:full` | Docker Immich + frontend |
| `pnpm docker:up` | Start Immich stack |
| `pnpm docker:down` | Stop Immich stack |
| `pnpm build` | Production build |
| `pnpm preview` | Preview build local |
| `pnpm check` | Lint + typecheck |
| `pnpm prepare:custom` | Merge routes + branding |
| `pnpm release:notes` | Xem trước version + items (không ghi file) |
| `pnpm test:release` | Test logic bump/generate changelog |
| `pnpm sync:upstream` | Sync Immich upstream |

## Workflow

1. Checkout `develop`
2. Code trong `custom/`, `branding/`, `overrides/`
3. Commit `feat:` / `fix:` / `improve:` về UI/UX user rồi push `develop`
4. Merge `develop` → `main` — CI tăng version và generate modal

## Debug

### API không phản hồi

```bash
curl http://localhost:2283/api/server/ping
docker compose -f docker/docker-compose.dev.yml logs -f immich-server
```

### Proxy lỗi

`.env` phải có `IMMICH_SERVER_URL=http://localhost:2283`

### Env: `pnpm dev` vs `pnpm dev:local`

| Lệnh | File env | Mục đích |
|---|---|---|
| `pnpm dev` | `upstream/web/.env` only | Dev bình thường, proxy server Immich |
| `pnpm dev:local` | `.env` + `.env.local` | UI dev mode, mock data, không cần server |

Setup UI dev lần đầu:

```bash
cp upstream/web/.env.local.example upstream/web/.env.local
pnpm dev:local
```

Mở http://localhost:5283/auth/login → chọn **Admin** hoặc **User**.

- Không cần Docker hay server Immich
- Timeline/album trống (không có ảnh thật)
- Dashboard admin dùng dữ liệu mock
- Banner vàng nhắc đang ở dev mode

**API mock (fetch interceptor)** — các route sau có dữ liệu giả:

| Route | Mock |
|---|---|
| `/people` | 4 người (1 hidden) |
| `/explore` | Nhóm theo city + model |
| `/tags` | 6 tags (có parent) |
| `/albums` | Album owned + shared |
| `/locked` | Auth elevated + timeline locked |
| `/admin/system-settings` | SystemConfig đầy đủ |
| `/photos`, `/tags/...`, timeline | Time buckets + ảnh mock |
| Thumbnail/preview | SVG placeholder |

**Không bật `PUBLIC_UI_DEV_MODE` trên Vercel production.**

### Routes upstream mất sau prepare:custom

Script merge **non-destructive** — chỉ thêm route từ `custom/src/routes/`, không xóa upstream routes.

## IDE

- Svelte for VS Code
- Tailwind CSS IntelliSense
- ESLint + Prettier
