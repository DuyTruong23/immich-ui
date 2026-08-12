# Chạy local + Vercel — Immich Docker & poga-v2

> **poga-v2** = frontend (local dev). **Immich Docker** = backend media (bất kỳ folder compose nào).  
> Không bắt buộc dùng repo `photo-gallery-v1` — chỉ cần Immich chạy được và poga-v2 trỏ đúng URL API.

---

## Hai chế độ vận hành

```
┌─ LOCAL DEV (máy bạn) ─────────────────────────────────────────────────┐
│                                                                         │
│   Immich Docker :2283          Vite dev :5283                          │
│   (compose bất kỳ)      ←──→   poga-v2                                 │
│   localhost:2283               IMMICH_SERVER_URL=localhost:2283       │
│                                hoặc tunnel URL                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─ VERCEL PRODUCTION (internet) ────────────────────────────────────────┐
│                                                                         │
│   gallery-app.pp.ua (static CDN)                                       │
│        /api/*  ──rewrite──►  https://immich.gallery-app.pp.ua (tunnel)│
│                                                                         │
│   ⚠ Không chạy Docker trên Vercel — Immich phải online ở máy/tunnel  │
└─────────────────────────────────────────────────────────────────────────┘
```

| | **Local dev** | **Vercel (production)** |
|---|---|---|
| poga-v2 | `pnpm dev` → `:5283` | Build static, host CDN |
| Immich | Docker **trên máy bạn** (hoặc máy khác qua tunnel) | Docker **máy nhà/VPS** + tunnel/proxy |
| Ảnh lưu ở đâu | Máy chạy Immich | Máy chạy Immich (không phải Vercel) |
| Tắt Immich thì sao | Frontend load, API lỗi | Website mở được, **login/xem ảnh lỗi** |

---

## Phần 1 — Chạy local (poga-v2 + Immich Docker)

### Bước 1: Immich Docker (backend)

Immich backend production nằm trong repo **`immich-docker`** (PC B / HDD portable):

- `<HDD>/Immich-Gallery/immich-gallery/immich-docker/`
- External library: `../../Photo_Gallery` (relative — không phụ thuộc ổ `F:`/`E:`)

Compose dev trong `immich-ui/docker/` **không** mount external library — chỉ dùng cho dev frontend.

**Yêu cầu:** container `immich-server` lắng nghe **port 2283**.

```bash
# Production / PC B — chạy từ immich-docker trên HDD
cd /mnt/f/Project/Immich-Gallery/immich-gallery/immich-docker
docker compose up -d

curl http://localhost:2283/api/server/ping   # → pong
```

#### External library (ảnh có sẵn trên HDD — portable)

Cấu hình trong repo **`immich-docker`**, không phải poga-v2. External library dùng **relative path** — không cần sửa khi đổi drive letter (`F:` → `E:`).

**Cấu trúc HDD bắt buộc:**

```text
<HDD>/Immich-Gallery/
├── immich-gallery/
│   └── immich-docker/
│       └── docker-compose.yml
└── Photo_Gallery/
```

Trong `immich-docker/docker-compose.yml`:

```yaml
volumes:
  - ${UPLOAD_LOCATION:-./library}:/data
  - ../../Photo_Gallery:/external-library:ro
```

**Không cần** `EXTERNAL_LIBRARY_PATH` trong `.env` — Docker Compose tự resolve `../../Photo_Gallery` từ thư mục `immich-docker`.

Sau khi `docker compose up -d`:

1. Immich UI → **Administration → External Libraries**
2. Add folder **`/external-library`** (path trong container)
3. **Scan New Library Files**

> Chi tiết: [PORTABLE-EXTERNAL-LIBRARY.md](../../docs/PORTABLE-EXTERNAL-LIBRARY.md)  
> WSL + ổ F: chưa mount → `./scripts/setup-wsl-f-drive.sh` trong `immich-docker`

---

### Bước 2: poga-v2 (frontend local)

```bash
cd poga-v2
pnpm install
cp .env.example .env
cp .env.example upstream/web/.env
```

Chỉnh **`.env`** và **`upstream/web/.env`**:

#### Cách A — Immich cùng máy (phổ biến khi dev)

```env
IMMICH_SERVER_URL=http://localhost:2283
VITE_IMMICH_API_URL=http://localhost:2283
PUBLIC_IMMICH_SERVER_URL=
```

#### Cách B — Immich qua tunnel (PC tắt local, dùng server remote)

```env
IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua
VITE_IMMICH_API_URL=https://immich.gallery-app.pp.ua
PUBLIC_IMMICH_SERVER_URL=
```

Chạy:

```bash
pnpm prepare:custom
pnpm dev
```

Mở **http://localhost:5283** — Vite proxy `/api` → `IMMICH_SERVER_URL`.

**Không cần** `pnpm docker:up` trong poga-v2 nếu Immich đã chạy ở folder compose riêng.

---

### Bước 3: Kiểm tra local

