# CoCo-sui Architecture

## Service Boundaries

- `@cocosui/bot` runs as its own process (Ubuntu/VPS/Railway/Fly)
- `@cocosui/web` runs as its own process (Vercel)
- Both services communicate **only through PostgreSQL (Neon)**
- There is no direct HTTP or RPC dependency between bot and web

## Shared Packages

- `@cocosui/db`: Prisma schema + client
- `@cocosui/config`: shared constants (module keys/defaults)

These shared packages are compile-time code sharing only; runtime remains decoupled.

## Deployment Pattern

1. Provision Neon database.
2. Run Prisma migrations once from CI or local machine.
3. Deploy `apps/bot` separately with bot env vars.
4. Deploy `apps/web` separately with web env vars.
5. Point both to the same `DATABASE_URL`.

## Auth Boundary

- Better Auth runs only in the web service.
- Discord OAuth callback is handled by `apps/web/src/app/api/auth/[...all]/route.ts`.
- Bot never needs web auth secrets and should only receive bot-specific env vars.
