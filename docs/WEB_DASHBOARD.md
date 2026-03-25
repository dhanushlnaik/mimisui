# Web Dashboard

## Routes

- `/` landing
- `/dashboard` guild selector and control center
- `/dashboard/[guildId]` guild detail snapshot + simulation admin pointers
- `/dashboard/[guildId]/family` full family progression console (read + action parity)
- `/docs` docs landing page

## Design Language

Current UI direction:

- Space Grotesk body + Libre Baskerville headings
- warm/cyan gradient accents (no default purple bias)
- glass cards + mesh backgrounds
- card hierarchy for ops visibility

## Dashboard Purpose

The web app is an operator-facing companion:

- inspect guild settings quickly
- execute family simulation admin operations from web (`season`, `ladder`, `penalty clear`)
- execute self-claim flows from web (`season claim`, `achievement claim`)
- serve as structured documentation entry point

## Web APIs Used by Dashboard

- `POST /api/family/actions`
  - admin ops: `season_start`, `season_end`, `ladder_reset`, `ladder_recompute`, `penalty_clear`
  - self ops: `season_claim`, `achievement_claim`
- `POST /api/guild/settings`
  - keys: `afk`, `fun`, `games`, `utility`, `familyEnabled`, `marriageEnabled`, `siblingsEnabled`, `publicFamilyAnnouncements`, `relationshipRewardRate`
  - writes audit log entries under `FamilyModerationLog` action: `WEB_GUILD_SETTINGS_UPDATE`
