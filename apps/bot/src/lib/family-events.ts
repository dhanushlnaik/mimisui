export type FamilyEventCode = "DOUBLE_BOND_WEEKEND" | "SIBLING_SPRINT" | "LOVE_FESTIVAL";

export type FamilyEvent = {
  code: FamilyEventCode;
  name: string;
  description: string;
  bondMultiplier: number;
  xpMultiplier: number;
  coinMultiplier: number;
  bonusText: string;
  startsAt: Date;
  endsAt: Date;
};

const EVENTS: Omit<FamilyEvent, "startsAt" | "endsAt">[] = [
  {
    code: "DOUBLE_BOND_WEEKEND",
    name: "Double Bond Weekend",
    description: "All dates feel extra magical this week.",
    bondMultiplier: 1.4,
    xpMultiplier: 1.1,
    coinMultiplier: 1.1,
    bonusText: "+40% bond XP, +10% xp/coins on /date"
  },
  {
    code: "SIBLING_SPRINT",
    name: "Sibling Sprint",
    description: "Family interactions are boosted for sibling vibes.",
    bondMultiplier: 1.15,
    xpMultiplier: 1.05,
    coinMultiplier: 1.2,
    bonusText: "+15% bond XP, +20% coins on /date"
  },
  {
    code: "LOVE_FESTIVAL",
    name: "Love Festival",
    description: "Hearts are everywhere and rewards are juiced.",
    bondMultiplier: 1.25,
    xpMultiplier: 1.2,
    coinMultiplier: 1.15,
    bonusText: "+25% bond XP, +20% xp, +15% coins on /date"
  }
];

function weekStartUtc(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const back = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - back);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekIndex(now = new Date()) {
  const start = weekStartUtc(now);
  const yearStart = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  return Math.floor((start.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function getCurrentFamilyEvent(now = new Date()): FamilyEvent {
  const idx = Math.abs(weekIndex(now)) % EVENTS.length;
  const fallback: Omit<FamilyEvent, "startsAt" | "endsAt"> = {
    code: "DOUBLE_BOND_WEEKEND",
    name: "Double Bond Weekend",
    description: "All dates feel extra magical this week.",
    bondMultiplier: 1.4,
    xpMultiplier: 1.1,
    coinMultiplier: 1.1,
    bonusText: "+40% bond XP, +10% xp/coins on /date"
  };
  const base = EVENTS[idx] ?? EVENTS[0] ?? fallback;
  const startsAt = weekStartUtc(now);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  return { ...base, startsAt, endsAt };
}
