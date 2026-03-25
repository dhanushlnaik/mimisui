import { db } from "@cocosui/db";
import { performance } from "node:perf_hooks";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type User
} from "discord.js";
import { logger } from "./logger.js";
import { recordDbTiming } from "./perf-context.js";
import { grantCommandProgress } from "./progression.js";
import { getCurrentFamilyEvent } from "./family-events.js";

const fdb = db as any;

const PROPOSAL_TTL_MS = 5 * 60 * 1000;
const PROPOSAL_COOLDOWN_MS = 45 * 1000;
const DATE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FAMILY_SIM_COOLDOWN_MS = 2 * 60 * 60 * 1000;

const FAMILY_DEFAULTS = {
  familyEnabled: true,
  marriageEnabled: true,
  siblingsEnabled: true,
  publicFamilyAnnouncements: true,
  relationshipRewardRate: 1
};

type DateScenarioTier = "COMMON" | "RARE" | "LEGENDARY";
type DateScenario = { tier: DateScenarioTier; text: string };
type FamilySimulationOutcome = "GOOD" | "NEUTRAL" | "BAD";
type FamilySimulationScenario = { outcome: FamilySimulationOutcome; text: string };
type SimulationMilestoneReward = { xp: number; coins: number; bondXp: number };
type FamilySimulationMilestoneEntry = {
  streak: number;
  unlocked: boolean;
  progress: number;
  remaining: number;
  reward: SimulationMilestoneReward;
};
type SimulationLadderTier =
  | "UNRANKED"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MYTHIC";

const DATE_SCENARIOS: DateScenario[] = [
  { tier: "COMMON", text: "You both watched a dreamy sunset together." },
  { tier: "COMMON", text: "A late-night food date turned into endless laughter." },
  { tier: "COMMON", text: "You took matching selfies and spammed the server with cuteness." },
  { tier: "COMMON", text: "A cozy game-night date went unexpectedly perfect." },
  { tier: "COMMON", text: "You both went stargazing and made future plans." },
  { tier: "COMMON", text: "You shared bubble tea and argued about toppings for 20 minutes." },
  { tier: "COMMON", text: "A chill walk and random memes made the whole evening wholesome." },
  { tier: "COMMON", text: "You both ranked your favorite songs and discovered new vibes." },
  { tier: "COMMON", text: "You watched one episode together and ended up watching five." },
  { tier: "COMMON", text: "A tiny picnic date turned into a core memory." },
  { tier: "COMMON", text: "You both played a co-op game and somehow still stayed adorable." },
  { tier: "COMMON", text: "You exchanged playlists and found suspiciously similar taste." },
  { tier: "COMMON", text: "A bookstore date made both of you smile for no reason." },
  { tier: "COMMON", text: "You both tried a new cafe and immediately claimed a favorite table." },
  { tier: "COMMON", text: "A random rain walk made the date feel cinematic." },
  { tier: "COMMON", text: "You spent the evening sharing embarrassing stories and laughing nonstop." },
  { tier: "COMMON", text: "You watched clouds together and made chaotic predictions." },
  { tier: "COMMON", text: "A rooftop talk turned into deep late-night vibes." },
  { tier: "COMMON", text: "You both cooked something simple and acted like pro chefs." },
  { tier: "COMMON", text: "You discovered a new comfort song together." },
  { tier: "COMMON", text: "You planned future trips you may or may not actually take." },
  { tier: "COMMON", text: "You made matching profile themes for fun." },
  { tier: "COMMON", text: "A soft movie night ended with both of you smiling." },
  { tier: "COMMON", text: "You debated pineapple pizza and still held hands after." },
  { tier: "COMMON", text: "You watched old photos and recreated one for fun." },
  { tier: "COMMON", text: "You both learned a random dance move and called it a date win." },
  { tier: "COMMON", text: "A simple call felt like the best part of the day." },
  { tier: "COMMON", text: "You both doodled together and made chaotic masterpieces." },
  { tier: "COMMON", text: "You took a late evening walk with no destination and perfect vibes." },
  { tier: "COMMON", text: "You both promised to keep this streak alive no matter what." },
  { tier: "RARE", text: "You found a hidden spot and claimed it as your secret date place." },
  { tier: "RARE", text: "A surprise gift moment made the date extra special." },
  { tier: "RARE", text: "You both saw shooting stars and made matching wishes." },
  { tier: "RARE", text: "A spontaneous road-trip style date happened out of nowhere." },
  { tier: "RARE", text: "You both recreated your first conversation and laughed at everything." },
  { tier: "RARE", text: "You got lost together and somehow made the best memories." },
  { tier: "RARE", text: "A festival date gave both of you glitter and core memories." },
  { tier: "RARE", text: "You both wrote each other short notes and kept them." },
  { tier: "RARE", text: "A midnight skyline view turned the night magical." },
  { tier: "RARE", text: "You both matched outfits by accident and called it fate." },
  { tier: "RARE", text: "You discovered your favorite late-night dessert spot together." },
  { tier: "RARE", text: "A cozy train ride date felt straight out of an anime scene." },
  { tier: "RARE", text: "You both built a tiny date playlist and named it after your bond." },
  { tier: "RARE", text: "You had a photo booth date and every picture came out perfect." },
  { tier: "RARE", text: "A lantern-lit evening made everything feel unreal." },
  { tier: "RARE", text: "You found a lucky coin together and called it your date charm." },
  { tier: "LEGENDARY", text: "A once-in-a-lifetime date night made your bond feel legendary." },
  { tier: "LEGENDARY", text: "The whole night felt like a movie and neither of you wanted it to end." },
  { tier: "LEGENDARY", text: "You both recreated your dream date and it somehow exceeded expectations." },
  { tier: "LEGENDARY", text: "A magical anniversary-style date happened out of nowhere." },
  { tier: "LEGENDARY", text: "You made a promise under the stars to keep this bond forever." }
];

const FAMILY_SIMULATION_SCENARIOS: FamilySimulationScenario[] = [
  { outcome: "GOOD", text: "You planned a mini surprise and your partner absolutely loved it." },
  { outcome: "GOOD", text: "A cozy talk fixed old misunderstandings and deepened your bond." },
  { outcome: "GOOD", text: "You both finished a wholesome challenge together without drama." },
  { outcome: "GOOD", text: "A random gift exchange turned into the highlight of the week." },
  { outcome: "GOOD", text: "You both laughed over old memories and felt closer than ever." },
  { outcome: "NEUTRAL", text: "You had a chill evening together and kept things steady." },
  { outcome: "NEUTRAL", text: "The vibe was calm today, no big wins but no losses either." },
  { outcome: "NEUTRAL", text: "You spent time together, but both were a little low-energy." },
  { outcome: "NEUTRAL", text: "A short hangout helped maintain the bond without big changes." },
  { outcome: "NEUTRAL", text: "You both checked in, kept it simple, and moved forward." },
  { outcome: "BAD", text: "A tiny argument escalated and hurt both your moods today." },
  { outcome: "BAD", text: "Mixed signals caused confusion, and the date felt off." },
  { outcome: "BAD", text: "You both got busy and disconnected a little this round." },
  { outcome: "BAD", text: "A misunderstood joke turned awkward and lowered the vibe." },
  { outcome: "BAD", text: "Stress got in the way and this simulation ended rough." }
];

const FAMILY_SIM_MILESTONES = [3, 7, 14, 30] as const;
const FAMILY_SIM_MILESTONE_REWARDS: Record<(typeof FAMILY_SIM_MILESTONES)[number], SimulationMilestoneReward> = {
  3: { xp: 70, coins: 85, bondXp: 18 },
  7: { xp: 140, coins: 170, bondXp: 36 },
  14: { xp: 300, coins: 340, bondXp: 75 },
  30: { xp: 700, coins: 800, bondXp: 180 }
};
const SIM_LADDER_THRESHOLDS: Array<{ tier: SimulationLadderTier; minPoints: number }> = [
  { tier: "MYTHIC", minPoints: 780 },
  { tier: "DIAMOND", minPoints: 520 },
  { tier: "PLATINUM", minPoints: 320 },
  { tier: "GOLD", minPoints: 180 },
  { tier: "SILVER", minPoints: 80 },
  { tier: "BRONZE", minPoints: 1 },
  { tier: "UNRANKED", minPoints: 0 }
];
const SIM_LADDER_REWARD_TIERS = ["GOLD", "PLATINUM", "DIAMOND", "MYTHIC"] as const;
type LadderRewardTier = (typeof SIM_LADDER_REWARD_TIERS)[number];
const SIM_LADDER_REWARDS: Record<LadderRewardTier, SimulationMilestoneReward> = {
  GOLD: { xp: 120, coins: 150, bondXp: 35 },
  PLATINUM: { xp: 220, coins: 280, bondXp: 60 },
  DIAMOND: { xp: 400, coins: 520, bondXp: 110 },
  MYTHIC: { xp: 800, coins: 980, bondXp: 220 }
};
const proposalTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const SETTINGS_CACHE_TTL_MS = 30_000;
const PROFILE_CACHE_TTL_MS = 10_000;
const LEADERBOARD_CACHE_TTL_MS = 15_000;
const settingsCache = new Map<string, { value: any; expiresAt: number }>();
const profileCache = new Map<string, { value: any; expiresAt: number }>();
const coupleLeaderboardCache = new Map<number, { value: any; expiresAt: number }>();
const familyLeaderboardCache = new Map<number, { value: any; expiresAt: number }>();

function isUnknownInteractionError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 10062
  );
}

function ensureSocialDelegates() {
  if (!fdb.socialRelationship || !fdb.socialProposal) {
    throw new Error(
      "Family DB client is outdated. Run `pnpm --filter @cocosui/db generate` and restart the bot with Node 22."
    );
  }
}

async function timedDb<T = any>(label: string, task: () => Promise<T>) {
  const start = performance.now();
  try {
    return await task();
  } finally {
    const msRaw = performance.now() - start;
    const ms = Math.round(msRaw);
    recordDbTiming(`family:${label}`, msRaw);
    if (ms >= 250) {
      logger.warn(`Slow DB op: ${label} ${ms}ms`);
    }
  }
}

function invalidateFamilyProfileCache(...userIds: string[]) {
  for (const id of userIds) {
    if (!id) continue;
    profileCache.delete(id);
  }
}

function invalidateFamilyLeaderboardCache() {
  coupleLeaderboardCache.clear();
  familyLeaderboardCache.clear();
}

function pairOrder(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

function bondXpRequired(level: number) {
  return Math.max(120, Math.floor(120 * Math.pow(level, 1.4)));
}

function computeBondLevel(totalXp: number) {
  let level = 1;
  let spent = 0;
  while (true) {
    const need = bondXpRequired(level);
    if (spent + need > totalXp) break;
    spent += need;
    level += 1;
    if (level > 500) break;
  }
  return {
    level,
    progress: totalXp - spent,
    required: bondXpRequired(level)
  };
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function ensureDiscordUser(user: User) {
  await fdb.discordUser.upsert({
    where: { id: user.id },
    update: { username: user.username, avatar: user.avatar ?? null },
    create: { id: user.id, username: user.username, avatar: user.avatar ?? null }
  });
}

export async function getFamilySettings(guildId: string | null): Promise<any> {
  if (!guildId) return FAMILY_DEFAULTS;
  const cached = settingsCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const guild = await timedDb("guild.findUnique(getFamilySettings)", () =>
    fdb.guild.findUnique({ where: { id: guildId } })
  );
  const settings = (guild?.settings as Record<string, unknown> | null) ?? {};
  const resolved = {
    familyEnabled: (settings.familyEnabled as boolean | undefined) ?? FAMILY_DEFAULTS.familyEnabled,
    marriageEnabled: (settings.marriageEnabled as boolean | undefined) ?? FAMILY_DEFAULTS.marriageEnabled,
    siblingsEnabled: (settings.siblingsEnabled as boolean | undefined) ?? FAMILY_DEFAULTS.siblingsEnabled,
    publicFamilyAnnouncements:
      (settings.publicFamilyAnnouncements as boolean | undefined) ??
      FAMILY_DEFAULTS.publicFamilyAnnouncements,
    relationshipRewardRate:
      typeof settings.relationshipRewardRate === "number"
        ? settings.relationshipRewardRate
        : FAMILY_DEFAULTS.relationshipRewardRate
  };
  settingsCache.set(guildId, { value: resolved, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS });
  return resolved;
}

async function activePartnerFor(userId: string) {
  ensureSocialDelegates();
  return fdb.socialRelationship.findFirst({
    where: {
      type: "PARTNER",
      status: "ACTIVE",
      OR: [{ userAId: userId }, { userBId: userId }]
    },
    include: { progress: true }
  });
}

async function activeRelationship(type: "PARTNER" | "SIBLING", a: string, b: string) {
  ensureSocialDelegates();
  const { low, high } = pairOrder(a, b);
  return fdb.socialRelationship.findFirst({
    where: {
      type,
      status: "ACTIVE",
      userLowId: low,
      userHighId: high
    },
    include: { progress: true }
  });
}

async function validateCreate(type: "PARTNER" | "SIBLING", userAId: string, userBId: string) {
  if (type === "PARTNER") {
    const [aPartner, bPartner, siblingConflict] = await Promise.all([
      activePartnerFor(userAId),
      activePartnerFor(userBId),
      activeRelationship("SIBLING", userAId, userBId)
    ]);
    if (aPartner) throw new Error("You already have an active partner.");
    if (bPartner) throw new Error("That user already has an active partner.");
    if (siblingConflict) throw new Error("You cannot marry your active sibling.");
    return;
  }

  const [existingSibling, partnerConflict] = await Promise.all([
    activeRelationship("SIBLING", userAId, userBId),
    activeRelationship("PARTNER", userAId, userBId)
  ]);
  if (existingSibling) throw new Error("You are already siblings.");
  if (partnerConflict) throw new Error("Partners cannot be added as siblings.");
}

export async function createProposal(input: {
  type: "PARTNER" | "SIBLING";
  from: User;
  to: User;
  guildId: string | null;
}) {
  ensureSocialDelegates();
  if (input.from.id === input.to.id) throw new Error("You cannot do this with yourself.");
  if (input.to.bot) throw new Error("You cannot do this with a bot.");

  await Promise.all([ensureDiscordUser(input.from), ensureDiscordUser(input.to)]);
  await validateCreate(input.type, input.from.id, input.to.id);

  const now = Date.now();
  const recent = await timedDb("socialProposal.findFirst(createProposal.recent)", () => fdb.socialProposal.findFirst({
    where: {
      fromUserId: input.from.id,
      status: "PENDING",
      createdAt: { gt: new Date(now - PROPOSAL_COOLDOWN_MS) }
    }
  }));
  if (recent) throw new Error("Slow down. Wait before sending another proposal.");

  await timedDb("socialProposal.updateMany(createProposal.expireOld)", () => fdb.socialProposal.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "ENDED" }
  }));

  const proposal = await timedDb("socialProposal.create(createProposal)", () => fdb.socialProposal.create({
    data: {
      type: input.type,
      fromUserId: input.from.id,
      toUserId: input.to.id,
      guildId: input.guildId,
      status: "PENDING",
      expiresAt: new Date(now + PROPOSAL_TTL_MS)
    }
  }));

  return proposal;
}

