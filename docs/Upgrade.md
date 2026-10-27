# Upgrade — Photo Gallery UI

Quy trình nâng cấp Immich upstream. Chi tiết merge: [Update-Upstream.md](./Update-Upstream.md).

## Checklist

1. `git fetch upstream main`
2. `git checkout upstream-sync && git merge upstream/main`
3. `bash scripts/apply-patches.sh` (nếu có patches)
4. `bash scripts/prepare-custom.sh`
5. `pnpm install && pnpm --filter @immich/sdk build`
6. `pnpm build && pnpm check`
7. Test manual: login, timeline, upload, dashboard, feature flags
8. `git checkout develop && git merge upstream-sync`
9. Release: `develop` → `main`

## Kiểm tra version

```bash
pnpm check:version
# hoặc
node scripts/check-immich-version.mjs --url https://immich.gallery-app.pp.ua
```

In version `upstream/web`, `@immich/sdk`, server đang chạy (`IMMICH_SERVER_URL` trong `.env` hoặc `--url`) và release mới nhất trên GitHub. Exit code `2` khi web và server lệch major.minor, `1` khi không gọi được server.

### Trạng thái 2026-10-26

| Thành phần | Version |
|---|---|
| `upstream/web` | 3.1.0 |
| `@immich/sdk` | 3.1.0 |
| Server production (immich.gallery-app.pp.ua) | 3.1.0 |
| Release mới nhất trên GitHub | v3.3.5 (2026-10-21) |

Web và server đang khớp. Khi nâng Docker Immich lên 3.3.x, sync `upstream/` cùng lúc (checklist ở trên) vì `@immich/sdk` sinh từ OpenAPI của đúng version server; chạy `pnpm check:version` sau mỗi lần nâng để xác nhận không lệch.

## Sau khi upgrade Immich major

- Kiểm tra `@immich/sdk` breaking changes
- Rebuild API wrappers trong `custom/src/api/`
- Verify feature flag routes vẫn khớp upstream routes
- Re-test UserSidebar override

## Rollback

```bash
git checkout main
git revert <merge-commit>
pnpm install && pnpm build
```

Hoặc redeploy Vercel commit trước đó (frontend rollback instant).
