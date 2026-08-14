# FEAT-READ — việc bạn tự cập nhật khi ship tính năng

Hệ thống **không** tự tăng version hay generate changelog từ commit. Mọi thứ dưới đây do **bạn** sửa tay.

Checklist khi có tính năng user mới:

## 1. Changelog modal (bắt buộc nếu user cần thấy)

File: [`custom/src/data/feature-updates.json`](../custom/src/data/feature-updates.json)

Modal đọc **đúng file này** (lúc build). Không qua Blob, không generate từ git.

Thêm object **vào đầu** mảng `releases` (mới nhất trước):

```json
{
  "releases": [
    {
      "version": "v1.0.9",
      "items": [
        {
          "title": "Tiêu đề ngắn tiếng Việt",
          "detail": "Hướng dẫn khi user bấm mở rộng. Có thể bỏ field này."
        }
      ]
    }
  ]
}
```

| Field | Bắt buộc | Ý nghĩa |
|---|---|---|
| `releases` | Có | Danh sách phiên bản, mới nhất đứng đầu |
| `version` | Có | Nhãn trên modal, ví dụ `v1.0.9` |
| `items` | Có | Ít nhất 1 mục |
| `title` | Có | Dòng in đậm |
| `detail` | Không | Hiện khi user bấm mở rộng |

Giữ các bản cũ bên dưới. User chưa xem `version` đầu tiên sẽ thấy modal sau login.

Xem thử: `/admin/feature-updates` → **Xem thử modal**.

Chi tiết format: [README.md](./README.md).

## 2. Đưa lên production (bắt buộc)

Vercel **không** deploy nhánh `develop`. Chỉ `main`.

```bash
git add custom/src/data/feature-updates.json
git commit -m "chore: changelog v1.0.9"
git push origin develop

git checkout main
git pull origin main
git merge develop
git push origin main
```

Sau deploy Vercel, user mới thấy changelog.

## 3. i18n (nếu thêm chữ trên UI)

Không i18n nội dung changelog (`title` / `detail` trong JSON — viết tiếng Việt sẵn).

Nếu thêm **nhãn nút, title trang, placeholder** mới:

- [`upstream/i18n/vi.json`](../upstream/i18n/vi.json)
- [`upstream/i18n/en.json`](../upstream/i18n/en.json)

Rồi dùng `$t('...')` trong file Svelte dưới `custom/src/routes/` (file copy sang upstream). **Không** import `svelte-i18n` từ file `.ts` trong `custom/src/` (lỗi build).

## 4. Biến môi trường Vercel (khi đụng mail / góp ý)

Chỉ cần kiểm tra nếu tính năng dùng email. Dashboard Vercel → Environment Variables.

| Việc | Biến |
|---|---|
| Góp ý trên modal | `FEEDBACK_ENABLED=true`, `RESEND_API_KEY`, `ADMIN_NOTIFY_EMAIL`, `LOGIN_NOTIFY_FROM` |
| User đăng ký nhận changelog | `BLOB_READ_WRITE_TOKEN` **bắt buộc** (lưu danh sách email). `RESEND_API_KEY` chỉ gửi mail — key restricted không lưu được contact |
| Gửi mail changelog | Trang `/admin/feature-updates` → **Gửi mail changelog** (admin session). Hoặc POST `/api/feature-update-notify` với `FEATURE_UPDATE_NOTIFY_SECRET`. CI không tự gửi khi merge |

Danh sách đầy đủ: [Environment.md](../docs/Environment.md).

## 5. Việc khác bạn tự kiểm soát (không auto)

| Cần làm | Ở đâu |
|---|---|
| Preview changelog local | `custom/src/mocks/feature-updates.ts` — chỉ `pnpm dev:local` |
| Branding / logo / theme | `branding/` |
| Trang / hook / modal custom | `custom/src/` |
| Overlay component Immich | `overrides/lib/` |
| Tắt deploy `develop` | `vercel.json` → `git.deploymentEnabled.develop: false` |
| Copy route sang upstream | `pnpm prepare:custom` (chạy sẵn khi `pnpm dev` / `pnpm build`) |

## Không cần làm

- Không dựa vào commit `feat:` / `fix:` để hiện modal
- Không đợi GitHub Action `chore(release)`
- Không sửa changelog trên admin rồi Save (trang admin chỉ xem + preview file)