async function createRelationship(input: {
  type: "PARTNER" | "SIBLING";
  userAId: string;
  userBId: string;
  guildId: string | null;
}) {
  await validateCreate(input.type, input.userAId, input.userBId);
  const { low, high } = pairOrder(input.userAId, input.userBId);
  const existing = await fdb.socialRelationship.findFirst({
    where: {
      type: input.type,
      userLowId: low,
      userHighId: high
    },
    include: { progress: true }
  });

  if (existing) {
    const relationship = await fdb.socialRelationship.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        endedAt: null,
        startedAt: new Date(),
        userAId: input.userAId,
        userBId: input.userBId,
        guildOriginId: input.guildId
      }
    });

    if (existing.progress) {
      await fdb.socialRelationshipProgress.update({
        where: { relationshipId: relationship.id },
        data: {
          bondXp: 0,
          bondLevel: 1,
          bondScore: 0,
          totalDates: 0,
          currentStreak: 0,
          bestStreak: 0,
          sharedCoins: 0,
          questsCompleted: 0,
          anniversaryClaimedAt: null,
          lastDateAt: null
        }
      });
    } else {
      await fdb.socialRelationshipProgress.create({
        data: {
          relationshipId: relationship.id,
          bondLevel: 1,
          bondXp: 0,
          bondScore: 0
        }
      });
    }

    invalidateFamilyProfileCache(input.userAId, input.userBId);
    invalidateFamilyLeaderboardCache();
    return relationship;
  }

  const relationship = await fdb.socialRelationship.create({
    data: {
      type: input.type,
      status: "ACTIVE",
      userAId: input.userAId,
      userBId: input.userBId,
      userLowId: low,
      userHighId: high,
      guildOriginId: input.guildId
    }
  });

  await fdb.socialRelationshipProgress.create({
    data: {
      relationshipId: relationship.id,
      bondLevel: 1,
      bondXp: 0,
      bondScore: 0
    }
  });

  invalidateFamilyProfileCache(input.userAId, input.userBId);
  invalidateFamilyLeaderboardCache();
  return relationship;
}

async function addRelationshipEvent(
  relationshipId: string,
  actorUserId: string,
  eventType:
    | "PROPOSED"
    | "ACCEPTED"
    | "REJECTED"
    | "DIVORCED"
    | "DATE_COMPLETED"
    | "SIMULATION_COMPLETED"
    | "STREAK_UPDATED"
    | "QUEST_COMPLETED"
    | "ANNIVERSARY_CLAIMED",
  metadata?: Record<string, unknown>
) {
  await fdb.socialRelationshipEvent.create({
    data: {
      relationshipId,
      actorUserId,
      eventType,
      metadata: metadata ?? undefined
    }
  });
}

async function grantMarriageBurst(userId: string, guildId: string | null, amountXp: number, amountCoins: number) {
  await fdb.userProgress.upsert({
    where: { userId },
    update: {
      guildId,
      xp: { increment: amountXp },
      coins: { increment: amountCoins }
    },
    create: {
      userId,
      guildId,
      xp: amountXp,
      coins: amountCoins,
      level: 1,
      title: "Rookie"
    }
  });
  await fdb.userProgress.update({
    where: { userId }, // keep updatedAt fresh for existing rows
    data: {}
  });
  await fdb.transaction.create({
    data: {
      userId,
      guildId,
      amount: amountCoins,
      reason: "family-marry"
    }
  });
}

export async function respondProposal(input: {
  proposalId: string;
  actorUserId: string;
  accept: boolean;
}) {
  ensureSocialDelegates();
  const proposal = await fdb.socialProposal.findUnique({ where: { id: input.proposalId } });
  if (!proposal) throw new Error("Proposal expired.");
  if (proposal.toUserId !== input.actorUserId) throw new Error("Only the target user can respond.");
  if (proposal.status !== "PENDING") throw new Error("Proposal is already resolved.");
  if (new Date(proposal.expiresAt).getTime() < Date.now()) {
    await fdb.socialProposal.update({
      where: { id: proposal.id },
      data: { status: "ENDED" }
    });
    throw new Error("Proposal has expired.");
  }

  if (!input.accept) {
    await fdb.socialProposal.update({ where: { id: proposal.id }, data: { status: "ENDED" } });
    return { accepted: false as const, proposal };
  }

  const relationship = await createRelationship({
    type: proposal.type,
    userAId: proposal.fromUserId,
    userBId: proposal.toUserId,
    guildId: proposal.guildId
  });

  await fdb.socialProposal.update({
    where: { id: proposal.id },
    data: { status: "ACTIVE" }
  });

  await addRelationshipEvent(relationship.id, proposal.fromUserId, "ACCEPTED");

  if (proposal.type === "PARTNER") {
    const xp = 80;
    const coins = 120;
    await Promise.all([
      grantMarriageBurst(proposal.fromUserId, proposal.guildId, xp, coins),
      grantMarriageBurst(proposal.toUserId, proposal.guildId, xp, coins),
      grantCommandProgress({
        userId: proposal.fromUserId,
        guildId: proposal.guildId,
        username: proposal.fromUserId,
        commandName: "family_marry"
      }),
      grantCommandProgress({
        userId: proposal.toUserId,
        guildId: proposal.guildId,
        username: proposal.toUserId,
        commandName: "family_marry"
      })
    ]);
  }
  invalidateFamilyProfileCache(proposal.fromUserId, proposal.toUserId);
  invalidateFamilyLeaderboardCache();

  return { accepted: true as const, proposal, relationship };
}

export async function endPartnerRelationship(userId: string) {
  ensureSocialDelegates();
  const rel = await activePartnerFor(userId);
  if (!rel) throw new Error("You don't have an active partner.");
  await fdb.socialRelationship.update({
    where: { id: rel.id },
    data: { status: "ENDED", endedAt: new Date() }
  });
  await addRelationshipEvent(rel.id, userId, "DIVORCED");
  invalidateFamilyProfileCache(rel.userAId, rel.userBId);
  invalidateFamilyLeaderboardCache();
  return rel;
}

function streakFromLastDate(lastDateAt: Date | null | undefined, now: Date) {
  if (!lastDateAt) return { next: 1, reset: false };
  const lastKey = dayKey(lastDateAt);
  const nowKey = dayKey(now);
  if (lastKey === nowKey) return { next: 0, reset: false };

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (lastKey === dayKey(yesterday)) return { next: 1, reset: false };
  return { next: 1, reset: true };
}

function pickDateScenario() {
  const roll = Math.random();
  const tier: DateScenarioTier = roll < 0.03 ? "LEGENDARY" : roll < 0.25 ? "RARE" : "COMMON";
  const pool = DATE_SCENARIOS.filter((s) => s.tier === tier);
  const fallback: DateScenario = {
    tier: "COMMON",
    text: "You both spent quiet time together and your bond felt stronger."
  };
  return pool[Math.floor(Math.random() * pool.length)] ?? DATE_SCENARIOS[0] ?? fallback;
}

function pickFamilySimulationOutcome(input: { bondLevel: number; streak: number; bondScore: number }) {
  const levelBonus = Math.min(0.2, Math.max(0, input.bondLevel - 1) * 0.01);
  const streakBonus = Math.min(0.15, Math.max(0, input.streak) * 0.005);
  const scoreBonus = Math.min(0.1, Math.max(0, input.bondScore) / 10_000);
  const bonus = levelBonus + streakBonus + scoreBonus;

  let good = 0.45 + bonus;
  let bad = 0.2 - bonus * 0.8;
  good = Math.min(0.82, Math.max(0.35, good));
  bad = Math.min(0.4, Math.max(0.05, bad));
  let neutral = 1 - good - bad;
  if (neutral < 0.1) {
    neutral = 0.1;
    const excess = good + bad + neutral - 1;
    good = Math.max(0.35, good - excess);
  }

  const roll = Math.random();
  if (roll < good) return "GOOD" as const;
  if (roll < good + neutral) return "NEUTRAL" as const;
  return "BAD" as const;
}

function pickFamilySimulationScenario(outcome: FamilySimulationOutcome) {
  const pool = FAMILY_SIMULATION_SCENARIOS.filter((s) => s.outcome === outcome);
  return (
    pool[Math.floor(Math.random() * pool.length)] ??
    FAMILY_SIMULATION_SCENARIOS[0] ?? {
      outcome: "NEUTRAL" as FamilySimulationOutcome,
      text: "You both spent quality time together and kept your bond steady."
    }
  );
}

function simulationMilestoneBit(streak: number) {
  const idx = FAMILY_SIM_MILESTONES.indexOf(streak as (typeof FAMILY_SIM_MILESTONES)[number]);
  return idx >= 0 ? 1 << idx : 0;
}

function ladderRewardBit(tier: LadderRewardTier) {
  const idx = SIM_LADDER_REWARD_TIERS.indexOf(tier);
  return idx >= 0 ? 1 << idx : 0;
}

function ladderTierFromPoints(points: number): SimulationLadderTier {
  for (const t of SIM_LADDER_THRESHOLDS) {
    if (points >= t.minPoints) return t.tier;
  }
  return "UNRANKED";
}

function ladderTierEmoji(tier: SimulationLadderTier) {
  if (tier === "MYTHIC") return "🪽";
  if (tier === "DIAMOND") return "💎";
  if (tier === "PLATINUM") return "🥇";
  if (tier === "GOLD") return "🏅";
  if (tier === "SILVER") return "🥈";
  if (tier === "BRONZE") return "🥉";
  return "▫️";
}

