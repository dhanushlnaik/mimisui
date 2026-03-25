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

const fdb = db as any;

const PROPOSAL_TTL_MS = 5 * 60 * 1000;
const PROPOSAL_COOLDOWN_MS = 45 * 1000;
const DATE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const FAMILY_DEFAULTS = {
  familyEnabled: true,
  marriageEnabled: true,
  siblingsEnabled: true,
  publicFamilyAnnouncements: true,
  relationshipRewardRate: 1
};

const DATE_SCENARIOS = [
  "You both watched a dreamy sunset together.",
  "A late-night food date turned into endless laughter.",
  "You took matching selfies and spammed the server with cuteness.",
  "A cozy game-night date went unexpectedly perfect.",
  "You both went stargazing and made future plans."
];
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
  eventType: "PROPOSED" | "ACCEPTED" | "REJECTED" | "DIVORCED" | "DATE_COMPLETED" | "STREAK_UPDATED" | "QUEST_COMPLETED" | "ANNIVERSARY_CLAIMED",
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

  const baseXp = Math.floor((40 + Math.random() * 31) * rate);
  const baseCoins = Math.floor((55 + Math.random() * 46) * rate);
  const bondGainRaw = Math.floor((30 + Math.random() * 21) * rate);
  const scoreGain = Math.floor((20 + Math.random() * 16) * rate);
  const rare = Math.random() < 0.12;
  const rareBonus = rare ? 35 : 0;
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
    scenario: DATE_SCENARIOS[Math.floor(Math.random() * DATE_SCENARIOS.length)] ?? DATE_SCENARIOS[0],
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
          bestStreak: partner.progress?.bestStreak ?? 0
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
