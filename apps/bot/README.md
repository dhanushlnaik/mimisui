# CoCo-sui Bot Service

Independent Discord bot service.

This bot supports both:
- Slash commands (register via `pnpm --filter @cocosui/bot register`)
- Prefix commands (uses per-guild stored prefix, default `!`)

## Required env

- `DISCORD_TOKEN`
- `DATABASE_URL`
- `CLIENT_ID`
- `GUILD_ID`

## Commands

- `pnpm dev --filter @cocosui/bot`
- `pnpm --filter @cocosui/bot register`
- `pnpm --filter @cocosui/bot build`
- `pnpm --filter @cocosui/bot start`

## Ubuntu deployment

- Install Node 20+ and pnpm.
- Pull repo.
- Run `pnpm install --frozen-lockfile`.
- Set `.env` values.
- Run migrations (`pnpm db:migrate`) if not already applied.
- Register commands (`pnpm --filter @cocosui/bot register`).
- Start with systemd/pm2: `pnpm --filter @cocosui/bot start`.
