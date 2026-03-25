# Commands Reference

## Family Core

Primary user-facing commands (slash + prefix parity where implemented):

- `marry`
- `divorce`
- `date`
- `partner`
- `siblings`
- `siblingadd`
- `siblingremove`
- `familyprofile`
- `bondstatus`
- `familyquests`
- `familyachievements`
- `familyachieveclaim`
- `coupleleaderboard`
- `familyleaderboard`

## Family Simulation

- `familysim`
- `familysimstats`
- `familysimmilestones`
- `familysimladder`
- `familysimduel`
- `familysimduelhistory`
- `familysimseason`
- `familysimseasonclaim`

## Admin Family Simulation

- `familysimseasonstart`
- `familysimseasonend`
- `familysimladderreset`
- `familysimladderrecompute`
- `familysimaudit`
- `familysimpenaltyclear`
- `familysimadminpanel`

## Prefix Patterns

Both forms are supported for family namespaced flow:

- direct: `!marry @user`
- namespaced: `!family marry @user`

## Command UX Principles

- Legacy-style wording/layout is preserved for family responses where requested.
- Usage and fallback embeds are themed, not raw text-only errors.
- Buttons/modals are used for confirmations and admin actions.
