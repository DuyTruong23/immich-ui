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
main                 Production — CI tăng 0.0.1 + generate modal
```

Nhánh `upstream-sync` vẫn dùng để kéo Immich, rồi merge vào `develop`. Không commit trực tiếp lên `main`.

### Quy tắc

1. **Code trên `develop`.** Không tạo nhánh feature riêng.
2. **Không commit trực tiếp lên `main`.**
3. Merge `develop` → `main` rồi push: GitHub Actions tăng version (`v1.0.3` → `v1.0.4`) và generate changelog từ commit `feat` / `fix` / `improve` / `perf`.
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
# CI: v1.0.3 → v1.0.4, generate items từ commit, tag, commit chore(release)
```

Vercel deploy `main`. User chưa xem version mới sẽ thấy modal sau login.

## Release tự động trên `main`

Workflow: [`.github/workflows/release-on-main.yml`](../.github/workflows/release-on-main.yml)

| Bước | Việc |
|---|---|
| 1 | Đọc `custom/src/data/feature-updates.json` (hiện `v1.0.3`) |
| 2 | Tăng patch `+0.0.1` → `v1.0.4` |
| 3 | Lấy commit `feat` / `fix` / `improve` / `perf` trong lần push `develop` → `main` |
| 4 | Ghi file JSON |
| 5 | Commit `chore(release): v1.0.4` + tag `v1.0.4` |
| 6 | Nếu có secret `BLOB_READ_WRITE_TOKEN` → publish lên Vercel Blob |

Commit `chore(release)` không chạy lại workflow (tránh vòng lặp).

**GitHub:** Settings → Secrets → `BLOB_READ_WRITE_TOKEN` (cùng token Vercel, tùy chọn). Nếu `main` bật branch protection, cho phép GitHub Actions push hoặc bỏ required review với `github-actions[bot]`.

Xem trước local:

```bash
pnpm release:notes
```

Chi tiết: [feature-updates/README.md](../feature-updates/README.md).

## Commit message convention

```
feat(scope): mô tả ngắn tiếng Việt
fix(scope): mô tả ngắn tiếng Việt
improve(scope): mô tả ngắn tiếng Việt
chore(upstream): sync immich vX.Y.Z
docs(scope): cập nhật tài liệu
chore(release): v1.0.4          # chỉ do CI
```

Scope gợi ý: `branding`, `custom`, `override`, `patch`, `upstream`, `config`

Chỉ `feat` / `fix` / `improve` / `perf` **về UI/UX của user** mới vào modal. Bỏ commit admin, quản trị, codebase, script, CI. Body commit (nếu có) thành phần chi tiết khi user bấm mở rộng.

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
