# Git Workflow — Photo Gallery UI

## Remotes

| Remote | URL | Mục đích |
|---|---|---|
| `upstream` | `https://github.com/immich-app/immich.git` | Immich monorepo chính thức |
| `origin` | `<your-fork-url>` | Fork/repo của bạn |

```bash
git remote add upstream https://github.com/immich-app/immich.git
git remote add origin git@github.com:your-org/photo-gallery-ui.git
```

## Branch Strategy

```
develop              Code hàng ngày
        ↓ merge + push
main                 Production — Vercel deploy
```

Nhánh `upstream-sync` vẫn dùng để kéo Immich, rồi merge vào `develop`. Không commit trực tiếp lên `main`.

### Quy tắc

1. **Code trên `develop`.** Không tạo nhánh feature riêng.
2. **Không commit trực tiếp lên `main`.**
3. Changelog modal: sửa tay [`custom/src/data/feature-updates.json`](../custom/src/data/feature-updates.json), rồi merge `develop` → `main`. Vercel không deploy `develop`.
4. Upstream sync chỉ trên `upstream-sync`, rồi merge vào `develop`.

## Hàng ngày trên develop

```bash
git checkout develop
git pull origin develop

# ... code trong custom/, branding/, overrides/ ...

git add custom/ branding/
git commit -m "feat(custom): Cho phép đổi avatar, tên"
git push origin develop
```

Khi sẵn sàng release:

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

Vercel deploy `main`. User chưa xem version mới nhất trong `feature-updates.json` sẽ thấy modal sau login.

## Changelog modal (thủ công)

Không có CI tự tăng version. Sửa file JSON rồi merge `develop` → `main`.

Checklist: [feature-updates/FEAT-READ.md](../feature-updates/FEAT-READ.md). Format: [feature-updates/README.md](../feature-updates/README.md).

## Commit message convention

Tiêu đề nói **tính năng / lỗi / thay đổi**, tiếng Việt. Không dùng hash commit, số PR, hay tiêu đề merge không kèm body.

```
feat(scope): thêm hoặc mở tính năng gì
fix(scope): sửa lỗi gì (triệu chứng người dùng thấy)
update(scope): chỉnh hành vi / UX đã có
docs(scope): cập nhật tài liệu
chore(upstream): sync immich vX.Y.Z
```

Scope gợi ý: `viewer`, `shared-favorites`, `auth`, `admin`, `mobile`, `branding`, `custom`, `override`

```
# ❌ BAD (commit thường trên develop)
fix: 37d544f
update stuff
wip

# ✅ GOOD (commit thường trên develop)
feat(viewer): vuốt ngang next/back theo tay, peek ảnh kề
fix(shared-favorites): hết 404 khi bấm Next trên mobile
```

### Merge `develop` → `main`

Merge lên production **không** được chỉ có tiêu đề `merge: develop vào main` mà không body.

- **Tiêu đề:** `merge: develop vào main`
- **Body: bắt buộc** — liệt kê **tất cả** commit trên `develop` chưa có trên `main` (bullet, nhóm `feat` → `fix` → `update` → `chore` → `docs` nếu hợp lý). Không để body trống, không chỉ ghi hash.

Trước khi merge:

```bash
git log main..develop --oneline
```

```
# ❌ BAD
merge: develop vào main

merge: develop vào main

- a1b2c3d
- e4f5g6h

# ✅ GOOD
merge: develop vào main

- feat(admin): thông báo email changelog
- fix(admin): danh sách email changelog từ modal
- fix(shared-favorites): sửa crash Edge favorite partner
- update(viewer): nền xem ảnh dùng blur thay vì đen đặc
```

Chi tiết đầy đủ: [`.cursor/rules/commit-messages.mdc`](../.cursor/rules/commit-messages.mdc).

Changelog modal **không** lấy từ commit. Thêm tay vào `custom/src/data/feature-updates.json`.

## Upstream sync workflow

```bash
git fetch upstream main
git checkout upstream-sync
git merge upstream/main
# resolve conflicts
bash scripts/apply-patches.sh
pnpm install && pnpm build && pnpm check

git checkout develop
git merge upstream-sync
```
