# Admin Operations

## Guild-Level Controls

Family features can be gated by guild settings flags:

- `familyEnabled`
- `marriageEnabled`
- `siblingsEnabled`
- `publicFamilyAnnouncements`
- `relationshipRewardRate`

## Simulation Admin Commands

- `familysimseasonstart`
- `familysimseasonend`
- `familysimladderreset`
- `familysimladderrecompute`
- `familysimaudit`
- `familysimpenaltyclear`
- `familysimadminpanel`

## Admin Panel

`familysimadminpanel` provides buttons for fast operations:

- start season
- end season
- reset ladder
- recompute ladder
- audit summary
- clear penalty flags

Clear penalties uses reason/note capture for moderation transparency.

## Web Admin Endpoint

Dashboard also supports authenticated admin actions via:

- `POST /api/family/actions`

Supported actions:

- `season_start`
- `season_end`
- `ladder_reset`
- `ladder_recompute`
- `penalty_clear`

User self-claims are also exposed through the same endpoint:

- `season_claim`
- `achievement_claim`

## Safety Expectations

- restricted to privileged users (Manage Guild/admin scope)
- all sensitive operations should write moderation/audit logs
- always prefer additive database operations over destructive resets
