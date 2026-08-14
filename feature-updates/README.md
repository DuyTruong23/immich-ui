# Changelog — modal "Tính năng được cập nhật"

Sửa **một file**, modal đọc file đó và hiện theo từng phiên bản (mới nhất trước).

**File:** [`custom/src/data/feature-updates.json`](../custom/src/data/feature-updates.json)

Checklist khi ship tính năng: [FEAT-READ.md](./FEAT-READ.md).

Không tự tăng version, không generate từ commit.

## Thêm bản mới

Mở file, **thêm object vào đầu** mảng `releases`:

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
| `releases` | Có | Danh sách phiên bản, **mới nhất đứng đầu** |
| `version` | Có | Nhãn hiện trên modal, ví dụ `v1.0.9` |
| `items` | Có | Các mục của phiên bản đó (ít nhất 1) |
| `title` | Có | Dòng in đậm |
| `detail` | Không | Mô tả khi user bấm mở rộng |

Giữ các bản cũ bên dưới. User chưa xem `version` đầu tiên sẽ thấy modal sau login.

## Đưa lên production

```bash
git add custom/src/data/feature-updates.json
git commit -m "chore: changelog v1.0.9"
git push origin develop
# merge develop → main → Vercel deploy
```

Xem thử: `/admin/feature-updates` → Xem thử modal, hoặc login dev mode.
