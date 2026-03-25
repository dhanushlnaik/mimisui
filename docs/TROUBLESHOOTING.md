# Troubleshooting

## `Cannot read properties of undefined (reading 'findFirst')`

Usually indicates prisma client wiring/import mismatch or missing initialized model route.

Actions:

1. Confirm prisma client import path is correct.
2. `pnpm --filter @cocosui/db generate`
3. Rebuild bot.

## `table public.SocialRelationship does not exist`

Schema not synced.

```bash
pnpm --filter @cocosui/db exec prisma db push
pnpm --filter @cocosui/db generate
```

## Unique constraint on `type,userLowId,userHighId`

A relationship record already exists for that normalized pair.

Actions:

- check active/pending status before create
- reuse existing pending proposal flow
- soft-end relationship instead of duplicate create

## `Unknown interaction (10062)`

Interaction token expired or double-response attempt.

Actions:

- respond quickly (`deferReply`/`deferUpdate` early)
- gate fallback replies with `isRepliable()` and interaction state checks
- avoid second `reply()` if already acknowledged

## Bot starts then crashes

- Add process-level error handlers and structured logging.
- Ensure unhandled interaction errors are caught in listeners.
- Use PM2 autorestart and inspect `pm2 logs`.

## Slow responses

Common causes:

- long DB round-trips
- image processing on hot path
- blocking synchronous work in command handlers
- repeated API calls without caching

Mitigations:

- acknowledge interactions early
- move heavy work off immediate response path
- add simple in-memory cooldown/cache for repetitive calls
- batch DB calls where possible
