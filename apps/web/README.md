# CoCo-sui Web Service

Independent Next.js dashboard service.

## Required env

- `DATABASE_URL`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

## Commands

- `pnpm dev --filter @cocosui/web`
- `pnpm --filter @cocosui/web build`
- `pnpm --filter @cocosui/web start`

## Vercel deployment

- Import repository in Vercel.
- Set project root to `apps/web`.
- Add environment variables listed above.
- Ensure DB migrations are applied before first runtime.
- Set Discord OAuth callback URL to `https://<your-domain>/api/auth/callback/discord`.
