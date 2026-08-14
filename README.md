# Photo Gallery UI

Frontend tùy biến dựa trên [Immich Web](https://github.com/immich-app/immich). Immich Docker Stack là media engine — frontend giao tiếp trực tiếp qua REST API và WebSocket.

## Kiến trúc

```
photo-gallery-ui/
├── upstream/      # Immich Web + @immich/sdk (từ immich-app/immich)
├── branding/      # Logo, theme, favicon
├── custom/        # Trang & widget mới
├── overrides/     # Override component upstream
├── patches/       # Git patches cho thay đổi upstream bắt buộc
├── feature-updates/ # Tài liệu changelog modal tính năng
├── docs/          # Tài liệu
└── scripts/       # Sync, patch, release notes
```

## Quick Start

```bash
pnpm install
cp .env.example .env
cp .env.example upstream/web/.env
pnpm dev
```

Frontend: http://localhost:5283 — cần Immich Server tại http://localhost:2283

## Scripts

| Script | Mô tả |
|---|---|
| `pnpm dev` | Dev + hot reload |
| `pnpm dev:full` | Docker Immich + frontend |
| `pnpm docker:up` | Start Immich Docker stack |
| `pnpm docker:down` | Stop Immich Docker stack |
| `pnpm build` | Production build |
| `pnpm prepare:custom` | Sync routes + branding assets |
| `pnpm sync:upstream` | Đồng bộ Immich upstream |

## Git Remotes

```bash
git remote add upstream https://github.com/immich-app/immich.git
git remote add origin <your-fork-url>
```

## Branch Strategy

```
develop → main
```

Code trên `develop`. Push `main` để Vercel deploy. Changelog modal sửa tay trong `custom/src/data/feature-updates.json`. Checklist: [FEAT-READ](feature-updates/FEAT-READ.md).

## Tài liệu

| Doc | Mô tả |
|---|---|
| [Architecture](docs/Architecture.md) | Kiến trúc tổng thể |
| [Distributed-Setup](docs/Distributed-Setup.md) | Local dev + Vercel (Immich Docker ở đâu cũng được) |
| [Development](docs/Development.md) | Setup & dev workflow |
| [Deployment](docs/Deployment.md) | Vercel + Immich Docker |
| [Customization](docs/Customization.md) | Branding, overrides, custom pages |
| [Update-Upstream](docs/Update-Upstream.md) | Đồng bộ Immich mới |
| [Environment](docs/Environment.md) | Biến môi trường |
| [UserMessaging](docs/UserMessaging.md) | Modal tính năng & trang "Hệ thống đang cập nhật dữ liệu." |
| [Upgrade](docs/Upgrade.md) | Nâng cấp Immich |
| [GitWorkflow](docs/GitWorkflow.md) | Branch strategy |
| [FEAT-READ](feature-updates/FEAT-READ.md) | Checklist tự cập nhật changelog / i18n / env |

## License

Upstream Immich: [AGPL-3.0](upstream/web/LICENSE). Custom code: theo license của dự án.