function weekPeriodKeyFromDate(date: Date) {
  const { weekStart } = periodStarts(date);
  const y = weekStart.getUTCFullYear();
  const jan1 = new Date(Date.UTC(y, 0, 1));
  const weekNo = Math.ceil((((weekStart.getTime() - jan1.getTime()) / 86400000) + 1) / 7);
  return `${y}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function awardDateInteraction(input: {
  userId: string;
  guildId: string | null;
  username: string;
}) {
  ensureSocialDelegates();
  const relationship = await activePartnerFor(input.userId);
  if (!relationship) throw new Error("You need an active partner to go on a date.");

  const now = new Date();
  const progress = relationship.progress;
  if (!progress) throw new Error("Relationship progress missing.");
  if (progress.lastDateAt && now.getTime() - new Date(progress.lastDateAt).getTime() < DATE_COOLDOWN_MS) {
    const next = Math.floor((new Date(progress.lastDateAt).getTime() + DATE_COOLDOWN_MS) / 1000);
    throw new Error(`Date cooldown active. Try again <t:${next}:R>.`);
  }

  const partnerId = relationship.userAId === input.userId ? relationship.userBId : relationship.userAId;
  const partnerUser = await fdb.discordUser.findUnique({ where: { id: partnerId } });
  const rate = (await getFamilySettings(input.guildId)).relationshipRewardRate;
  const activeFamilyBoosters = await timedDb("booster.findMany(awardDateInteraction.family)", () =>
    fdb.booster.findMany({
      where: {
        userId: input.userId,
        expiresAt: { gt: now },
        type: { in: ["family_double_date_once", "family_bond_bloom", "family_streak_shield_once"] }
      },
      orderBy: { createdAt: "asc" }
    })
  );
  const doubleDateBooster = activeFamilyBoosters.find((b: any) => b.type === "family_double_date_once") ?? null;
  const streakShieldBooster = activeFamilyBoosters.find((b: any) => b.type === "family_streak_shield_once") ?? null;
  const bondBloomMultiplier = activeFamilyBoosters
    .filter((b: any) => b.type === "family_bond_bloom")
    .reduce((m: number, b: any) => m * Number(b.multiplier ?? 1), 1);

  const scenario = pickDateScenario();
  const familyEvent = getCurrentFamilyEvent(now);
  const tierMul = scenario.tier === "LEGENDARY" ? 1.35 : scenario.tier === "RARE" ? 1.15 : 1;
  const baseXp = Math.floor(
    (40 + Math.random() * 31) * rate * tierMul * familyEvent.xpMultiplier
  );
  const baseCoins = Math.floor(
    (55 + Math.random() * 46) * rate * tierMul * familyEvent.coinMultiplier
  );
  const bondGainRaw = Math.floor(
    (30 + Math.random() * 21) * rate * tierMul * familyEvent.bondMultiplier
  );
  const scoreGain = Math.floor((20 + Math.random() * 16) * rate);
  const eventBonus = scenario.tier === "LEGENDARY" ? 55 : scenario.tier === "RARE" ? 20 : 0;
  const rareBonus = eventBonus;
  const doubled = Boolean(doubleDateBooster);
  const xpGain = doubled ? baseXp * 2 : baseXp;
  const coinGain = doubled ? baseCoins * 2 : baseCoins;
  const bondGain = Math.max(1, Math.floor(bondGainRaw * (bondBloomMultiplier || 1)));

  const streakDelta = streakFromLastDate(progress.lastDateAt, now);
  const shieldedReset = streakDelta.reset && Boolean(streakShieldBooster);
  const currentStreak =
    streakDelta.next === 0
      ? progress.currentStreak
      : shieldedReset
        ? progress.currentStreak + 1
        : streakDelta.reset
          ? 1
          : progress.currentStreak + 1;
  const bestStreak = Math.max(progress.bestStreak, currentStreak);

  const totalBondXp = progress.bondXp + bondGain + rareBonus;
  const bondMeta = computeBondLevel(totalBondXp);

  await fdb.socialRelationshipProgress.update({
    where: { relationshipId: relationship.id },
    data: {
      bondXp: totalBondXp,
      bondLevel: bondMeta.level,
      bondScore: { increment: scoreGain + rareBonus },
      totalDates: { increment: 1 },
      currentStreak,
      bestStreak,
      sharedCoins: { increment: coinGain * 2 },
      lastDateAt: now
    }
  });

  await addRelationshipEvent(relationship.id, input.userId, "DATE_COMPLETED", {
    bondGain,
    scoreGain,
    coins: coinGain,
    rareBonus
  });
  if (doubleDateBooster) {
    await timedDb("booster.delete(awardDateInteraction.doubleDateConsume)", () =>
      fdb.booster.delete({ where: { id: doubleDateBooster.id } })
    );
  }
  if (streakShieldBooster && shieldedReset) {
    await timedDb("booster.delete(awardDateInteraction.streakShieldConsume)", () =>
      fdb.booster.delete({ where: { id: streakShieldBooster.id } })
    );
  }

  await Promise.all([
    grantCommandProgress({
      userId: input.userId,
      guildId: input.guildId,
      username: input.username,
      commandName: "family_date"
    }),
    grantCommandProgress({
      userId: partnerId,
      guildId: input.guildId,
      username: partnerUser?.username ?? partnerId,
      commandName: "family_date"
    }),
    fdb.userProgress.update({
      where: { userId: input.userId },
      data: { xp: { increment: xpGain }, coins: { increment: coinGain } }
    }),
    fdb.userProgress.update({
      where: { userId: partnerId },
      data: { xp: { increment: xpGain }, coins: { increment: coinGain } }
    }),
    fdb.transaction.create({
      data: { userId: input.userId, guildId: input.guildId, amount: coinGain, reason: "family-date" }
    }),
    fdb.transaction.create({
      data: { userId: partnerId, guildId: input.guildId, amount: coinGain, reason: "family-date" }
    })
  ]);
  invalidateFamilyProfileCache(input.userId, partnerId);
  invalidateFamilyLeaderboardCache();

  return {
    relationshipId: relationship.id,
    partnerId,
    partnerUsername: partnerUser?.username ?? "Unknown",
    scenarioTier: scenario.tier,
    scenario: scenario.text,
    event: {
      code: familyEvent.code,
      name: familyEvent.name,
      bonusText: familyEvent.bonusText,
      endsAt: familyEvent.endsAt
    },
    rewards: {
      xp: xpGain,
      coins: coinGain,
      bondXp: bondGain + rareBonus,
      bondScore: scoreGain + rareBonus
    },
    streak: { current: currentStreak, best: bestStreak },
    bond: {
      level: bondMeta.level,
      progress: bondMeta.progress,
      required: bondMeta.required
    },
    rareBonus
  };
}

export async function awardFamilySimulationInteraction(input: {
  userId: string;
  guildId: string | null;
  username: string;
}) {
  ensureSocialDelegates();
  const relationship = await activePartnerFor(input.userId);
  if (!relationship) throw new Error("You need an active partner to run family simulation.");

  const now = new Date();
  const progress = relationship.progress;
  if (!progress) throw new Error("Relationship progress missing.");
  if (
    progress.lastSimulationAt &&
    now.getTime() - new Date(progress.lastSimulationAt).getTime() < FAMILY_SIM_COOLDOWN_MS
  ) {
    const next = Math.floor(
      (new Date(progress.lastSimulationAt).getTime() + FAMILY_SIM_COOLDOWN_MS) / 1000
    );
    throw new Error(`Family simulation cooldown active. Try again <t:${next}:R>.`);
  }

  const partnerId = relationship.userAId === input.userId ? relationship.userBId : relationship.userAId;
  const partnerUser = await timedDb("discordUser.findUnique(awardFamilySimulationInteraction.partner)", () =>
    fdb.discordUser.findUnique({ where: { id: partnerId } })
  );
  const rate = (await getFamilySettings(input.guildId)).relationshipRewardRate;
  const familyEvent = getCurrentFamilyEvent(now);
  const seasonKey = weekPeriodKeyFromDate(now);
  const seasonKeyChanged = (progress.simSeasonKey ?? seasonKey) !== seasonKey;
  const seasonPointsCurrent = seasonKeyChanged ? 0 : progress.simSeasonPoints ?? 0;
  const seasonTierCurrent = seasonKeyChanged
    ? ("UNRANKED" as SimulationLadderTier)
    : ((progress.simSeasonTier as SimulationLadderTier | null) ?? "UNRANKED");
  let seasonRewardMask = seasonKeyChanged ? 0 : progress.simSeasonRewardMask ?? 0;

  const recentSimCount = await timedDb("socialRelationshipEvent.count(awardFamilySimulationInteraction.recentSims)", () =>
    fdb.socialRelationshipEvent.count({
      where: {
        relationshipId: relationship.id,
        eventType: "SIMULATION_COMPLETED",
        createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
      }
    })
  );
  const simFarmMultiplier = recentSimCount >= 10 ? 0.4 : recentSimCount >= 6 ? 0.6 : recentSimCount >= 3 ? 0.8 : 1;

  const outcome = pickFamilySimulationOutcome({
    bondLevel: progress.bondLevel ?? 1,
    streak: progress.currentStreak ?? 0,
    bondScore: progress.bondScore ?? 0
  });
  const scenario = pickFamilySimulationScenario(outcome);

  let xpGain = 0;
  let coinGain = 0;
  let bondXpDelta = 0;
  let bondScoreDelta = 0;
  let streakDelta = 0;

  if (outcome === "GOOD") {
    xpGain = Math.floor((28 + Math.random() * 25) * rate * familyEvent.xpMultiplier);
    coinGain = Math.floor((35 + Math.random() * 36) * rate * familyEvent.coinMultiplier);
    bondXpDelta = Math.floor((24 + Math.random() * 22) * rate * familyEvent.bondMultiplier);
    bondScoreDelta = Math.floor((18 + Math.random() * 18) * rate);
    streakDelta = 1;
  } else if (outcome === "NEUTRAL") {
    xpGain = Math.floor((12 + Math.random() * 17) * rate * Math.max(1, familyEvent.xpMultiplier - 0.05));
    coinGain = Math.floor((15 + Math.random() * 21) * rate * Math.max(1, familyEvent.coinMultiplier - 0.05));
    bondXpDelta = Math.floor((8 + Math.random() * 11) * rate * Math.max(1, familyEvent.bondMultiplier - 0.05));
    bondScoreDelta = Math.floor((6 + Math.random() * 7) * rate);
    streakDelta = 0;
  } else {
    xpGain = Math.floor((4 + Math.random() * 9) * rate);
    coinGain = Math.floor((5 + Math.random() * 11) * rate);
    bondXpDelta = -Math.floor((3 + Math.random() * 6) * Math.max(0.8, 1.05 - familyEvent.bondMultiplier * 0.2));
    bondScoreDelta = -Math.floor((4 + Math.random() * 7) * Math.max(0.8, 1.05 - familyEvent.xpMultiplier * 0.15));
    streakDelta = -1;
  }

  const baseSeasonPoints =
    outcome === "GOOD"
      ? 22
      : outcome === "NEUTRAL"
        ? 8
        : -12;
  const seasonPointsDelta = Math.round(baseSeasonPoints * simFarmMultiplier);

  const prevSimWinStreak = progress.simWinStreak ?? 0;
  const nextSimWinStreak = outcome === "GOOD" ? prevSimWinStreak + 1 : 0;
  const nextSimBestWinStreak = Math.max(progress.simBestWinStreak ?? 0, nextSimWinStreak);
  let nextSimMilestoneMask = progress.simMilestoneMask ?? 0;
  const unlockedMilestones: Array<{ streak: number; reward: SimulationMilestoneReward }> = [];

  let milestoneBonusXp = 0;
  let milestoneBonusCoins = 0;
  let milestoneBonusBondXp = 0;
  if (outcome === "GOOD") {
    for (const streakTarget of FAMILY_SIM_MILESTONES) {
      const bit = simulationMilestoneBit(streakTarget);
      if (bit === 0) continue;
      if (nextSimWinStreak < streakTarget) continue;
      if ((nextSimMilestoneMask & bit) !== 0) continue;

      const reward = FAMILY_SIM_MILESTONE_REWARDS[streakTarget];
      if (!reward) continue;
      nextSimMilestoneMask |= bit;
      unlockedMilestones.push({ streak: streakTarget, reward });
      milestoneBonusXp += Math.floor(reward.xp * rate);
      milestoneBonusCoins += Math.floor(reward.coins * rate);
      milestoneBonusBondXp += Math.floor(reward.bondXp * rate);
    }
  }

  const totalUserXpGain = xpGain + milestoneBonusXp;
  const totalUserCoinGain = coinGain + milestoneBonusCoins;
  const totalBondXpDelta = bondXpDelta + milestoneBonusBondXp;

  const nextSeasonPoints = Math.max(0, seasonPointsCurrent + seasonPointsDelta);
  const nextSeasonTier = ladderTierFromPoints(nextSeasonPoints);
  const ladderUnlocked: Array<{ tier: SimulationLadderTier; reward: SimulationMilestoneReward }> = [];
  let ladderBonusXp = 0;
  let ladderBonusCoins = 0;
  let ladderBonusBondXp = 0;
  for (const tier of SIM_LADDER_REWARD_TIERS) {
    const threshold = SIM_LADDER_THRESHOLDS.find((t) => t.tier === tier)?.minPoints ?? Number.MAX_SAFE_INTEGER;
    if (seasonPointsCurrent >= threshold || nextSeasonPoints < threshold) continue;
    const bit = ladderRewardBit(tier);
    if (bit === 0 || (seasonRewardMask & bit) !== 0) continue;
    const reward = SIM_LADDER_REWARDS[tier];
    if (!reward) continue;
    seasonRewardMask |= bit;
    ladderUnlocked.push({ tier, reward });
    ladderBonusXp += Math.floor(reward.xp * rate);
    ladderBonusCoins += Math.floor(reward.coins * rate);
    ladderBonusBondXp += Math.floor(reward.bondXp * rate);
  }

  const finalUserXpGain = totalUserXpGain + ladderBonusXp;
  const finalUserCoinGain = totalUserCoinGain + ladderBonusCoins;
  const finalBondXpDelta = totalBondXpDelta + ladderBonusBondXp;
  const nextBondXp = Math.max(0, (progress.bondXp ?? 0) + finalBondXpDelta);
  const nextBond = computeBondLevel(nextBondXp);
  const nextBondScore = Math.max(0, (progress.bondScore ?? 0) + bondScoreDelta);
  const nextStreak = Math.max(0, (progress.currentStreak ?? 0) + streakDelta);
  const nextBestStreak = Math.max(progress.bestStreak ?? 0, nextStreak);

  await timedDb("socialRelationshipProgress.update(awardFamilySimulationInteraction)", () =>
    fdb.socialRelationshipProgress.update({
      where: { relationshipId: relationship.id },
      data: {
        bondXp: nextBondXp,
        bondLevel: nextBond.level,
        bondScore: nextBondScore,
        currentStreak: nextStreak,
        bestStreak: nextBestStreak,
        simWinStreak: nextSimWinStreak,
        simBestWinStreak: nextSimBestWinStreak,
        simMilestoneMask: nextSimMilestoneMask,
        simSeasonKey: seasonKey,
        simSeasonPoints: nextSeasonPoints,
        simSeasonTier: nextSeasonTier,
        simSeasonRewardMask: seasonRewardMask,
        lastSimulationAt: now
      }
    })
  );

  await addRelationshipEvent(relationship.id, input.userId, "SIMULATION_COMPLETED", {
    outcome,
    bondXpDelta,
    bondScoreDelta,
    streakDelta,
    xp: finalUserXpGain,
    coins: finalUserCoinGain,
    simWinStreak: nextSimWinStreak,
    simBestWinStreak: nextSimBestWinStreak,
    milestones: unlockedMilestones.map((m) => m.streak),
    seasonPointsDelta,
    seasonPoints: nextSeasonPoints,
    seasonTier: nextSeasonTier,
    ladderPromotions: ladderUnlocked.map((l) => l.tier)
  });

  await Promise.all([
    grantCommandProgress({
      userId: input.userId,
      guildId: input.guildId,
      username: input.username,
      commandName: "family_simulation"
    }),
    grantCommandProgress({
      userId: partnerId,
      guildId: input.guildId,
      username: partnerUser?.username ?? partnerId,
      commandName: "family_simulation"
    }),
    timedDb("userProgress.upsert(awardFamilySimulationInteraction.self)", () =>
      fdb.userProgress.upsert({
        where: { userId: input.userId },
        update: {
          guildId: input.guildId,
          xp: { increment: finalUserXpGain },
          coins: { increment: finalUserCoinGain }
        },
        create: {
          userId: input.userId,
          guildId: input.guildId,
          level: 1,
          title: "Rookie",
          xp: finalUserXpGain,
          coins: finalUserCoinGain
        }
      })
    ),
    timedDb("userProgress.upsert(awardFamilySimulationInteraction.partner)", () =>
      fdb.userProgress.upsert({
        where: { userId: partnerId },
        update: {
          guildId: input.guildId,
          xp: { increment: finalUserXpGain },
          coins: { increment: finalUserCoinGain }
        },
        create: {
          userId: partnerId,
          guildId: input.guildId,
          level: 1,
          title: "Rookie",
          xp: finalUserXpGain,
          coins: finalUserCoinGain
        }
      })
    ),
    timedDb("transaction.create(awardFamilySimulationInteraction.self)", () =>
      fdb.transaction.create({
        data: {
          userId: input.userId,
          guildId: input.guildId,
          amount: finalUserCoinGain,
          reason: "family-simulation"
        }
      })
    ),
    timedDb("transaction.create(awardFamilySimulationInteraction.partner)", () =>
      fdb.transaction.create({
        data: {
          userId: partnerId,
          guildId: input.guildId,
          amount: finalUserCoinGain,
          reason: "family-simulation"
        }
      })
    )
  ]);

  invalidateFamilyProfileCache(input.userId, partnerId);
  invalidateFamilyLeaderboardCache();

  return {
    relationshipId: relationship.id,
    partnerId,
    partnerUsername: partnerUser?.username ?? "Unknown",
    outcome,
    scenario: scenario.text,
    cooldownEndsAt: new Date(now.getTime() + FAMILY_SIM_COOLDOWN_MS),
    rewards: {
      xp: finalUserXpGain,
      coins: finalUserCoinGain,
      bondXpDelta: finalBondXpDelta,
      bondScoreDelta
    },
    milestone: {
      unlocked: unlockedMilestones,
      bonus: {
        xp: milestoneBonusXp,
        coins: milestoneBonusCoins,
        bondXp: milestoneBonusBondXp
      }
    },
    streak: {
      current: nextStreak,
      best: nextBestStreak,
      delta: streakDelta
    },
    simWinStreak: {
      current: nextSimWinStreak,
      best: nextSimBestWinStreak
    },
    ladder: {
      seasonKey,
      tier: nextSeasonTier,
      points: nextSeasonPoints,
      pointsDelta: seasonPointsDelta,
      antiFarmMultiplier: simFarmMultiplier,
      promoted: ladderUnlocked
    },
    bond: {
      level: nextBond.level,
      progress: nextBond.progress,
      required: nextBond.required
    },
    event: {
      code: familyEvent.code,
      name: familyEvent.name,
      bonusText: familyEvent.bonusText,
      endsAt: familyEvent.endsAt
    }
  };
}

export async function claimAnniversaryReward(input: { userId: string; guildId: string | null }) {
  ensureSocialDelegates();
  const rel = await activePartnerFor(input.userId);
  if (!rel) throw new Error("You are not married right now.");
  if (!rel.progress) throw new Error("Relationship progress missing.");

  const now = new Date();
  const currentMonth = monthKey(now);
  const claimedMonth = rel.progress.anniversaryClaimedAt
    ? monthKey(new Date(rel.progress.anniversaryClaimedAt))
    : null;
  if (claimedMonth === currentMonth) {
    throw new Error("You already claimed your anniversary reward this month.");
  }

  const daysTogether = Math.max(
    0,
    Math.floor((now.getTime() - new Date(rel.startedAt).getTime()) / 86_400_000)
  );
  const xp = 120 + Math.min(600, daysTogether * 2);
  const coins = 180 + Math.min(1200, daysTogether * 3);
  const bondXpGain = 90 + Math.min(450, Math.floor(daysTogether * 1.5));

  const currentBondXp = rel.progress.bondXp;
  const nextBond = computeBondLevel(currentBondXp + bondXpGain);

  await Promise.all([
    timedDb("socialRelationshipProgress.update(claimAnniversaryReward)", () =>
      fdb.socialRelationshipProgress.update({
        where: { relationshipId: rel.id },
        data: {
          anniversaryClaimedAt: now,
          bondXp: currentBondXp + bondXpGain,
          bondLevel: nextBond.level,
          bondScore: { increment: Math.floor(bondXpGain / 2) }
        }
      })
    ),
    timedDb("userProgress.upsert(claimAnniversaryReward)", () =>
      fdb.userProgress.upsert({
        where: { userId: input.userId },
        update: {
          guildId: input.guildId,
          xp: { increment: xp },
          coins: { increment: coins }
        },
        create: {
          userId: input.userId,
          guildId: input.guildId,
          level: 1,
          title: "Rookie",
          xp,
          coins
        }
      })
    ),
    timedDb("transaction.create(claimAnniversaryReward)", () =>
      fdb.transaction.create({
        data: {
          userId: input.userId,
          guildId: input.guildId,
          amount: coins,
          reason: "family-anniversary"
        }
      })
    )
  ]);

  invalidateFamilyProfileCache(input.userId, rel.userAId, rel.userBId);
  invalidateFamilyLeaderboardCache();

  return {
    relationshipId: rel.id,
    partnerId: rel.userAId === input.userId ? rel.userBId : rel.userAId,
    daysTogether,
    rewards: { xp, coins, bondXp: bondXpGain }
  };
}

export async function getFamilyProfile(userId: string): Promise<any> {
  ensureSocialDelegates();
  const cached = profileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const [partner, siblings] = await Promise.all([
    activePartnerFor(userId),
    fdb.socialRelationship.findMany({
      where: {
        type: "SIBLING",
        status: "ACTIVE",
        OR: [{ userAId: userId }, { userBId: userId }]
      },
      include: { progress: true }
    })
  ]);

  let partnerId: string | null = null;
  if (partner) {
    partnerId = partner.userAId === userId ? partner.userBId : partner.userAId;
  }

  const siblingIds = siblings.map((s: any) => (s.userAId === userId ? s.userBId : s.userAId));
  const siblingUsers: Array<{ id: string; username: string | null }> =
    siblingIds.length > 0
      ? await fdb.discordUser.findMany({ where: { id: { in: siblingIds } } })
      : [];

  const siblingMap = new Map<string, { id: string; username: string | null }>(siblingUsers.map((u) => [u.id, u]));
  const siblingDetails = siblings.map((s: any) => {
    const id = s.userAId === userId ? s.userBId : s.userAId;
    const u = siblingMap.get(id);
    return {
      userId: id,
      username: u?.username ?? id,
      bondScore: s.progress?.bondScore ?? 0
    };
  });

  const partnerUser =
    partnerId
      ? await fdb.discordUser.findUnique({ where: { id: partnerId } })
      : null;

  const resolved = {
    partner: partner
      ? {
          userId: partnerId,
          username: partnerUser?.username ?? partnerId,
          since: partner.startedAt,
          bondLevel: partner.progress?.bondLevel ?? 1,
          bondXp: partner.progress?.bondXp ?? 0,
          bondScore: partner.progress?.bondScore ?? 0,
          totalDates: partner.progress?.totalDates ?? 0,
          streak: partner.progress?.currentStreak ?? 0,
          bestStreak: partner.progress?.bestStreak ?? 0,
          simWinStreak: partner.progress?.simWinStreak ?? 0,
          simBestWinStreak: partner.progress?.simBestWinStreak ?? 0
        }
      : null,
    siblings: siblingDetails,
    siblingCount: siblingDetails.length,
    totalBondScore:
      (partner?.progress?.bondScore ?? 0) +
      siblingDetails.reduce((a: number, b: { bondScore: number }) => a + (b.bondScore ?? 0), 0)
  };
  profileCache.set(userId, { value: resolved, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  return resolved;
}

export async function getCoupleLeaderboard(limit = 10): Promise<any[]> {
  ensureSocialDelegates();
  const cached = coupleLeaderboardCache.get(limit);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const couples = await fdb.socialRelationship.findMany({
    where: { type: "PARTNER", status: "ACTIVE" },
    include: { progress: true }
  });

  const userIds = couples.flatMap((c: any) => [c.userAId, c.userBId]);
  const users = await fdb.discordUser.findMany({ where: { id: { in: userIds } } });
  const userMap = new Map(users.map((u: any) => [u.id, u.username]));

  const resolved = couples
    .map((c: any) => ({
      relationshipId: c.id,
      userAId: c.userAId,
      userBId: c.userBId,
      userAName: userMap.get(c.userAId) ?? c.userAId,
      userBName: userMap.get(c.userBId) ?? c.userBId,
      bondScore: c.progress?.bondScore ?? 0,
      totalDates: c.progress?.totalDates ?? 0,
      streak: c.progress?.currentStreak ?? 0
    }))
    .sort((a: any, b: any) => b.bondScore - a.bondScore || b.totalDates - a.totalDates || b.streak - a.streak)
    .slice(0, limit);
  coupleLeaderboardCache.set(limit, { value: resolved, expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS });
  return resolved;
}

export async function getTopFamilyLeaderboard(limit = 10): Promise<any[]> {
  ensureSocialDelegates();
  const cached = familyLeaderboardCache.get(limit);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const users = await fdb.discordUser.findMany({
    take: 200
  });

  const rows = await Promise.all(
    users.map(async (u: any) => {
      const profile = await getFamilyProfile(u.id);
      return {
        userId: u.id,
        username: u.username,
        totalBondScore: profile.totalBondScore,
        siblingCount: profile.siblingCount,
        hasPartner: Boolean(profile.partner)
      };
    })
  );

  const resolved = rows.sort((a, b) => b.totalBondScore - a.totalBondScore).slice(0, limit);
  familyLeaderboardCache.set(limit, { value: resolved, expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS });
  return resolved;
}

export async function addSibling(from: User, to: User, guildId: string | null) {
  await ensureDiscordUser(from);
  await ensureDiscordUser(to);
  if (from.id === to.id) throw new Error("You cannot add yourself as sibling.");
  if (to.bot) throw new Error("You cannot add a bot as sibling.");

  const relationship = await createRelationship({
    type: "SIBLING",
    userAId: from.id,
    userBId: to.id,
    guildId
  });
  await addRelationshipEvent(relationship.id, from.id, "ACCEPTED");
  invalidateFamilyProfileCache(from.id, to.id);
  invalidateFamilyLeaderboardCache();
  return relationship;
}

export async function removeSibling(userId: string, targetId: string) {
  ensureSocialDelegates();
  const rel = await activeRelationship("SIBLING", userId, targetId);
  if (!rel) throw new Error("That user is not your active sibling.");
  await fdb.socialRelationship.update({
    where: { id: rel.id },
    data: { status: "ENDED", endedAt: new Date() }
  });
  invalidateFamilyProfileCache(userId, targetId);
  invalidateFamilyLeaderboardCache();
  return rel;
}

export async function getBondStatus(userId: string, targetId: string) {
  ensureSocialDelegates();
  const [partner, sibling] = await Promise.all([
    activeRelationship("PARTNER", userId, targetId),
    activeRelationship("SIBLING", userId, targetId)
  ]);
  const rel = partner ?? sibling;
  if (!rel) return null;
  return {
    type: rel.type as "PARTNER" | "SIBLING",
    startedAt: rel.startedAt,
    bondLevel: rel.progress?.bondLevel ?? 1,
    bondXp: rel.progress?.bondXp ?? 0,
    bondScore: rel.progress?.bondScore ?? 0,
    streak: rel.progress?.currentStreak ?? 0,
    totalDates: rel.progress?.totalDates ?? 0
  };
}

export async function getFamilySimulationAnalytics(userId: string) {
  ensureSocialDelegates();
  const rel = await activePartnerFor(userId);
  if (!rel) throw new Error("You need an active partner to view family simulation stats.");

  const partnerId = rel.userAId === userId ? rel.userBId : rel.userAId;
  const partnerUser = await timedDb("discordUser.findUnique(getFamilySimulationAnalytics.partner)", () =>
    fdb.discordUser.findUnique({ where: { id: partnerId } })
  );

  const events = await timedDb("socialRelationshipEvent.findMany(getFamilySimulationAnalytics)", () =>
    fdb.socialRelationshipEvent.findMany({
      where: {
        relationshipId: rel.id,
        eventType: "SIMULATION_COMPLETED"
      },
      orderBy: { createdAt: "desc" },
      take: 200
    })
  );

  const parsed: Array<{
    createdAt: Date;
    outcome: FamilySimulationOutcome;
    bondScoreDelta: number;
    bondXpDelta: number;
    streakDelta: number;
    xp: number;
    coins: number;
  }> = events.map((e: any) => {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const outcomeRaw = String(meta.outcome ?? "NEUTRAL").toUpperCase();
    const outcome: FamilySimulationOutcome =
      outcomeRaw === "GOOD" || outcomeRaw === "BAD" ? outcomeRaw : "NEUTRAL";
    const bondScoreDelta = Number(meta.bondScoreDelta ?? 0);
    const bondXpDelta = Number(meta.bondXpDelta ?? 0);
    const streakDelta = Number(meta.streakDelta ?? 0);
    const xp = Number(meta.xp ?? 0);
    const coins = Number(meta.coins ?? 0);
    return {
      createdAt: new Date(e.createdAt),
      outcome,
      bondScoreDelta: Number.isFinite(bondScoreDelta) ? bondScoreDelta : 0,
      bondXpDelta: Number.isFinite(bondXpDelta) ? bondXpDelta : 0,
      streakDelta: Number.isFinite(streakDelta) ? streakDelta : 0,
      xp: Number.isFinite(xp) ? xp : 0,
      coins: Number.isFinite(coins) ? coins : 0
    };
  });

  const seasonKey = weekPeriodKeyFromDate(new Date());
  const seasonFresh = (rel.progress?.simSeasonKey ?? seasonKey) === seasonKey;
  const total = parsed.length;
  const good = parsed.filter((x: (typeof parsed)[number]) => x.outcome === "GOOD").length;
  const neutral = parsed.filter((x: (typeof parsed)[number]) => x.outcome === "NEUTRAL").length;
  const bad = parsed.filter((x: (typeof parsed)[number]) => x.outcome === "BAD").length;
  const winrate = total > 0 ? Math.round((good / total) * 100) : 0;
  const avgBondScoreDelta =
    total > 0 ? Number((parsed.reduce((s: number, x: (typeof parsed)[number]) => s + x.bondScoreDelta, 0) / total).toFixed(2)) : 0;
  const avgBondXpDelta =
    total > 0 ? Number((parsed.reduce((s: number, x: (typeof parsed)[number]) => s + x.bondXpDelta, 0) / total).toFixed(2)) : 0;
  const recent = parsed.slice(0, 10);
  const recentFive = parsed.slice(0, 5);
  const trendValue =
    recentFive.length > 0 ? recentFive.reduce((s: number, x: (typeof parsed)[number]) => s + x.bondScoreDelta, 0) / recentFive.length : 0;
  const trend =
    trendValue > 2 ? "UP" : trendValue < -2 ? "DOWN" : "STEADY";

  return {
    relationshipId: rel.id,
    partnerId,
    partnerUsername: partnerUser?.username ?? partnerId,
    simSeasonKey: seasonKey,
    simSeasonPoints: seasonFresh ? rel.progress?.simSeasonPoints ?? 0 : 0,
    simSeasonTier: seasonFresh ? (rel.progress?.simSeasonTier as SimulationLadderTier | null) ?? "UNRANKED" : "UNRANKED",
    simWinStreakCurrent: rel.progress?.simWinStreak ?? 0,
    simWinStreakBest: rel.progress?.simBestWinStreak ?? 0,
    total,
    good,
    neutral,
    bad,
    winrate,
    avgBondScoreDelta,
    avgBondXpDelta,
    trend,
    recent
  };
}

export async function getFamilySimulationMilestoneBoard(userId: string) {
  ensureSocialDelegates();
  const rel = await activePartnerFor(userId);
  if (!rel) throw new Error("You need an active partner to view simulation milestones.");

  const partnerId = rel.userAId === userId ? rel.userBId : rel.userAId;
  const partnerUser = await timedDb("discordUser.findUnique(getFamilySimulationMilestoneBoard.partner)", () =>
    fdb.discordUser.findUnique({ where: { id: partnerId } })
  );

  const current = rel.progress?.simWinStreak ?? 0;
  const best = rel.progress?.simBestWinStreak ?? 0;
  const mask = rel.progress?.simMilestoneMask ?? 0;

  const milestones: FamilySimulationMilestoneEntry[] = FAMILY_SIM_MILESTONES.map((streak) => {
    const bit = simulationMilestoneBit(streak);
    const reward = FAMILY_SIM_MILESTONE_REWARDS[streak];
    const unlocked = bit !== 0 && (mask & bit) !== 0;
    const progress = unlocked ? streak : Math.min(current, streak);
    const remaining = unlocked ? 0 : Math.max(0, streak - current);
    return {
      streak,
      unlocked,
      progress,
      remaining,
      reward
    };
  });

  const unlockedCount = milestones.filter((m) => m.unlocked).length;
  const nextMilestone = milestones.find((m) => !m.unlocked) ?? null;

  return {
    relationshipId: rel.id,
    partnerId,
    partnerUsername: partnerUser?.username ?? partnerId,
    currentWinStreak: current,
    bestWinStreak: best,
    unlockedCount,
    totalMilestones: milestones.length,
    nextMilestone,
    milestones
  };
}

export async function getFamilySimulationLadder(input: { userId: string; limit?: number }) {
  ensureSocialDelegates();
  const rel = await activePartnerFor(input.userId);
  if (!rel) throw new Error("You need an active partner to view simulation ladder.");

  const seasonKey = weekPeriodKeyFromDate(new Date());
  const limit = Math.max(1, Math.min(30, input.limit ?? 10));
  const activeCouples = await timedDb("socialRelationship.findMany(getFamilySimulationLadder)", () =>
    fdb.socialRelationship.findMany({
      where: { type: "PARTNER", status: "ACTIVE" },
      include: { progress: true }
    })
  );
  const userIds = activeCouples.flatMap((c: any) => [c.userAId, c.userBId]);
  const users = userIds.length
    ? await timedDb("discordUser.findMany(getFamilySimulationLadder.users)", () =>
        fdb.discordUser.findMany({ where: { id: { in: userIds } } })
      )
    : [];
  const userMap = new Map<string, string>(users.map((u: any) => [u.id, u.username ?? u.id]));

  const rows = activeCouples
    .map((c: any) => {
      const seasonFresh = (c.progress?.simSeasonKey ?? seasonKey) === seasonKey;
      const points = seasonFresh ? c.progress?.simSeasonPoints ?? 0 : 0;
      const tier = seasonFresh ? (c.progress?.simSeasonTier as SimulationLadderTier | null) ?? "UNRANKED" : "UNRANKED";
      return {
        relationshipId: c.id,
        userAId: c.userAId,
        userBId: c.userBId,
        userAName: userMap.get(c.userAId) ?? c.userAId,
        userBName: userMap.get(c.userBId) ?? c.userBId,
        points,
        tier,
        simBestWinStreak: c.progress?.simBestWinStreak ?? 0,
        bondScore: c.progress?.bondScore ?? 0
      };
    })
    .sort(
      (a: any, b: any) =>
        b.points - a.points ||
        b.simBestWinStreak - a.simBestWinStreak ||
        b.bondScore - a.bondScore
    );

  const top = rows.slice(0, limit);
  const self = rows.find((r: any) => r.relationshipId === rel.id) ?? null;
  const selfRank = self ? rows.findIndex((r: any) => r.relationshipId === rel.id) + 1 : null;

  return {
    seasonKey,
    top,
    self,
    selfRank,
    totalCouples: rows.length
  };
}

export function buildFamilySimulationPanelComponents(controllerId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`family:simpanel:${controllerId}:run`)
        .setLabel("Run Sim")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`family:simpanel:${controllerId}:stats`)
        .setLabel("View Stats")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`family:simpanel:${controllerId}:recent`)
        .setLabel("Last 10")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`family:simpanel:${controllerId}:milestones`)
        .setLabel("Milestones")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`family:simpanel:${controllerId}:ladder`)
        .setLabel("Ladder")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function buildFamilySimulationResultEmbed(
  result: Awaited<ReturnType<typeof awardFamilySimulationInteraction>>,
  user: User
) {
  const statusText =
    result.outcome === "GOOD"
      ? "✨ Amazing Simulation"
      : result.outcome === "NEUTRAL"
        ? "🫧 Calm Simulation"
        : "⚠️ Rough Simulation";
  const streakText =
    result.streak.delta > 0
      ? `+${result.streak.delta}`
      : result.streak.delta < 0
        ? `${result.streak.delta}`
        : "±0";

  return new EmbedBuilder()
    .setColor(result.outcome === "BAD" ? 0xff4400 : 0xf72585)
    .setAuthor({
      name: `${user.displayName}'s Family Simulation`,
      iconURL: user.displayAvatarURL()
    })
    .setDescription(
      [
        `${statusText}`,
        `Partner: <@${result.partnerId}>`,
        "",
        `*${result.scenario}*`,
        "",
        `XP: \`${result.rewards.xp >= 0 ? "+" : ""}${result.rewards.xp}\` • Coins: \`${result.rewards.coins >= 0 ? "+" : ""}${result.rewards.coins}\``,
        `Bond XP: \`${result.rewards.bondXpDelta >= 0 ? "+" : ""}${result.rewards.bondXpDelta}\` • UwU Score: \`${result.rewards.bondScoreDelta >= 0 ? "+" : ""}${result.rewards.bondScoreDelta}\``,
        `Streak Change: \`${streakText}\` • Current Streak: \`${result.streak.current}\``,
        `Sim Win Streak: \`${result.simWinStreak.current}\` (Best: \`${result.simWinStreak.best}\`)`,
        `Ladder: ${ladderTierEmoji(result.ladder.tier)} **${result.ladder.tier}** • Points: \`${result.ladder.points}\` (${result.ladder.pointsDelta >= 0 ? "+" : ""}${result.ladder.pointsDelta})`,
        `Bond Level: \`${result.bond.level}\` (\`${result.bond.progress}/${result.bond.required}\`)`,
        result.milestone.unlocked.length > 0
          ? `🎉 Milestone: ${result.milestone.unlocked.map((m) => `\`${m.streak}\``).join(" • ")}`
          : null,
        result.milestone.bonus.xp > 0 || result.milestone.bonus.coins > 0 || result.milestone.bonus.bondXp > 0
          ? `🎁 Milestone Bonus: +${result.milestone.bonus.xp} XP • +${result.milestone.bonus.coins} coins • +${result.milestone.bonus.bondXp} bond XP`
          : null,
        result.ladder.promoted.length > 0
          ? `🚀 Ladder Promotion: ${result.ladder.promoted.map((p) => `**${p.tier}**`).join(" • ")}`
          : null,
        "",
        `Event: **${result.event.name}**`,
        `Next simulation: <t:${Math.floor(result.cooldownEndsAt.getTime() / 1000)}:R>`
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({ text: "Team Tatsui ❤️" });
}

export function buildFamilySimulationStatsEmbed(
  stats: Awaited<ReturnType<typeof getFamilySimulationAnalytics>>,
  user: User
) {
  const trendEmoji =
    stats.trend === "UP" ? "📈" : stats.trend === "DOWN" ? "📉" : "➖";
  const recentLines =
    stats.recent.length > 0
      ? stats.recent
          .map((r: (typeof stats.recent)[number], i: number) => {
            const badge = r.outcome === "GOOD" ? "✅" : r.outcome === "BAD" ? "⚠️" : "▫️";
            const score = `${r.bondScoreDelta >= 0 ? "+" : ""}${r.bondScoreDelta}`;
            const bondXp = `${r.bondXpDelta >= 0 ? "+" : ""}${r.bondXpDelta}`;
            return `${i + 1}. ${badge} <t:${Math.floor(r.createdAt.getTime() / 1000)}:R> • UwU ${score} • BondXP ${bondXp}`;
          })
          .join("\n")
      : "No simulation history yet.";

  return new EmbedBuilder()
    .setColor(0xf72585)
    .setAuthor({
      name: `${user.displayName}'s Simulation Log`,
      iconURL: user.displayAvatarURL()
    })
    .setDescription(
      [
        `Partner: <@${stats.partnerId}>`,
        `Season: **${stats.simSeasonKey}** • ${ladderTierEmoji(stats.simSeasonTier)} **${stats.simSeasonTier}** • Points: \`${stats.simSeasonPoints}\``,
        `Total Simulations: **${stats.total}**`,
        `Winrate: **${stats.winrate}%**`,
        `Sim Win Streak: **${stats.simWinStreakCurrent}** (Best: **${stats.simWinStreakBest}**)`,
        `Trend: ${trendEmoji} **${stats.trend}**`,
        "",
        `Outcomes: ✅ \`${stats.good}\` • ▫️ \`${stats.neutral}\` • ⚠️ \`${stats.bad}\``,
        `Avg UwU Δ: \`${stats.avgBondScoreDelta >= 0 ? "+" : ""}${stats.avgBondScoreDelta}\` • Avg BondXP Δ: \`${stats.avgBondXpDelta >= 0 ? "+" : ""}${stats.avgBondXpDelta}\``
      ].join("\n")
    )
    .addFields({ name: "Recent Simulations", value: recentLines })
    .setFooter({ text: "Team Tatsui ❤️" });
}

