# Thông báo người dùng — modal tính năng & trang bảo trì

Tài liệu hướng dẫn chỉnh **modal "Tính năng được cập nhật"** và trang lỗi **"Hệ thống đang cập nhật dữ liệu."** khi Immich/tunnel không phản hồi.

---

## 1. Modal "Tính năng được cập nhật"

### Khi nào hiển thị

Sau **đăng nhập thành công**, modal tự mở một lần với danh sách thay đổi gần nhất.

```text
User login → AuthLogin event → FeatureUpdateOnLogin.svelte → FeatureUpdateModal
```

| Môi trường | Hành vi |
|---|---|
| Production / `pnpm dev` | Danh sách từ `FEATURE_UPDATES` |
| `pnpm dev:local` (`PUBLIC_UI_DEV_MODE=true`) | Danh sách mock từ `FEATURE_UPDATES_MOCK` |

### Cách cập nhật danh sách tính năng

**File chính:** `custom/src/constants/feature-updates.ts`

```typescript
export const FEATURE_UPDATES = [
  'Mô tả tính năng hoặc thay đổi mới — dòng 1',
  'Mô tả tính năng hoặc thay đổi mới — dòng 2',
] as const;
```

**Quy trình mỗi lần deploy có thay đổi UX:**

1. Thêm hoặc sửa các dòng trong `FEATURE_UPDATES` (tiếng Việt, ngắn gọn, bullet).
2. Commit + push → Vercel redeploy.
3. User đăng nhập lại sẽ thấy modal với nội dung mới.

**Mock cho dev:** `custom/src/mocks/feature-updates.ts` — chỉ dùng khi preview local, không ảnh hưởng production.

### Hành vi modal

| Tính năng | Chi tiết |
|---|---|
| Tiêu đề | `Tính năng được cập nhật` |
| Auto-close | **5 giây** — timer dừng khi user focus/ gõ vào ô góp ý |
| Góp ý | Textarea + nút **Gửi góp ý** → POST `/api/feedback` (cần `FEEDBACK_ENABLED=true` trên Vercel) |
| Preview local | Trang login dev mode → nút **Xem modal "Tính năng được cập nhật"** |

### File liên quan

| File | Vai trò |
|---|---|
| `custom/src/constants/feature-updates.ts` | **Danh sách production** — sửa ở đây |
| `custom/src/mocks/feature-updates.ts` | Mock cho `dev:local` |
| `custom/src/routes/FeatureUpdateModal.svelte` | UI modal |
| `custom/src/routes/FeatureUpdateOnLogin.svelte` | Gắn modal sau login |
| `custom/src/routes/auth/login/+page.svelte` | Nút preview (dev mode) |
| `custom/src/hooks/feedback-submit.ts` | Gửi góp ý email |

### Env liên quan

Xem [Environment.md](./Environment.md) — mục **Modal cập nhật tính năng** và **Feedback (Resend)**.

---

## 2. Trang "Hệ thống đang cập nhật dữ liệu."

### Khi nào hiển thị

Thay cho trang lỗi Immich mặc định khi frontend **không kết nối được** Immich backend:

| Tình huống | Ví dụ |
|---|---|
| Tunnel / PC Immich tắt | Cloudflare error 1033, `failed to fetch` |
| HTTP 5xx | 502 Bad Gateway, 503 Service Unavailable |
| HTTP 404 API | `/api/server/ping` trả 404 |
| Network error | `ECONNREFUSED`, timeout |

Logic phát hiện: `custom/src/utils/server-connection-error.ts` → `isServerConnectionError()`.

Luồng:

```text
+layout.ts init() lỗi → ErrorLayout.svelte → ServerConnectionErrorPage
hooks.client.ts lỗi fetch → cùng ErrorLayout
```

### Giao diện

| Phần | Nguồn | Mặc định |
|---|---|---|
| Mã hiển thị (số lớn) | HTTP status thực hoặc fallback | `505` |
| **Tiêu đề** | Hardcode trong component | **Hệ thống đang cập nhật dữ liệu.** |
| **Mô tả** | `SERVER_CONNECTION_MESSAGE` | Thời gian quay lại / lời nhắn tùy chỉnh |

Ví dụ trên màn hình:

```text
505
Hệ thống đang cập nhật dữ liệu.
Cảm ơn bạn đã ghé thăm, chúng tôi sẽ quay lại vào 17:30 ngày 13/8/2026.
```

### Cách chỉnh nội dung

#### Mô tả (dòng phụ — thay đổi thường xuyên)

**File:** `custom/src/utils/server-connection-error.ts`

```typescript
export const SERVER_CONNECTION_MESSAGE =
  'Cảm ơn bạn đã ghé thăm, chúng tôi sẽ quay lại vào 17:30 ngày 13/8/2026.';
```

Sửa chuỗi → commit → redeploy Vercel.

#### Tiêu đề chính

**File:** `custom/src/components/ServerConnectionErrorPage.svelte`

```svelte
<h1 class="pg-server-error__title">Hệ thống đang cập nhật dữ liệu.</h1>
```

#### Mã số hiển thị mặc định (khi không đọc được HTTP status)

**File:** `custom/src/utils/server-connection-error.ts`

```typescript
export const SERVER_CONNECTION_DISPLAY_CODE = 505;
```

#### Style (mobile, dark mode)

**File:** `custom/src/styles/custom.css` — class `.pg-server-error*`

### File liên quan

| File | Vai trò |
|---|---|
| `custom/src/utils/server-connection-error.ts` | Message, mã 505, logic phát hiện lỗi |
| `custom/src/components/ServerConnectionErrorPage.svelte` | UI trang bảo trì |
| `custom/src/routes/ErrorLayout.svelte` | Chọn trang bảo trì vs lỗi Immich mặc định |
| `custom/src/routes/+layout.ts` | Bắt lỗi init server |
| `custom/src/hooks.client.ts` | Log lỗi kết nối client |

### Khác với Maintenance mode Immich

| | Trang custom 505 | Immich maintenance |
|---|---|---|
| Kích hoạt | Tunnel down, API lỗi | Admin bật maintenance trong Immich |
| Route | Mọi trang khi init fail | Redirect `/maintenance` |
| Message | `SERVER_CONNECTION_MESSAGE` | Cấu hình server Immich |

---

## Checklist nhanh

### Sau mỗi release UI có thay đổi user-facing

- [ ] Cập nhật `FEATURE_UPDATES` trong `feature-updates.ts`
- [ ] Redeploy Vercel

### Trước khi bảo trì / tắt PC Immich

- [ ] Cập nhật `SERVER_CONNECTION_MESSAGE` (giờ quay lại)
- [ ] Redeploy Vercel (nếu cần message mới trên production)

### Kiểm tra local

```bash
# Modal tính năng
pnpm dev:local
# → /auth/login → "Xem modal Tính năng được cập nhật"

# Trang bảo trì — tắt Immich hoặc set IMMICH_SERVER_URL sai, reload app
```

---

## Liên quan

- [Environment.md](./Environment.md) — `FEEDBACK_ENABLED`, Resend
- [Customization.md](./Customization.md) — triết lý override vs custom
- [VercelProduction.md](./VercelProduction.md) — tunnel offline → trang này xuất hiện
