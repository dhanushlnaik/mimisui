# Family System

## Overview

The Family system is a dedicated social progression layer with:

- partner bonds (exclusive)
- sibling bonds (non-exclusive)
- bond XP/level
- bond score
- date loop
- profile + leaderboard presentation

## Data Model

Family progression is stored in social tables (additive schema):

- `SocialRelationship`
- `SocialRelationshipProgress`
- `SocialRelationshipEvent`
- `SocialProposal`

Legacy relationship tables remain untouched for backward compatibility.

## Relationship Rules

- No self relationships
- No bot relationships
- Partner is exclusive (one active partner)
- Partner/sibling conflict rules enforced
- Pair uniqueness uses normalized ordering (`userLowId`, `userHighId`)

## Progression

- Bond XP formula target: `120 * level^1.4`
- Date and approved social interactions grant bond XP and bond score
- Streak tracking for repeated valid interactions

## Profiles and Displays

Family profile includes:

- partner status
- sibling count
- total dates
- streak values
- bond level and score

Goal: preserve old emotional embed style while using modern storage and validation.
