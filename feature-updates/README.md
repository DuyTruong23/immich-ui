# Feature updates — changelog cho modal "Tính năng được cập nhật"

Code trên `develop`. Mỗi lần merge `develop` → `main`, GitHub Actions tăng patch `0.0.1` (ví dụ `v1.0.3` → `v1.0.4`) và generate danh sách mục từ commit.

## Luồng

```
develop  →  main (push)
              │
              └─ bump version + changelog từ feat/fix/improve/perf
```

1. Commit trên `develop` với prefix `feat:` / `fix:` / `improve:` / `perf:`
2. Merge `develop` vào `main` và push
3. CI tăng version và publish modal

## Commit nào vào modal?

| Prefix | Vào modal |
|---|---|
| `feat:`, `fix:`, `improve:`, `perf:` | Có |
| `chore:`, `docs:`, `ci:`, `test:`, `style:`, `refactor:` | Không |
| Merge commit | Không |

Tiêu đề lấy phần mô tả sau prefix; body commit (nếu có) thành `detail`.

```
feat(custom): Cho phép đổi avatar, tên

Vào Cài đặt → Tài khoản để chỉnh sửa.
```

Xem trước: `pnpm release:notes`

## Nguồn sự thật sau release

`custom/src/data/feature-updates.json` — app và API đọc file này làm mặc định.

Admin `/admin/feature-updates` vẫn sửa được (Vercel Blob). Blob chỉ thắng khi version **≥** bản trong git; release mới hơn sẽ thay blob cũ.