export function buildFamilySimulationRecentEmbed(
  stats: Awaited<ReturnType<typeof getFamilySimulationAnalytics>>,
  user: User
) {
  const recentLines =
    stats.recent.length > 0
      ? stats.recent
          .map((r: (typeof stats.recent)[number], i: number) => {
            const badge = r.outcome === "GOOD" ? "✅" : r.outcome === "BAD" ? "⚠️" : "▫️";
            const score = `${r.bondScoreDelta >= 0 ? "+" : ""}${r.bondScoreDelta}`;
            const bondXp = `${r.bondXpDelta >= 0 ? "+" : ""}${r.bondXpDelta}`;
            const xp = `${r.xp >= 0 ? "+" : ""}${r.xp}`;
            const coins = `${r.coins >= 0 ? "+" : ""}${r.coins}`;
            return `${i + 1}. ${badge} <t:${Math.floor(r.createdAt.getTime() / 1000)}:R>\n> XP ${xp} • Coins ${coins} • UwU ${score} • BondXP ${bondXp}`;
          })
          .join("\n")
      : "No simulation history yet.";

  return new EmbedBuilder()
    .setColor(0xf72585)
    .setAuthor({
      name: `${user.displayName}'s Last 10 Simulations`,
      iconURL: user.displayAvatarURL()
    })
    .setDescription(
      [
        `Partner: <@${stats.partnerId}>`,
        `Sim Win Streak: **${stats.simWinStreakCurrent}** (Best: **${stats.simWinStreakBest}**)`
      ].join("\n")
    )
    .addFields({ name: "History", value: recentLines })
    .setFooter({ text: "Team Tatsui ❤️" });
}

