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
├── docs/          # Tài liệu
└── scripts/       # Sync & patch tools
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
| `pnpm branch feature my-feature` | Tạo feature branch |
| `pnpm sync:upstream` | Đồng bộ Immich upstream |

## Git Remotes

```bash
git remote add upstream https://github.com/immich-app/immich.git
git remote add origin <your-fork-url>
```

## Branch Strategy

```
main → upstream-sync → develop → feature/* | hotfix/*
```

Không phát triển trực tiếp trên `main`.

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
| [Upgrade](docs/Upgrade.md) | Nâng cấp Immich |
| [GitWorkflow](docs/GitWorkflow.md) | Branch strategy |

## License

Upstream Immich: [AGPL-3.0](upstream/web/LICENSE). Custom code: theo license của dự án.
