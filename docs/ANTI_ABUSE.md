# Anti-Abuse and Moderation

## Objectives

- Prevent duel collusion farming
- Detect repetitive low-variance pair behavior
- Reduce alt-pattern exploitation
- Preserve fair ladder integrity

## Current Controls

- Pair repetition checks across recent duel windows
- Reward dampening for suspicious-but-not-critical patterns
- Lockouts (`simDuelLockedUntil`) for severe abuse patterns
- Penalty flags and moderation logs

## Penalty Lifecycle

- Flags are created when suspicious behavior crosses thresholds.
- Severe flags can prevent duel actions until lockout expires.
- Admin can clear flags with explicit reason (`familysimpenaltyclear`).
- Stale flags auto-resolve where appropriate.

## Audit Surface

`familysimaudit` exposes a summarized moderation view for admin review.
