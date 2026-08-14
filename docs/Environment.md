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

## Resend (gửi email)

App dùng [Resend](https://resend.com) cho login notify, deploy notify, feedback và changelog. Các tính năng email dùng chung `RESEND_API_KEY` và `LOGIN_NOTIFY_FROM`.

### Bắt đầu nhanh (chưa verify domain)

```env
RESEND_API_KEY=re_xxxxxxxx
LOGIN_NOTIFY_FROM=Photo Gallery <onboarding@resend.dev>
ADMIN_NOTIFY_EMAIL=<email đăng ký tài khoản Resend>
```

`onboarding@resend.dev` gửi được ngay, không cần verify domain.

### Giới hạn quan trọng

**Khi chưa verify domain**, Resend **chỉ gửi được tới email đã đăng ký tài khoản Resend** (email bạn dùng đăng ký/sign up Resend).

| Mục đích | Biến cần khớp email Resend |
|---|---|
| Thông báo admin (login, deploy, feedback) | `ADMIN_NOTIFY_EMAIL` |
| Test local / staging | Mọi địa chỉ `to` trong script test |

Các tính năng gửi tới **user bất kỳ** (đăng ký changelog, partner favorite, …) **sẽ thất bại** nếu user nhập email khác email đăng ký Resend.

### Gửi cho mọi user (production)

#### Bước 1 — Thêm domain trên Resend

1. Mở [Resend → Domains](https://resend.com/domains) → **Add domain**.
2. Điền form (ví dụ setup `gallery-app.pp.ua`):

| Trường | Gợi ý | Ghi chú |
|---|---|---|
| **Name** | `gallery-app.pp.ua` | Domain bạn sở hữu (DNS đang ở Cloudflare) |
| **Region** | `Tokyo (ap-northeast-1)` | Chọn region gần user (VN → Tokyo hợp lý) |
| **Custom Return-Path** | `send` | Mặc định; tạo subdomain `send.gallery-app.pp.ua` cho bounce |
| **Enable click tracking** | Bật/tắt tùy ý | Email transactional (login notify) có thể **tắt** |
| **Enable open tracking** | Khuyến nghị **tắt** | Resend cảnh báo open tracking dễ sai số |

3. Bấm **+ Add domain**.
4. Vào tab **Records** của domain vừa tạo — Resend hiển thị **3 bản ghi** cần thêm (giá trị copy từ dashboard, **không** tự đoán).

#### Bước 2 — Thêm DNS trên Cloudflare (thủ công)

Sau **+ Add domain**, Resend mở trang chi tiết domain với tab **Records** — đây là bước chính. Copy từng dòng sang Cloudflare.

Zone DNS: `gallery-app.pp.ua` (cùng zone với tunnel `api.*`, `immich.*`).

Cloudflare Dashboard → **DNS** → **Add record** cho từng dòng trong tab **Records** của Resend:

| Loại | Name (Cloudflare) | Nội dung | Priority | Proxy |
|---|---|---|---|---|
| `MX` | `send` | Copy **Content** từ Resend | `10` | **DNS only** (grey cloud) |
| `TXT` | `send` | Copy SPF (`v=spf1 include:…`) | — | DNS only |
| `TXT` | `resend._domainkey` | Copy DKIM public key (`p=…`) | — | DNS only |

> **Không thấy "Sign in to Cloudflare"?** Bình thường — nút này không phải lúc nào cũng hiện (Resend chỉ bật Domain Connect cho một số tài khoản/flow). **Thêm 3 bản ghi thủ công** như bảng trên là đủ.

Lưu ý khi paste vào Cloudflare:

- **Name** chỉ gõ `send` hoặc `resend._domainkey` — Cloudflare tự thêm `.gallery-app.pp.ua`.
- **Không** bật proxy (orange cloud) cho bản ghi email.
- Copy **nguyên xi** từ Resend; mỗi domain có giá trị MX/DKIM riêng.
- Nếu Priority `10` đã dùng cho MX khác, thử `20` hoặc `30`.

Resend khuyến nghị dùng **subdomain** gửi mail (ví dụ `mail.gallery-app.pp.ua`) thay vì root domain — tách reputation email khỏi web. Root domain vẫn dùng được nếu bạn chỉ gửi transactional.

#### Bước 3 — Verify và chờ Verified

1. Quay lại Resend → domain → bấm **Verify DNS Records**.
2. Thường verify trong **15–30 phút**; DNS có thể propagate tới **72 giờ**.
3. Trạng thái chuyển **Verified** khi cả SPF, DKIM, MX đều pass.
4. Nếu lâu không verify: kiểm tra [dns.email](https://dns.email/) hoặc bấm **Restart verification** trên Resend.

Tài liệu Resend: [Cloudflare + Resend](https://resend.com/docs/knowledge-base/cloudflare), [Domain không verify](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying).

#### Bước 4 — Cập nhật Vercel và redeploy

Sau **Verified**, đổi địa chỉ gửi (bất kỳ local-part nào trên domain đã verify — không cần tạo mailbox):

```env
LOGIN_NOTIFY_FROM=Photo Gallery <noreply@gallery-app.pp.ua>
```

Redeploy Vercel. Từ đây Resend gửi được tới **mọi email hợp lệ** (changelog subscribe, admin notify, …) — không còn giới hạn email đăng ký Resend.

> Tuỳ chọn sau verify: thêm DMARC (`_dmarc`) để chống spoof — Resend không tự thêm. Xem [Resend — DMARC](https://resend.com/docs/dashboard/domains/dmarc).

---

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
| `LOGIN_NOTIFY_FROM` | Có | Địa chỉ gửi Resend. Dùng nhanh: `Photo Gallery <onboarding@resend.dev>` (không cần verify domain) |
| `LOGIN_NOTIFY_SKIP_ADMIN` | Không | `false` để gửi cả khi admin đăng nhập (mặc định bỏ qua admin) |
| `IMMICH_SERVER_URL` | Không | Dùng để xác minh session (đã có sẵn) |

Ví dụ Vercel:

```env
PUBLIC_ENABLE_LOGIN_NOTIFY=true
LOGIN_NOTIFY_ENABLED=true
RESEND_API_KEY=re_xxxxxxxx
ADMIN_NOTIFY_EMAIL=admin@example.com
LOGIN_NOTIFY_FROM=Photo Gallery <onboarding@resend.dev>
```

> Xem mục **[Resend (gửi email)](#resend-gửi-email)** — đặt `ADMIN_NOTIFY_EMAIL` khớp email đăng ký Resend nếu chưa verify domain.

Luồng: user login → client gửi `accessToken` tới `/api/notify-login` → server xác minh qua `/api/users/me` → gửi email qua Resend.

## Thông báo deploy Vercel (email admin)

Chỉ hoạt động trên **Vercel production** (`api/notify-deploy.ts`). Cấu hình webhook trong Vercel Dashboard → Settings → Webhooks.

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DEPLOY_NOTIFY_ENABLED` | Có | `true` để bật gửi email |
| `DEPLOY_NOTIFY_WEBHOOK_SECRET` | Có | Secret hiển thị khi tạo webhook Vercel (xác minh `x-vercel-signature`) |
| `RESEND_API_KEY` | Có | Dùng chung với login notify |
| `ADMIN_NOTIFY_EMAIL` | Có | Email admin nhận thông báo |
| `LOGIN_NOTIFY_FROM` | Có | Địa chỉ gửi (hoặc `DEPLOY_NOTIFY_FROM`) |

**Webhook URL:** `https://<domain>/api/notify-deploy`

**Events cần chọn:** `Deployment Succeeded`, `Deployment Error`

Ví dụ Vercel:

```env
DEPLOY_NOTIFY_ENABLED=true
DEPLOY_NOTIFY_WEBHOOK_SECRET=whsec_xxxxxxxx
RESEND_API_KEY=re_xxxxxxxx
ADMIN_NOTIFY_EMAIL=admin@example.com
LOGIN_NOTIFY_FROM=Photo Gallery <onboarding@resend.dev>
```

Luồng: Vercel deploy xong/lỗi → POST webhook → xác minh chữ ký → gửi email qua Resend.

## Modal cập nhật tính năng sau login

Hiển thị modal **"Tính năng được cập nhật"** sau khi đăng nhập thành công (và qua nút **Tính năng mới** trên navbar).

**Nguồn:** `custom/src/data/feature-updates.json` — bạn sửa tay; modal đọc file lúc build. Không tự tăng version.

**Admin UI:** `/admin/feature-updates` — xem file + xem thử modal (không lưu Blob).

Checklist: [feature-updates/FEAT-READ.md](../feature-updates/FEAT-READ.md). Chi tiết: [UserMessaging.md](./UserMessaging.md).

### Gửi góp ý qua email (Vercel)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `FEEDBACK_ENABLED` | Có | `true` để gửi góp ý qua Resend |
| `RESEND_API_KEY` | Có | Dùng chung với login notify |
| `ADMIN_NOTIFY_EMAIL` | Có | Email admin nhận góp ý |
| `LOGIN_NOTIFY_FROM` | Có | Địa chỉ gửi |

```env
FEEDBACK_ENABLED=true
```

Luồng: login → modal → user nhập góp ý → đóng modal → POST `/api/feedback` → email admin.

### Email nhận changelog khi có version mới

User nhập **Email nhận thông báo** trên modal. Danh sách lưu private trên Vercel Blob (`feature-updates/subscribers.json`).

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Có | Lưu danh sách email. Vercel → Storage → Blob → Create → Connect project (tự thêm env, rồi redeploy) |
| `RESEND_API_KEY` | Có | Gửi changelog |
| `LOGIN_NOTIFY_FROM` | Có | Địa chỉ gửi |
| `PUBLIC_APP_URL` | Không | Link "Mở Gallery" / hủy đăng ký trong email. Fallback `VERCEL_PROJECT_PRODUCTION_URL` |
| `FEATURE_UPDATE_NOTIFY_URL` | Không | `https://<domain>/api/feature-update-notify` — gọi tay nếu muốn gửi mail changelog |
| `FEATURE_UPDATE_NOTIFY_SECRET` | Có nếu dùng notify | Bearer secret để kích hoạt gửi mail |

```env
FEATURE_UPDATE_NOTIFY_URL=https://<domain>/api/feature-update-notify
FEATURE_UPDATE_NOTIFY_SECRET=replace-me
```

Luồng: user nhập email → POST `/api/feature-update-email` → lưu danh sách (cần `BLOB_READ_WRITE_TOKEN`) + email admin. Góp ý đi `/api/feedback` riêng — không bị chặn nếu chưa có Blob. Mail changelog: admin gửi từ `/admin/feature-updates`.

Local (`pnpm dev`): cùng handler, danh sách ghi `.data/feature-updates/subscribers.json` nếu chưa có Blob token. Production: Vercel Blob.

> Đăng ký changelog gửi tới email user — **bắt buộc verify domain** trước khi dùng production. Xem **[Resend (gửi email)](#resend-gửi-email)**.

## Trang "Hệ thống đang cập nhật dữ liệu."

Khi Immich/tunnel không phản hồi (5xx, 404 API, `failed to fetch`), app hiển thị trang thân thiện thay vì lỗi Immich mặc định.

| Phần | File chỉnh |
|---|---|
| Tiêu đề *Hệ thống đang cập nhật dữ liệu.* | `custom/src/components/ServerConnectionErrorPage.svelte` |
| Mô tả (giờ quay lại, lời nhắn) | `SERVER_CONNECTION_MESSAGE` trong `custom/src/utils/server-connection-error.ts` |

Xem [UserMessaging.md](./UserMessaging.md).

## Production tối thiểu (Vercel)

Xem [VercelProduction.md](./VercelProduction.md). Tóm tắt:

```env
PUBLIC_IMMICH_SERVER_URL=
PUBLIC_IMMICH_WS_URL=https://immich.gallery-app.pp.ua
PUBLIC_IMMICH_MEDIA_URL=https://api.gallery-app.pp.ua
IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua
PUBLIC_APP_NAME=Photo Gallery
```

Tối ưu mobile / ép tắt video-ảnh gốc **không thêm biến mới**. Video trên điện thoại phụ thuộc `PUBLIC_IMMICH_MEDIA_URL` (đã có trên Vercel).

**Không set** `PUBLIC_IMMICH_SERVER_URL` cross-origin — Immich không hỗ trợ CORS; REST qua `/api` proxy same-origin.