export function buildFamilySimulationMilestonesEmbed(
  board: Awaited<ReturnType<typeof getFamilySimulationMilestoneBoard>>,
  user: User
) {
  const lines = board.milestones
    .map((m) => {
      const icon = m.unlocked ? "🏆" : "▫️";
      const progressText = `\`${m.progress}/${m.streak}\``;
      const rewardText = `+${m.reward.xp} XP • +${m.reward.coins} coins • +${m.reward.bondXp} bond XP`;
      return `${icon} **${m.streak} Win Streak**\n> Progress: ${progressText}${m.unlocked ? " • `UNLOCKED`" : ""}\n> Reward: ${rewardText}`;
    })
    .join("\n\n");

  const nextLine = board.nextMilestone
    ? `Next milestone: **${board.nextMilestone.streak}** (need **${board.nextMilestone.remaining}** more win${board.nextMilestone.remaining === 1 ? "" : "s"})`
    : "All milestones unlocked. You are cracked.";

  return new EmbedBuilder()
    .setColor(0xf72585)
    .setAuthor({
      name: `${user.displayName}'s Sim Milestones`,
      iconURL: user.displayAvatarURL()
    })
    .setDescription(
      [
        `Partner: <@${board.partnerId}>`,
        `Unlocked: **${board.unlockedCount}/${board.totalMilestones}**`,
        `Current Sim Win Streak: **${board.currentWinStreak}** • Best: **${board.bestWinStreak}**`,
        nextLine
      ].join("\n")
    )
    .addFields({ name: "Milestone Board", value: lines || "No milestones configured." })
    .setFooter({ text: "Team Tatsui ❤️" });
}