| Kiểm tra | Kỳ vọng |
|---|---|
| `curl localhost:2283/api/server/ping` | `pong` |
| http://localhost:5283 | Trang login / gallery |
| Login | Vào được timeline |
| Tắt Docker Immich + F5 | Login/API lỗi (frontend vẫn mở shell) |

---

## Phần 2 — Vercel khi **không** chạy Docker Immich

Vercel **chỉ host file tĩnh** (HTML, JS, CSS). **Không** chạy Immich, Postgres, ML.

### Luồng production

```
User → gallery-app.pp.ua (Vercel CDN)
         ├── /, /photos, …     → index.html + JS (luôn có nếu Vercel up)
         └── /api/*            → rewrite → immich.gallery-app.pp.ua (máy bạn)
```

Cấu hình hiện tại: `vercel.json` rewrite `/api/(.*)` → `https://immich.gallery-app.pp.ua/api/$1`.

### Khi Immich Docker **đang tắt** (PC sleep, tunnel down, …)

| Thành phần | Hành vi |
|---|---|
| Trang web (UI shell) | **Vẫn mở** — HTML/JS tải từ Vercel |
| Login | **Thất bại** — `/api/auth/login` lỗi 502/504/timeout |
| Timeline / ảnh | **Không load** — mọi `/api/*` fail |
| Upload | **Không được** |
| WebSocket (notifications) | **Không kết nối** |

User thường thấy: màn hình login, spinner mãi, hoặc thông báo lỗi mạng — **không mất website**, chỉ mất backend.

### Khi Immich **bật** + tunnel **chạy**

Mọi thứ hoạt động bình thường — Vercel không cần redeploy.

### Điều kiện để Vercel hoạt động

1. **Máy chạy Immich** bật 24/7 (hoặc giờ dùng) **hoặc** VPS riêng.
2. **Cloudflare Tunnel** (hoặc reverse proxy) trỏ `immich.gallery-app.pp.ua` → `:2283`.
3. Vercel env: `IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua` (cho middleware nếu dùng).

> **Tóm lại:** Vercel = mặt tiền cửa hàng. Immich = kho + máy chủ. Cửa mở nhưng kho đóng cửa → vào được sảnh, không lấy được hàng.

---

## So sánh nhanh: Local vs Vercel

| Câu hỏi | Local dev | Vercel |
|---|---|---|
| Cần Docker Immich? | Có (hoặc tunnel tới Immich remote) | **Không trên Vercel** — Immich chạy nơi khác |
| poga-v2 chạy đâu? | `pnpm dev` máy bạn | CDN Vercel |
| Tắt PC chạy Immich? | Local dev mất API | **Production mất API** |
| External library? | Cấu hình trên máy Docker | Cùng máy Docker (Vercel không đụng) |
| Repo photo-gallery-v1? | **Không bắt buộc** — chỉ cần compose Immich |

---

## External library — portable (immich-docker)

External library **không** liên quan poga-v2 hay Vercel. Chỉ cấu hình trên **máy chạy Immich Docker** (`immich-docker`):

```text
<HDD>/Immich-Gallery/
├── immich-gallery/immich-docker/   ← chạy docker compose ở đây
└── Photo_Gallery/                  ← ../../Photo_Gallery (relative)
         ↓ docker bind (read-only)
    /external-library trong container
         ↓ Immich UI scan
    Ảnh hiện trên gallery (local hoặc Vercel — cùng API)
```

| Thành phần | Giá trị |
|---|---|
| `docker-compose.yml` mount | `../../Photo_Gallery:/external-library:ro` |
| `.env` | **Không cần** path external — đã cấu hình trong compose |
| Immich UI add folder | Luôn là **`/external-library`** |
| Đổi máy / drive letter | **Không sửa** compose — giữ cấu trúc thư mục HDD |

**Lệnh kiểm tra** (trong `immich-docker`):

```bash
./scripts/verify-mount.sh
```

Tài liệu đầy đủ: [PORTABLE-EXTERNAL-LIBRARY.md](../../docs/PORTABLE-EXTERNAL-LIBRARY.md)

---

## Lệnh tóm tắt

**Immich production (HDD / PC B):**

```bash
cd /path/to/Immich-Gallery/immich-gallery/immich-docker
docker compose up -d
./scripts/verify-mount.sh
curl http://localhost:2283/api/server/ping
```

**poga-v2 local:**

```bash
cd poga-v2
# .env: IMMICH_SERVER_URL=http://localhost:2283
pnpm prepare:custom && pnpm dev
# → http://localhost:5283
```

**Vercel:** push git → auto deploy. Immich + tunnel phải **online** riêng.

---

## Tài liệu liên quan

| File | Nội dung |
|---|---|
| [Development.md](./Development.md) | Dev workflow poga-v2 |
| [Deployment.md](./Deployment.md) | Vercel + env production |
| [Environment.md](./Environment.md) | Biến môi trường |
| [PORTABLE-EXTERNAL-LIBRARY.md](../../docs/PORTABLE-EXTERNAL-LIBRARY.md) | External library portable (immich-docker) |
