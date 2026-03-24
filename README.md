# CoCo-sui Monorepo

Production-oriented starter for a decoupled Discord bot + Next.js dashboard.

## Apps

- `apps/bot`: `@cocosui/bot` Discord bot (discord.js v14)
- `apps/web`: `@cocosui/web` Next.js app router dashboard (Better Auth + shadcn-ready)
- `packages/db`: `@cocosui/db` Prisma schema + DB client package (Neon/Postgres)
- `packages/config`: `@cocosui/config` shared constants

## Quick Start

1. Install deps:
   - `pnpm install`
2. Set environment values:
   - Copy `apps/bot/.env.example` to `apps/bot/.env`
   - Copy `apps/web/.env.example` to `apps/web/.env`
3. Generate Prisma client:
   - `pnpm db:generate`
4. Run migration (after DB is reachable):
   - `pnpm db:migrate`
5. Start development:
   - `pnpm dev`

## Docker

- Build bot image: `docker build -f Dockerfile.bot -t cocosui-bot .`
- Build web image: `docker build -f Dockerfile.web -t cocosui-web .`
- Run both via compose: `docker compose up --build`

## Notes

- Bot and web apps are fully decoupled and only share `DATABASE_URL` data.
- `env.ts` validation is enforced in each app using `@t3-oss/env-core` + `zod`.
- This is a strong foundation: add more commands/modules incrementally.
- See deployment split details in `docs/ARCHITECTURE.md`.