export function buildFamilySimulationLadderEmbed(
  ladder: Awaited<ReturnType<typeof getFamilySimulationLadder>>,
  user: User
) {
  const rowsText =
    ladder.top.length > 0
      ? ladder.top
          .map(
            (r: (typeof ladder.top)[number], i: number) =>
              `\`${i + 1}.\` <@${r.userAId}> ♡ <@${r.userBId}>\n> ${ladderTierEmoji(r.tier)} \`${r.tier}\` • Points: \`${r.points}\` • Best Sim WS: \`${r.simBestWinStreak}\``
          )
          .join("\n\n")
      : "No active couples in ladder yet.";

  const selfLine = ladder.self
    ? `Your Rank: **#${ladder.selfRank}** • ${ladderTierEmoji(ladder.self.tier)} **${ladder.self.tier}** • \`${ladder.self.points}\` pts`
    : "You are not in the active simulation ladder yet.";

  return new EmbedBuilder()
    .setColor(0xf72585)
    .setAuthor({
      name: `${user.displayName}'s Seasonal Sim Ladder`,
      iconURL: user.displayAvatarURL()
    })
    .setDescription(
      [
        `Season: **${ladder.seasonKey}**`,
        `Active Couples: **${ladder.totalCouples}**`,
        selfLine
      ].join("\n")
    )
    .addFields({ name: "Top Couples", value: rowsText })
    .setFooter({ text: "Team Tatsui ❤️" });
}

type FamilyQuest = {
  key: string;
  type: "daily" | "weekly";
  periodKey: string;
  title: string;
  progress: number;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  rewardBondXp: number;
  completed: boolean;
  claimed: boolean;
};

type PartnerIdentityInput = {
  bondLevel: number;
  totalDates: number;
  streak: number;
  bestStreak: number;
  bondScore: number;
  since: Date;
};

export function getPartnerTitle(input: PartnerIdentityInput) {
  const lvl = input.bondLevel;
  if (lvl >= 35) return "Celestial Soulmate";
  if (lvl >= 25) return "Legendary Pair";
  if (lvl >= 18) return "Soulbound";
  if (lvl >= 12) return "Heartwoven Duo";
  if (lvl >= 7) return "Hopeless Duo";
  if (lvl >= 3) return "Blooming Pair";
  return "Newly Wed";
}

export function getPartnerBadges(input: PartnerIdentityInput) {
  const badges: string[] = [];
  if (input.totalDates >= 1) badges.push("🎟 First Date");
  if (input.totalDates >= 10) badges.push("💫 Date Addict");
  if (input.totalDates >= 50) badges.push("🌟 Date Veteran");
  if (input.totalDates >= 100) badges.push("👑 Date Legend");

  if (input.streak >= 3 || input.bestStreak >= 3) badges.push("🔥 Warm Streak");
  if (input.streak >= 10 || input.bestStreak >= 10) badges.push("⚡ Hot Streak");
  if (input.streak >= 30 || input.bestStreak >= 30) badges.push("🏔 Unbreakable");

  if (input.bondScore >= 500) badges.push("💞 Bonded");
  if (input.bondScore >= 1500) badges.push("💎 Bond Elite");
  if (input.bondScore >= 3500) badges.push("🪽 Bond Mythic");

  const daysTogether = Math.max(
    0,
    Math.floor((Date.now() - new Date(input.since).getTime()) / 86_400_000)
  );
  if (daysTogether >= 30) badges.push("📅 Monthiversary");
  if (daysTogether >= 180) badges.push("🎉 Half-Year");
  if (daysTogether >= 365) badges.push("🏆 One-Year Bond");

  return badges;
}

export async function getRelationshipIdentity(userId: string): Promise<{
  title: string;
  badges: string[];
  hasPartner: boolean;
}> {
  const profile = await getFamilyProfile(userId);
  if (!profile.partner) {
    return { title: "Solo Drifter", badges: [], hasPartner: false };
  }
  const input: PartnerIdentityInput = {
    bondLevel: profile.partner.bondLevel ?? 1,
    totalDates: profile.partner.totalDates ?? 0,
    streak: profile.partner.streak ?? 0,
    bestStreak: profile.partner.bestStreak ?? 0,
    bondScore: profile.partner.bondScore ?? 0,
    since: new Date(profile.partner.since)
  };
  return {
    title: getPartnerTitle(input),
    badges: getPartnerBadges(input),
    hasPartner: true
  };
}

function periodStarts(now = new Date()) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(dayStart);
  const day = weekStart.getUTCDay();
  const back = day === 0 ? 6 : day - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - back);
  return { dayStart, weekStart };
}

