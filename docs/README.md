# CoCo-sui Documentation

This directory is the canonical documentation for the current CoCo-sui implementation.

## Documentation Map

- [Architecture](./ARCHITECTURE.md)
- [Getting Started](./GETTING_STARTED.md)
- [Commands Reference](./COMMANDS.md)
- [Family System](./FAMILY_SYSTEM.md)
- [Family Simulation and Seasons](./FAMILY_SIMULATION.md)
- [Admin Operations](./ADMIN_OPERATIONS.md)
- [Anti-Abuse and Moderation](./ANTI_ABUSE.md)
- [Web Dashboard](./WEB_DASHBOARD.md)
- [Deployment (Ubuntu + PM2)](./DEPLOYMENT_PM2.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## Scope

These docs are written for:

- `apps/bot` (Discord bot)
- `apps/web` (dashboard)
- `packages/db` (Prisma + Neon schema)

## Versioning and Change Policy

- Update docs in the same PR/commit as feature changes.
- If a command contract changes, update `COMMANDS.md` and any related feature docs.
- If schema changes, update `FAMILY_SYSTEM.md` and `FAMILY_SIMULATION.md`.
