# Getting Started

## Prerequisites

- Node.js `22.x` (recommended)
- `pnpm` (via Corepack)
- PostgreSQL (Neon recommended)
- Discord bot application token + client ID

## 1) Install

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

## 2) Environment

Configure env files for bot and web:

- `apps/bot/.env`
- `apps/web/.env`

Typical required keys:

- `DATABASE_URL`
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` (optional if global register flow)
- auth keys for web (Better Auth / Discord OAuth)

## 3) Database sync

Use additive sync for active dev DB:

```bash
pnpm --filter @cocosui/db exec prisma db push
pnpm --filter @cocosui/db generate
```

## 4) Build

```bash
pnpm --filter @cocosui/bot build
pnpm --filter @cocosui/web build
```

## 5) Register bot commands

```bash
pnpm --filter @cocosui/bot register
```

## 6) Start services

```bash
pnpm --filter @cocosui/bot start
pnpm --filter @cocosui/web start
```

## Notes

- If native modules fail (canvas/sharp), use Node 20/22 LTS and install system build deps (see `DEPLOYMENT_PM2.md`).
- If Prisma reports missing tables for new social features, run db push/generate again.