export async function getFamilyQuestBoard(userId: string, guildId: string | null): Promise<{
  partner: FamilyQuest[];
  sibling: FamilyQuest[];
  hasPartner: boolean;
  hasSiblings: boolean;
}> {
  ensureSocialDelegates();
  const now = new Date();
  const { dayStart, weekStart } = periodStarts(now);
  const dayPeriodKey = dayKey(now);
  const weekPeriodKey = (() => {
    const d = new Date(weekStart);
    const y = d.getUTCFullYear();
    const jan1 = new Date(Date.UTC(y, 0, 1));
    const weekNo = Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + 1) / 7);
    return `${y}-W${String(weekNo).padStart(2, "0")}`;
  })();

  const [partner, siblingCountAll, acceptedSiblingToday, acceptedSiblingWeek, acceptedPartnerWeek, familyActionDay, familyActionWeek] =
    await Promise.all([
      activePartnerFor(userId),
      timedDb("socialRelationship.count(getFamilyQuestBoard.siblings)", () =>
        fdb.socialRelationship.count({
          where: {
            type: "SIBLING",
            status: "ACTIVE",
            OR: [{ userAId: userId }, { userBId: userId }]
          }
        })
      ),
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.siblingToday)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            actorUserId: userId,
            eventType: "ACCEPTED",
            createdAt: { gte: dayStart },
            relationship: { type: "SIBLING" }
          }
        })
      ),
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.siblingWeek)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            actorUserId: userId,
            eventType: "ACCEPTED",
            createdAt: { gte: weekStart },
            relationship: { type: "SIBLING" }
          }
        })
      ),
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.partnerWeek)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            actorUserId: userId,
            eventType: "ACCEPTED",
            createdAt: { gte: weekStart },
            relationship: { type: "PARTNER" }
          }
        })
      ),
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.actionsDay)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            actorUserId: userId,
            eventType: { in: ["DATE_COMPLETED", "ACCEPTED"] },
            createdAt: { gte: dayStart }
          }
        })
      ),
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.actionsWeek)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            actorUserId: userId,
            eventType: { in: ["DATE_COMPLETED", "ACCEPTED"] },
            createdAt: { gte: weekStart }
          }
        })
      )
    ]);

  let partnerDatesDay = 0;
  let partnerDatesWeek = 0;
  const claims = await timedDb("familyQuestClaim.findMany(getFamilyQuestBoard)", () =>
    fdb.familyQuestClaim.findMany({
      where: {
        userId,
        guildId,
        OR: [{ periodKey: dayPeriodKey }, { periodKey: weekPeriodKey }]
      }
    })
  );
  const claimSet = new Set<string>(claims.map((c: any) => `${c.questKey}:${c.periodKey}`));
  if (partner) {
    const counts = await Promise.all([
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.partnerDateDay)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            relationshipId: partner.id,
            actorUserId: userId,
            eventType: "DATE_COMPLETED",
            createdAt: { gte: dayStart }
          }
        })
      ),
      timedDb("socialRelationshipEvent.count(getFamilyQuestBoard.partnerDateWeek)", () =>
        fdb.socialRelationshipEvent.count({
          where: {
            relationshipId: partner.id,
            actorUserId: userId,
            eventType: "DATE_COMPLETED",
            createdAt: { gte: weekStart }
          }
        })
      )
    ]);
    partnerDatesDay = counts[0];
    partnerDatesWeek = counts[1];
  }

  const partnerQuests: FamilyQuest[] = [
    {
      key: "date_daily_1",
      type: "daily",
      periodKey: dayPeriodKey,
      title: "Go on 1 date with your partner",
      progress: partnerDatesDay,
      target: 1,
      rewardXp: 90,
      rewardCoins: 70,
      rewardBondXp: 40,
      completed: partnerDatesDay >= 1,
      claimed: claimSet.has(`date_daily_1:${dayPeriodKey}`)
    },
    {
      key: "date_daily_3",
      type: "daily",
      periodKey: dayPeriodKey,
      title: "Go on 3 dates with your partner",
      progress: partnerDatesDay,
      target: 3,
      rewardXp: 180,
      rewardCoins: 130,
      rewardBondXp: 90,
      completed: partnerDatesDay >= 3,
      claimed: claimSet.has(`date_daily_3:${dayPeriodKey}`)
    },
    {
      key: "date_weekly_8",
      type: "weekly",
      periodKey: weekPeriodKey,
      title: "Go on 8 dates this week",
      progress: partnerDatesWeek,
      target: 8,
      rewardXp: 260,
      rewardCoins: 220,
      rewardBondXp: 140,
      completed: partnerDatesWeek >= 8,
      claimed: claimSet.has(`date_weekly_8:${weekPeriodKey}`)
    },
    {
      key: "partner_accept_weekly_1",
      type: "weekly",
      periodKey: weekPeriodKey,
      title: "Start 1 new partner bond this week",
      progress: acceptedPartnerWeek,
      target: 1,
      rewardXp: 140,
      rewardCoins: 120,
      rewardBondXp: 80,
      completed: acceptedPartnerWeek >= 1,
      claimed: claimSet.has(`partner_accept_weekly_1:${weekPeriodKey}`)
    }
  ];

  const siblingQuests: FamilyQuest[] = [
    {
      key: "sibling_daily_1",
      type: "daily",
      periodKey: dayPeriodKey,
      title: "Make or accept 1 sibling bond today",
      progress: acceptedSiblingToday,
      target: 1,
      rewardXp: 70,
      rewardCoins: 60,
      rewardBondXp: 35,
      completed: acceptedSiblingToday >= 1,
      claimed: claimSet.has(`sibling_daily_1:${dayPeriodKey}`)
    },
    {
      key: "sibling_weekly_3",
      type: "weekly",
      periodKey: weekPeriodKey,
      title: "Make or accept 3 sibling bonds this week",
      progress: acceptedSiblingWeek,
      target: 3,
      rewardXp: 180,
      rewardCoins: 140,
      rewardBondXp: 90,
      completed: acceptedSiblingWeek >= 3,
      claimed: claimSet.has(`sibling_weekly_3:${weekPeriodKey}`)
    },
    {
      key: "actions_daily_3",
      type: "daily",
      periodKey: dayPeriodKey,
      title: "Complete 3 family interactions today",
      progress: familyActionDay,
      target: 3,
      rewardXp: 100,
      rewardCoins: 85,
      rewardBondXp: 45,
      completed: familyActionDay >= 3,
      claimed: claimSet.has(`actions_daily_3:${dayPeriodKey}`)
    },
    {
      key: "actions_weekly_12",
      type: "weekly",
      periodKey: weekPeriodKey,
      title: "Complete 12 family interactions this week",
      progress: familyActionWeek,
      target: 12,
      rewardXp: 240,
      rewardCoins: 200,
      rewardBondXp: 120,
      completed: familyActionWeek >= 12,
      claimed: claimSet.has(`actions_weekly_12:${weekPeriodKey}`)
    }
  ];

  return {
    partner: partnerQuests,
    sibling: siblingQuests,
    hasPartner: Boolean(partner),
    hasSiblings: siblingCountAll > 0
  };
}

export function buildFamilyQuestClaimComponents(controllerId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`family:questclaim:${controllerId}:daily`)
        .setLabel("Claim Daily")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`family:questclaim:${controllerId}:weekly`)
        .setLabel("Claim Weekly")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`family:questclaim:${controllerId}:all`)
        .setLabel("Claim All")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export async function claimFamilyQuestRewards(input: {
  userId: string;
  guildId: string | null;
  filter: "daily" | "weekly" | "all";
}) {
  ensureSocialDelegates();
  const board = await getFamilyQuestBoard(input.userId, input.guildId);
  const all = [...board.partner, ...board.sibling];
  const claimable = all.filter(
    (q) => q.completed && !q.claimed && (input.filter === "all" || q.type === input.filter)
  );
  if (claimable.length === 0) {
    return { claimed: [] as FamilyQuest[], totals: { xp: 0, coins: 0, bondXp: 0 } };
  }

  let totalXp = 0;
  let totalCoins = 0;
  let totalBondXp = 0;
  const accepted: FamilyQuest[] = [];
  for (const q of claimable) {
    try {
      await timedDb("familyQuestClaim.create(claimFamilyQuestRewards)", () =>
        fdb.familyQuestClaim.create({
          data: {
            userId: input.userId,
            guildId: input.guildId,
            questKey: q.key,
            periodKey: q.periodKey,
            questType: q.type,
            rewardXP: q.rewardXp,
            rewardCoins: q.rewardCoins,
            rewardBondXp: q.rewardBondXp
          }
        })
      );
      accepted.push(q);
      totalXp += q.rewardXp;
      totalCoins += q.rewardCoins;
      totalBondXp += q.rewardBondXp;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (!/unique|duplicate|constraint/i.test(msg)) throw error;
    }
  }

  if (accepted.length === 0) {
    return { claimed: [] as FamilyQuest[], totals: { xp: 0, coins: 0, bondXp: 0 } };
  }

  await timedDb("userProgress.upsert(claimFamilyQuestRewards)", () =>
    fdb.userProgress.upsert({
      where: { userId: input.userId },
      update: {
        guildId: input.guildId,
        xp: { increment: totalXp },
        coins: { increment: totalCoins }
      },
      create: {
        userId: input.userId,
        guildId: input.guildId,
        xp: totalXp,
        coins: totalCoins,
        level: 1,
        title: "Rookie"
      }
    })
  );
  await timedDb("transaction.create(claimFamilyQuestRewards)", () =>
    fdb.transaction.create({
      data: {
        userId: input.userId,
        guildId: input.guildId,
        amount: totalCoins,
        reason: "family-quest"
      }
    })
  );

  const partner = await activePartnerFor(input.userId);
  if (partner && partner.progress && totalBondXp > 0) {
    const next = computeBondLevel(partner.progress.bondXp + totalBondXp);
    await timedDb("socialRelationshipProgress.update(claimFamilyQuestRewards.partnerBond)", () =>
      fdb.socialRelationshipProgress.update({
        where: { relationshipId: partner.id },
        data: {
          bondXp: partner.progress.bondXp + totalBondXp,
          bondLevel: next.level,
          bondScore: { increment: Math.floor(totalBondXp / 2) }
        }
      })
    );
    invalidateFamilyProfileCache(input.userId, partner.userAId, partner.userBId);
  }

  return {
    claimed: accepted,
    totals: { xp: totalXp, coins: totalCoins, bondXp: totalBondXp }
  };
}

type FamilyAchievement = {
  key: string;
  title: string;
  progress: number;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  rewardBondXp: number;
  completed: boolean;
  claimed: boolean;
};

const FAMILY_ACHIEVEMENT_DEFS: Array<{
  key: string;
  title: string;
  metric: "dates" | "bestStreak" | "bondLevel" | "daysTogether" | "siblingCount" | "bondScore";
  target: number;
  rewardXp: number;
  rewardCoins: number;
  rewardBondXp: number;
}> = [
  { key: "ach_first_date", title: "Go on your first date", metric: "dates", target: 1, rewardXp: 120, rewardCoins: 100, rewardBondXp: 50 },
  { key: "ach_dates_25", title: "Go on 25 dates", metric: "dates", target: 25, rewardXp: 280, rewardCoins: 220, rewardBondXp: 120 },
  { key: "ach_dates_100", title: "Go on 100 dates", metric: "dates", target: 100, rewardXp: 700, rewardCoins: 650, rewardBondXp: 300 },
  { key: "ach_streak_10", title: "Reach 10 date streak", metric: "bestStreak", target: 10, rewardXp: 320, rewardCoins: 260, rewardBondXp: 140 },
  { key: "ach_streak_30", title: "Reach 30 date streak", metric: "bestStreak", target: 30, rewardXp: 900, rewardCoins: 800, rewardBondXp: 380 },
  { key: "ach_bond_10", title: "Reach Bond Level 10", metric: "bondLevel", target: 10, rewardXp: 500, rewardCoins: 420, rewardBondXp: 220 },
  { key: "ach_bond_20", title: "Reach Bond Level 20", metric: "bondLevel", target: 20, rewardXp: 1200, rewardCoins: 950, rewardBondXp: 520 },
  { key: "ach_days_30", title: "Stay together 30 days", metric: "daysTogether", target: 30, rewardXp: 260, rewardCoins: 210, rewardBondXp: 100 },
  { key: "ach_days_365", title: "Stay together 365 days", metric: "daysTogether", target: 365, rewardXp: 2200, rewardCoins: 1800, rewardBondXp: 900 },
  { key: "ach_siblings_3", title: "Have 3 siblings", metric: "siblingCount", target: 3, rewardXp: 220, rewardCoins: 190, rewardBondXp: 90 },
  { key: "ach_bond_score_1500", title: "Reach 1500 bond score", metric: "bondScore", target: 1500, rewardXp: 620, rewardCoins: 500, rewardBondXp: 260 }
];

function computeAchievementMetric(metric: string, profile: any) {
  const partner = profile.partner;
  const daysTogether = partner
    ? Math.max(0, Math.floor((Date.now() - new Date(partner.since).getTime()) / 86_400_000))
    : 0;
  switch (metric) {
    case "dates":
      return partner?.totalDates ?? 0;
    case "bestStreak":
      return partner?.bestStreak ?? 0;
    case "bondLevel":
      return partner?.bondLevel ?? 0;
    case "daysTogether":
      return daysTogether;
    case "siblingCount":
      return profile.siblingCount ?? 0;
    case "bondScore":
      return partner?.bondScore ?? 0;
    default:
      return 0;
  }
}

export async function getFamilyAchievements(userId: string, guildId: string | null): Promise<{
  achievements: FamilyAchievement[];
  unlocked: number;
  claimed: number;
  total: number;
}> {
  ensureSocialDelegates();
  const profile = await getFamilyProfile(userId);
  const claims = await timedDb("familyAchievementClaim.findMany(getFamilyAchievements)", () =>
    fdb.familyAchievementClaim.findMany({
      where: guildId ? { userId, guildId } : { userId }
    })
  );
  const claimSet = new Set<string>(claims.map((c: any) => c.achievementKey));
  const achievements: FamilyAchievement[] = FAMILY_ACHIEVEMENT_DEFS.map((a) => {
    const progress = computeAchievementMetric(a.metric, profile);
    const completed = progress >= a.target;
    const claimed = claimSet.has(a.key);
    return {
      key: a.key,
      title: a.title,
      progress,
      target: a.target,
      rewardXp: a.rewardXp,
      rewardCoins: a.rewardCoins,
      rewardBondXp: a.rewardBondXp,
      completed,
      claimed
    };
  });
  return {
    achievements,
    unlocked: achievements.filter((x) => x.completed).length,
    claimed: achievements.filter((x) => x.claimed).length,
    total: achievements.length
  };
}

export function buildFamilyAchievementClaimComponents(controllerId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`family:achclaim:${controllerId}:all`)
        .setLabel("Claim Achievements")
        .setStyle(ButtonStyle.Success)
    )
  ];
}

