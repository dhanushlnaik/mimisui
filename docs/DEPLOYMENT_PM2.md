# Deployment on Ubuntu with PM2

## 1) System packages (for native modules)

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

## 2) Node and pnpm

Use Node LTS (20 or 22), not bleeding-edge runtime.

```bash
# Example with nvm
nvm install 22
nvm use 22
corepack enable
corepack prepare pnpm@latest --activate
```

## 3) Install + DB sync

```bash
cd /path/to/mimisui
pnpm install
pnpm --filter @cocosui/db exec prisma db push
pnpm --filter @cocosui/db generate
```

## 4) Build

```bash
pnpm --filter @cocosui/bot build
pnpm --filter @cocosui/web build
pnpm --filter @cocosui/bot register
```

## 5) PM2 start

```bash
pm2 start "pnpm --filter @cocosui/bot start" --name cocosui-bot
pm2 start "pnpm --filter @cocosui/web start" --name cocosui-web
pm2 save
pm2 startup
```

## 6) Logs

```bash
pm2 logs cocosui-bot --lines 200
pm2 logs cocosui-web --lines 200
```

## Common fixes

- `canvas` ABI mismatch: switch to supported Node LTS and reinstall deps.
- missing prisma tables: run db push + generate.
- stale interaction errors (`10062`): ensure interactions are acknowledged quickly and avoid late `reply()` after timeout.