export async function claimFamilyAchievementRewards(input: {
  userId: string;
  guildId: string | null;
  key?: string;
}) {
  const board = await getFamilyAchievements(input.userId, input.guildId);
  const claimable = board.achievements.filter(
    (a) => a.completed && !a.claimed && (!input.key || a.key === input.key)
  );
  if (claimable.length === 0) {
    return { claimed: [] as FamilyAchievement[], totals: { xp: 0, coins: 0, bondXp: 0 } };
  }

  let totalXp = 0;
  let totalCoins = 0;
  let totalBondXp = 0;
  const accepted: FamilyAchievement[] = [];
  for (const a of claimable) {
    try {
      await timedDb("familyAchievementClaim.create(claimFamilyAchievementRewards)", () =>
        fdb.familyAchievementClaim.create({
          data: {
            userId: input.userId,
            guildId: input.guildId,
            achievementKey: a.key,
            rewardXP: a.rewardXp,
            rewardCoins: a.rewardCoins,
            rewardBondXp: a.rewardBondXp
          }
        })
      );
      accepted.push(a);
      totalXp += a.rewardXp;
      totalCoins += a.rewardCoins;
      totalBondXp += a.rewardBondXp;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (!/unique|duplicate|constraint/i.test(msg)) throw error;
    }
  }

  if (accepted.length === 0) {
    return { claimed: [] as FamilyAchievement[], totals: { xp: 0, coins: 0, bondXp: 0 } };
  }

  await timedDb("userProgress.upsert(claimFamilyAchievementRewards)", () =>
    fdb.userProgress.upsert({
      where: { userId: input.userId },
      update: {
        guildId: input.guildId,
        xp: { increment: totalXp },
        coins: { increment: totalCoins }
      },
      create: {
        userId: input.userId,
        guildId: input.guildId,
        xp: totalXp,
        coins: totalCoins,
        level: 1,
        title: "Rookie"
      }
    })
  );
  await timedDb("transaction.create(claimFamilyAchievementRewards)", () =>
    fdb.transaction.create({
      data: {
        userId: input.userId,
        guildId: input.guildId,
        amount: totalCoins,
        reason: "family-achievement"
      }
    })
  );

  const partner = await activePartnerFor(input.userId);
  if (partner && partner.progress && totalBondXp > 0) {
    const next = computeBondLevel(partner.progress.bondXp + totalBondXp);
    await timedDb("socialRelationshipProgress.update(claimFamilyAchievementRewards.partnerBond)", () =>
      fdb.socialRelationshipProgress.update({
        where: { relationshipId: partner.id },
        data: {
          bondXp: partner.progress.bondXp + totalBondXp,
          bondLevel: next.level,
          bondScore: { increment: Math.floor(totalBondXp / 2) }
        }
      })
    );
    invalidateFamilyProfileCache(input.userId, partner.userAId, partner.userBId);
  }

  return {
    claimed: accepted,
    totals: { xp: totalXp, coins: totalCoins, bondXp: totalBondXp }
  };
}

function proposalTypeLabel(type: "PARTNER" | "SIBLING") {
  return type === "PARTNER" ? "Marriage" : "Sibling";
}

export function buildProposalMessage(input: {
  proposalId: string;
  type: "PARTNER" | "SIBLING";
  from: User;
  to: User;
  expiresAt: Date;
}) {
  const embed = new EmbedBuilder()
    .setColor(0xf72585)
    .setDescription(
      input.type === "PARTNER"
        ? `Hey, ${input.to}, it would make ${input.from} really happy if you would marry them. What do you say?\n`
        : `Hey ${input.to},  I feel glad too say that ${input.from} wants to make you their sibling ! It would make them  really happy if you accept this proposal. What do you say?\n`
    )
    .setAuthor({
      name:
        input.type === "PARTNER"
          ? `${input.from.username} has proposed to ${input.to.username}! <3 `
          : `${input.from.username} wants to make ${input.to.username} their Sibling! <3 `
    })
    .setTimestamp(new Date())
    .setFooter({ text: "Team Tatsui ❤️" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`family:proposal:${input.proposalId}:accept`)
      .setLabel("Yes !!")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`family:proposal:${input.proposalId}:decline`)
      .setLabel("No ;-;")
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

function timeoutComponents() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("family:proposal:timeup")
        .setLabel("TIMEUP")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    )
  ];
}

function clearProposalTimeout(proposalId: string) {
  const timer = proposalTimeouts.get(proposalId);
  if (timer) {
    clearTimeout(timer);
    proposalTimeouts.delete(proposalId);
  }
}

async function processProposalTimeout(input: {
  client: Client;
  proposalId: string;
  channelId: string;
  messageId: string;
}) {
  try {
    const proposal = await fdb.socialProposal.findUnique({
      where: { id: input.proposalId }
    });
    if (!proposal || proposal.status !== "PENDING") return;
    if (new Date(proposal.expiresAt).getTime() > Date.now()) return;

    await fdb.socialProposal.update({
      where: { id: proposal.id },
      data: { status: "ENDED" }
    });

    const channel = await input.client.channels.fetch(input.channelId).catch(() => null);
    if (!channel || !("messages" in channel)) return;
    const msg = await channel.messages.fetch(input.messageId).catch(() => null);
    if (!msg) return;

    await msg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(
            `😠 || Sorry, <@${proposal.fromUserId}>, <@${proposal.toUserId}> didn't reply on time!! Maybe They are confused, lets give them some time!`
          )
          .setTimestamp(new Date())
          .setFooter({ text: "Team Tatsui ❤️" })
      ],
      components: timeoutComponents()
    });
  } catch (error) {
    logger.warn("Proposal timeout updater failed", error);
  } finally {
    clearProposalTimeout(input.proposalId);
  }
}

export function scheduleProposalTimeout(input: {
  client: Client;
  proposalId: string;
  channelId: string;
  messageId: string;
  expiresAt: Date;
}) {
  clearProposalTimeout(input.proposalId);
  const ms = Math.max(1000, new Date(input.expiresAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    void processProposalTimeout(input);
  }, ms);
  if (typeof timer.unref === "function") timer.unref();
  proposalTimeouts.set(input.proposalId, timer);
}

export async function handleFamilyProposalButton(interaction: ButtonInteraction) {
  const [prefix, kind, proposalId, action] = interaction.customId.split(":");
  if (prefix !== "family" || kind !== "proposal" || !proposalId || !action) return false;

  try {
    const result = await respondProposal({
      proposalId,
      actorUserId: interaction.user.id,
      accept: action === "accept"
    });
    clearProposalTimeout(proposalId);

    if (!result.accepted) {
      try {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(
                result.proposal.type === "PARTNER"
                  ? `💔 || <@${result.proposal.toUserId}>, you have decline a marriage request to <@${result.proposal.fromUserId}>`
                  : `💔 || <@${result.proposal.toUserId}> declined sibling request from <@${result.proposal.fromUserId}>`
              )
              .setTimestamp(new Date())
              .setFooter({ text: "Team Tatsui ❤️" })
          ],
          components: timeoutComponents()
        });
      } catch (error) {
        if (!isUnknownInteractionError(error)) throw error;
        logger.warn("Ignored stale proposal interaction update (10062).");
      }
      return true;
    }

    const flavor =
      result.proposal.type === "PARTNER"
        ? `💒 || <@${result.proposal.fromUserId}> and <@${result.proposal.toUserId}> are now married! Congrats!!`
        : `🏡 || <@${result.proposal.toUserId}>, Yay! <@${result.proposal.fromUserId}> is now your Sibling. Congrats!!`;

    try {
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(flavor)
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        components: timeoutComponents()
      });
    } catch (error) {
      if (!isUnknownInteractionError(error)) throw error;
      logger.warn("Ignored stale proposal interaction update (10062).");
    }
    return true;
  } catch (error) {
    clearProposalTimeout(proposalId);
    const msg = error instanceof Error ? error.message : "Could not process proposal.";
    const isExpiry = /expired|already resolved/i.test(msg);
    try {
      const payload = {
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(
              isExpiry
                ? `😠 || Sorry, <@${interaction.user.id}> didn't reply on time!! Maybe They are confused, lets give them some time!`
                : msg
            )
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      } as const;

      if (isExpiry && interaction.isButton()) {
        await interaction.update({
          embeds: payload.embeds,
          components: timeoutComponents()
        });
      } else {
        await interaction.reply(payload);
      }
    } catch (replyError) {
      if (!isUnknownInteractionError(replyError)) throw replyError;
      logger.info("Ignored stale proposal failure reply (10062).");
    }
    return true;
  }
}

export async function handleFamilyQuestButton(interaction: ButtonInteraction) {
  const [prefix, kind, controllerId, filterRaw] = interaction.customId.split(":");
  if (prefix !== "family" || kind !== "questclaim" || !controllerId || !filterRaw) return false;
  if (interaction.user.id !== controllerId) {
    try {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Only the command invoker can claim these family quests.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      if (!isUnknownInteractionError(error)) throw error;
    }
    return true;
  }

  const filter = filterRaw === "daily" || filterRaw === "weekly" || filterRaw === "all" ? filterRaw : "all";
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await claimFamilyQuestRewards({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      filter
    });
    if (result.claimed.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("No completed unclaimed family quests for this filter.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return true;
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x15ff00)
          .setTitle("Quest Rewards Claimed!")
          .setDescription(
            [
              `Claimed: **${result.claimed.length}** quest(s)`,
              `+${result.totals.xp} XP • +${result.totals.coins} coins • +${result.totals.bondXp} bond XP`,
              "",
              result.claimed.map((q) => `• ${q.title}`).join("\n")
            ].join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return true;
  } catch (error) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(error instanceof Error ? error.message : "Could not claim family quests.")
              .setFooter({ text: "Team Tatsui ❤️" })
          ]
        });
      } else {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(error instanceof Error ? error.message : "Could not claim family quests.")
              .setFooter({ text: "Team Tatsui ❤️" })
          ],
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      if (!isUnknownInteractionError(replyError)) throw replyError;
    }
    return true;
  }
}

export async function handleFamilyAchievementButton(interaction: ButtonInteraction) {
  const [prefix, kind, controllerId, keyRaw] = interaction.customId.split(":");
  if (prefix !== "family" || kind !== "achclaim" || !controllerId) return false;
  if (interaction.user.id !== controllerId) {
    try {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Only the command invoker can claim these achievements.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      if (!isUnknownInteractionError(error)) throw error;
    }
    return true;
  }

  const key = keyRaw && keyRaw !== "all" ? keyRaw : undefined;
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await claimFamilyAchievementRewards({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      key
    });
    if (result.claimed.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("No completed unclaimed family achievements found.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return true;
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x15ff00)
          .setTitle("Achievement Rewards Claimed!")
          .setDescription(
            [
              `Claimed: **${result.claimed.length}** achievement(s)`,
              `+${result.totals.xp} XP • +${result.totals.coins} coins • +${result.totals.bondXp} bond XP`,
              "",
              result.claimed.map((a) => `• ${a.title}`).join("\n")
            ].join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return true;
  } catch (error) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(error instanceof Error ? error.message : "Could not claim achievements.")
              .setFooter({ text: "Team Tatsui ❤️" })
          ]
        });
      } else {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(error instanceof Error ? error.message : "Could not claim achievements.")
              .setFooter({ text: "Team Tatsui ❤️" })
          ],
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      if (!isUnknownInteractionError(replyError)) throw replyError;
    }
    return true;
  }
}

export async function handleFamilySimulationPanelButton(interaction: ButtonInteraction) {
  const [prefix, kind, controllerId, action] = interaction.customId.split(":");
  if (prefix !== "family" || kind !== "simpanel" || !controllerId || !action) return false;

  if (interaction.user.id !== controllerId) {
    try {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Only the command invoker can control this simulation panel.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      if (!isUnknownInteractionError(error)) throw error;
    }
    return true;
  }

  try {
    if (action === "run") {
      const result = await awardFamilySimulationInteraction({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        username: interaction.user.username
      });
      await interaction.update({
        embeds: [buildFamilySimulationResultEmbed(result, interaction.user)],
        components: buildFamilySimulationPanelComponents(interaction.user.id)
      });
      return true;
    }

    const stats = await getFamilySimulationAnalytics(interaction.user.id);
    if (action === "stats") {
      await interaction.update({
        embeds: [buildFamilySimulationStatsEmbed(stats, interaction.user)],
        components: buildFamilySimulationPanelComponents(interaction.user.id)
      });
      return true;
    }
    if (action === "recent") {
      await interaction.update({
        embeds: [buildFamilySimulationRecentEmbed(stats, interaction.user)],
        components: buildFamilySimulationPanelComponents(interaction.user.id)
      });
      return true;
    }
    if (action === "milestones") {
      const board = await getFamilySimulationMilestoneBoard(interaction.user.id);
      await interaction.update({
        embeds: [buildFamilySimulationMilestonesEmbed(board, interaction.user)],
        components: buildFamilySimulationPanelComponents(interaction.user.id)
      });
      return true;
    }
    if (action === "ladder") {
      const ladder = await getFamilySimulationLadder({ userId: interaction.user.id, limit: 10 });
      await interaction.update({
        embeds: [buildFamilySimulationLadderEmbed(ladder, interaction.user)],
        components: buildFamilySimulationPanelComponents(interaction.user.id)
      });
      return true;
    }

    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Simulation panel update failed.";
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(msg)
              .setFooter({ text: "Team Tatsui ❤️" })
          ]
        });
      } else {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf72585)
              .setDescription(msg)
              .setFooter({ text: "Team Tatsui ❤️" })
          ],
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      if (!isUnknownInteractionError(replyError)) throw replyError;
    }
    return true;
  }
}

export function ensureFamilyEnabledOrThrow(settings: Awaited<ReturnType<typeof getFamilySettings>>) {
  if (!settings.familyEnabled) {
    throw new Error("Family system is disabled in this server.");
  }
}

export function ensureMarriageEnabledOrThrow(settings: Awaited<ReturnType<typeof getFamilySettings>>) {
  if (!settings.marriageEnabled) {
    throw new Error("Marriage commands are disabled in this server.");
  }
}

export function ensureSiblingsEnabledOrThrow(settings: Awaited<ReturnType<typeof getFamilySettings>>) {
  if (!settings.siblingsEnabled) {
    throw new Error("Sibling commands are disabled in this server.");
  }
}
