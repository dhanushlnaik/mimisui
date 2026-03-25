import { db } from "@cocosui/db";
import { DEFAULT_GUILD_SETTINGS } from "@cocosui/config";
import { listManagedGuildsForAuthUser } from "@/lib/guilds";

type LadderTier = "UNRANKED" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | "MYTHIC";

const FAMILY_DEFAULTS = {
  familyEnabled: true,
  marriageEnabled: true,
  siblingsEnabled: true,
  publicFamilyAnnouncements: true,
  relationshipRewardRate: 1
};

export const WEB_GUILD_SETTINGS_DEFAULTS = {
  ...DEFAULT_GUILD_SETTINGS,
  ...FAMILY_DEFAULTS
};

const SEASON_REWARDS: Record<Exclude<LadderTier, "UNRANKED" | "BRONZE" | "SILVER">, { xp: number; coins: number; bondXp: number }> = {
  GOLD: { xp: 160, coins: 220, bondXp: 45 },
  PLATINUM: { xp: 300, coins: 420, bondXp: 90 },
  DIAMOND: { xp: 560, coins: 760, bondXp: 170 },
  MYTHIC: { xp: 950, coins: 1300, bondXp: 300 }
};

const ACHIEVEMENT_DEFS: Array<{
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

function weekPeriodKeyFromDate(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
}

function previousWeekKeyFromDate(date: Date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 7);
  return weekPeriodKeyFromDate(d);
}

function ladderTierFromPoints(points: number): LadderTier {
  if (points >= 780) return "MYTHIC";
  if (points >= 520) return "DIAMOND";
  if (points >= 320) return "PLATINUM";
  if (points >= 180) return "GOLD";
  if (points >= 80) return "SILVER";
  if (points >= 1) return "BRONZE";
  return "UNRANKED";
}

function computeBondLevel(xp: number) {
  let level = 1;
  while (xp >= Math.floor(120 * Math.pow(level + 1, 1.4))) {
    level += 1;
  }
  return { level };
}

async function getDiscordUserIdForAuthUser(authUserId: string) {
  const account = await db.account.findFirst({
    where: { userId: authUserId, providerId: "discord" },
    orderBy: { updatedAt: "desc" }
  });
  return account?.accountId ?? null;
}

async function assertGuildManager(authUserId: string, guildId: string) {
  const managed = await listManagedGuildsForAuthUser(authUserId);
  const ok = managed.some((g: { id: string }) => g.id === guildId);
  if (!ok) {
    throw new Error("You do not manage this guild.");
  }
  return managed.find((g: { id: string }) => g.id === guildId) ?? null;
}

function readRewardRate(settings: unknown) {
  const merged = {
    ...WEB_GUILD_SETTINGS_DEFAULTS,
    ...(settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {})
  } as Record<string, unknown>;
  const v = Number(merged.relationshipRewardRate ?? 1);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return v;
}

async function activePartnerFor(userId: string) {
  return db.socialRelationship.findFirst({
    where: {
      type: "PARTNER",
      status: "ACTIVE",
      OR: [{ userAId: userId }, { userBId: userId }]
    },
    include: { progress: true, leftUser: true, rightUser: true }
  });
}

export async function getGuildFamilyDashboard(authUserId: string, guildId: string) {
  await assertGuildManager(authUserId, guildId);
  const viewerDiscordId = await getDiscordUserIdForAuthUser(authUserId);
  const now = new Date();
  const seasonKey = weekPeriodKeyFromDate(now);

  const guild = await db.guild.findUnique({ where: { id: guildId } });
  const mergedSettings = {
    ...WEB_GUILD_SETTINGS_DEFAULTS,
    ...((guild?.settings as Record<string, unknown> | null) ?? {})
  };
  const rewardRate = readRewardRate(guild?.settings);

  const [
    activeCouples,
    siblings,
    logs,
    flags,
    seasonClaims,
    recentEvents
  ] = await Promise.all([
    db.socialRelationship.findMany({
      where: { type: "PARTNER", status: "ACTIVE" },
      include: { progress: true, leftUser: true, rightUser: true },
      take: 1000
    }),
    db.socialRelationship.count({ where: { type: "SIBLING", status: "ACTIVE" } }),
    db.familyModerationLog.findMany({ where: { guildId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.familyPenaltyFlag.findMany({ where: { guildId, active: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.familySeasonClaim.findMany({ where: { guildId }, orderBy: { claimedAt: "desc" }, take: 20 }),
    db.socialRelationshipEvent.findMany({
      where: { eventType: { in: ["SIMULATION_COMPLETED", "DUEL_COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const sortedByBond = [...activeCouples].sort(
    (a, b) => (b.progress?.bondScore ?? 0) - (a.progress?.bondScore ?? 0)
      || (b.progress?.totalDates ?? 0) - (a.progress?.totalDates ?? 0)
      || (b.progress?.bestStreak ?? 0) - (a.progress?.bestStreak ?? 0)
  );

  const ladder = [...activeCouples]
    .map((r) => {
      const fresh = (r.progress?.simSeasonKey ?? seasonKey) === seasonKey;
      const points = fresh ? r.progress?.simSeasonPoints ?? 0 : 0;
      const tier = fresh ? (r.progress?.simSeasonTier as LadderTier | null) ?? "UNRANKED" : "UNRANKED";
      return {
        id: r.id,
        userAId: r.userAId,
        userBId: r.userBId,
        leftName: r.leftUser?.username ?? r.userAId,
        rightName: r.rightUser?.username ?? r.userBId,
        points,
        tier,
        bestWinStreak: r.progress?.simBestWinStreak ?? 0
      };
    })
    .sort((a, b) => b.points - a.points || b.bestWinStreak - a.bestWinStreak)
    .slice(0, 20);

  let viewer = null as null | {
    discordId: string;
    partnerName: string | null;
    partnerSince: Date | null;
    siblingCount: number;
    bondLevel: number;
    bondScore: number;
    totalDates: number;
  };

  if (viewerDiscordId) {
    const [partner, siblingCount] = await Promise.all([
      activePartnerFor(viewerDiscordId),
      db.socialRelationship.count({
        where: {
          type: "SIBLING",
          status: "ACTIVE",
          OR: [{ userAId: viewerDiscordId }, { userBId: viewerDiscordId }]
        }
      })
    ]);

    if (partner) {
      const partnerId = partner.userAId === viewerDiscordId ? partner.userBId : partner.userAId;
      const partnerUser = partner.userAId === viewerDiscordId ? partner.rightUser : partner.leftUser;
      viewer = {
        discordId: viewerDiscordId,
        partnerName: partnerUser?.username ?? partnerId,
        partnerSince: partner.startedAt,
        siblingCount,
        bondLevel: partner.progress?.bondLevel ?? 1,
        bondScore: partner.progress?.bondScore ?? 0,
        totalDates: partner.progress?.totalDates ?? 0
      };
    } else {
      viewer = {
        discordId: viewerDiscordId,
        partnerName: null,
        partnerSince: null,
        siblingCount,
        bondLevel: 1,
        bondScore: 0,
        totalDates: 0
      };
    }
  }

  return {
    guild,
    settings: mergedSettings,
    seasonKey,
    rewardRate,
    summary: {
      activeCouples: activeCouples.length,
      activeSiblings: siblings,
      activePenaltyFlags: flags.length,
      seasonClaims: seasonClaims.length
    },
    topCouples: sortedByBond.slice(0, 15).map((r) => ({
      id: r.id,
      userAId: r.userAId,
      userBId: r.userBId,
      leftName: r.leftUser?.username ?? r.userAId,
      rightName: r.rightUser?.username ?? r.userBId,
      bondLevel: r.progress?.bondLevel ?? 1,
      bondScore: r.progress?.bondScore ?? 0,
      totalDates: r.progress?.totalDates ?? 0,
      bestStreak: r.progress?.bestStreak ?? 0
    })),
    ladder,
    logs,
    flags,
    seasonClaims,
    recentEvents,
    viewer
  };
}

export async function runGuildFamilyAdminAction(input: {
  authUserId: string;
  guildId: string;
  action:
    | "season_start"
    | "season_end"
    | "ladder_reset"
    | "ladder_recompute"
    | "penalty_clear"
    | "season_claim"
    | "achievement_claim";
  seasonKey?: string;
  reason?: string;
  note?: string;
  achievementKey?: string;
}) {
  await assertGuildManager(input.authUserId, input.guildId);
  const actorDiscordId = await getDiscordUserIdForAuthUser(input.authUserId);
  const seasonKey = input.seasonKey?.trim() || (input.action === "season_end" ? previousWeekKeyFromDate(new Date()) : weekPeriodKeyFromDate(new Date()));

  if (["season_start", "season_end", "ladder_reset", "ladder_recompute", "penalty_clear"].includes(input.action) && !actorDiscordId) {
    throw new Error("Your account is not linked to Discord.");
  }

  const scopeWhere = {
    relationship: {
      type: "PARTNER" as const,
      status: "ACTIVE" as const,
      guildOriginId: input.guildId
    }
  };

  if (input.action === "season_start") {
    const res = await db.socialRelationshipProgress.updateMany({
      where: scopeWhere,
      data: {
        simSeasonKey: seasonKey,
        simSeasonPoints: 0,
        simSeasonTier: "UNRANKED",
        simSeasonRewardMask: 0,
        simWinStreak: 0
      }
    });
    await db.familyModerationLog.create({
      data: {
        guildId: input.guildId,
        userId: actorDiscordId,
        action: "WEB_ADMIN_SEASON_START",
        severity: "INFO",
        details: { seasonKey, touched: res.count }
      }
    });
    return { ok: true, touched: res.count, seasonKey };
  }

  if (input.action === "season_end") {
    const res = await db.socialRelationshipProgress.updateMany({
      where: scopeWhere,
      data: { simSeasonKey: seasonKey }
    });
    await db.familyModerationLog.create({
      data: {
        guildId: input.guildId,
        userId: actorDiscordId,
        action: "WEB_ADMIN_SEASON_END",
        severity: "INFO",
        details: { seasonKey, touched: res.count }
      }
    });
    return { ok: true, touched: res.count, seasonKey };
  }

  if (input.action === "ladder_reset") {
    const res = await db.socialRelationshipProgress.updateMany({
      where: scopeWhere,
      data: {
        simSeasonKey: seasonKey,
        simSeasonPoints: 0,
        simSeasonTier: "UNRANKED",
        simSeasonRewardMask: 0,
        simWinStreak: 0,
        simBestWinStreak: 0
      }
    });
    await db.familyModerationLog.create({
      data: {
        guildId: input.guildId,
        userId: actorDiscordId,
        action: "WEB_ADMIN_LADDER_RESET",
        severity: "WARNING",
        details: { seasonKey, touched: res.count }
      }
    });
    return { ok: true, touched: res.count, seasonKey };
  }

  if (input.action === "ladder_recompute") {
    const rows = await db.socialRelationshipProgress.findMany({
      where: { ...scopeWhere, simSeasonKey: seasonKey },
      select: { relationshipId: true, simSeasonPoints: true }
    });
    let touched = 0;
    for (const row of rows) {
      await db.socialRelationshipProgress.update({
        where: { relationshipId: row.relationshipId },
        data: { simSeasonTier: ladderTierFromPoints(row.simSeasonPoints ?? 0) }
      });
      touched += 1;
    }
    await db.familyModerationLog.create({
      data: {
        guildId: input.guildId,
        userId: actorDiscordId,
        action: "WEB_ADMIN_LADDER_RECOMPUTE",
        severity: "INFO",
        details: { seasonKey, touched }
      }
    });
    return { ok: true, touched, seasonKey };
  }

  if (input.action === "penalty_clear") {
    const reason = (input.reason ?? "Manual web admin clear").trim();
    const note = (input.note ?? "").trim();
    const activeFlags = await db.familyPenaltyFlag.findMany({
      where: { guildId: input.guildId, active: true },
      select: { id: true }
    });
    const ids = activeFlags.map((x: { id: string }) => x.id);
    let touched = 0;
    if (ids.length > 0) {
      const res = await db.familyPenaltyFlag.updateMany({
        where: { id: { in: ids } },
        data: { active: false, resolvedAt: new Date() }
      });
      touched = res.count;
    }
    await db.familyModerationLog.create({
      data: {
        guildId: input.guildId,
        userId: actorDiscordId,
        action: "WEB_ADMIN_PENALTY_CLEAR",
        severity: "WARNING",
        details: { reason, note, touched }
      }
    });
    return { ok: true, touched, reason };
  }

  const viewerDiscordId = await getDiscordUserIdForAuthUser(input.authUserId);
  if (!viewerDiscordId) {
    throw new Error("Link your Discord account first.");
  }

  if (input.action === "season_claim") {
    const rel = await activePartnerFor(viewerDiscordId);
    if (!rel || !rel.progress) throw new Error("You need an active partner to claim season rewards.");

    const activeSeasonKey = weekPeriodKeyFromDate(new Date());
    const claimSeasonKey = rel.progress.simSeasonKey;
    if (!claimSeasonKey) throw new Error("No previous season data to claim yet.");
    if (claimSeasonKey === activeSeasonKey) throw new Error("Season is still active. Claim after rollover.");

    const tier = ((rel.progress.simSeasonTier as LadderTier | null) ?? "UNRANKED");
    if (!(tier in SEASON_REWARDS)) throw new Error(`No claim reward for tier ${tier}. Reach GOLD+.`);

    const exists = await db.familySeasonClaim.findUnique({
      where: {
        userId_seasonKey_relationshipId: {
          userId: viewerDiscordId,
          seasonKey: claimSeasonKey,
          relationshipId: rel.id
        }
      }
    });
    if (exists) throw new Error(`Season ${claimSeasonKey} already claimed.`);

    const guild = await db.guild.findUnique({ where: { id: input.guildId } });
    const rewardRate = readRewardRate(guild?.settings);
    const reward = SEASON_REWARDS[tier as Exclude<LadderTier, "UNRANKED" | "BRONZE" | "SILVER">];
    const rewardXp = Math.floor(reward.xp * rewardRate);
    const rewardCoins = Math.floor(reward.coins * rewardRate);
    const rewardBondXp = Math.floor(reward.bondXp * rewardRate);
    const nextBond = computeBondLevel((rel.progress.bondXp ?? 0) + rewardBondXp);

    const ladderRows = await db.socialRelationshipProgress.findMany({
      where: { simSeasonKey: claimSeasonKey },
      select: { relationshipId: true, simSeasonPoints: true }
    });
    const selfRank =
      [...ladderRows]
        .sort((a, b) => (b.simSeasonPoints ?? 0) - (a.simSeasonPoints ?? 0))
        .findIndex((x) => x.relationshipId === rel.id) + 1;

    await Promise.all([
      db.familySeasonClaim.create({
        data: {
          userId: viewerDiscordId,
          guildId: input.guildId,
          seasonKey: claimSeasonKey,
          relationshipId: rel.id,
          tier,
          rank: selfRank > 0 ? selfRank : null,
          rewardXP: rewardXp,
          rewardCoins: rewardCoins,
          rewardBondXp: rewardBondXp
        }
      }),
      db.userProgress.upsert({
        where: { userId: viewerDiscordId },
        update: { guildId: input.guildId, xp: { increment: rewardXp }, coins: { increment: rewardCoins } },
        create: { userId: viewerDiscordId, guildId: input.guildId, level: 1, title: "Rookie", xp: rewardXp, coins: rewardCoins }
      }),
      db.socialRelationshipProgress.update({
        where: { relationshipId: rel.id },
        data: {
          bondXp: (rel.progress.bondXp ?? 0) + rewardBondXp,
          bondLevel: nextBond.level,
          bondScore: { increment: Math.floor(rewardBondXp / 2) }
        }
      }),
      db.transaction.create({
        data: { userId: viewerDiscordId, guildId: input.guildId, amount: rewardCoins, reason: "family-sim-season-claim-web" }
      })
    ]);

    return { ok: true, seasonKey: claimSeasonKey, tier, rank: selfRank > 0 ? selfRank : null, rewards: { xp: rewardXp, coins: rewardCoins, bondXp: rewardBondXp } };
  }

  if (input.action === "achievement_claim") {
    const [profile, claims] = await Promise.all([
      (async () => {
        const partner = await activePartnerFor(viewerDiscordId);
        const siblingCount = await db.socialRelationship.count({
          where: { type: "SIBLING", status: "ACTIVE", OR: [{ userAId: viewerDiscordId }, { userBId: viewerDiscordId }] }
        });
        return { partner, siblingCount };
      })(),
      db.familyAchievementClaim.findMany({ where: { userId: viewerDiscordId, guildId: input.guildId } })
    ]);

    const claimSet = new Set(claims.map((c: { achievementKey: string }) => c.achievementKey));
    const partner = profile.partner;
    const daysTogether = partner?.startedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(partner.startedAt).getTime()) / 86_400_000))
      : 0;

    const metric = (m: string) => {
      switch (m) {
        case "dates": return partner?.progress?.totalDates ?? 0;
        case "bestStreak": return partner?.progress?.bestStreak ?? 0;
        case "bondLevel": return partner?.progress?.bondLevel ?? 0;
        case "daysTogether": return daysTogether;
        case "siblingCount": return profile.siblingCount;
        case "bondScore": return partner?.progress?.bondScore ?? 0;
        default: return 0;
      }
    };

    const claimable = ACHIEVEMENT_DEFS.filter((a) => metric(a.metric) >= a.target && !claimSet.has(a.key) && (!input.achievementKey || input.achievementKey === a.key));
    if (claimable.length === 0) throw new Error("No completed unclaimed family achievements found.");

    let xp = 0;
    let coins = 0;
    let bondXp = 0;
    for (const a of claimable) {
      await db.familyAchievementClaim.create({
        data: {
          userId: viewerDiscordId,
          guildId: input.guildId,
          achievementKey: a.key,
          rewardXP: a.rewardXp,
          rewardCoins: a.rewardCoins,
          rewardBondXp: a.rewardBondXp
        }
      });
      xp += a.rewardXp;
      coins += a.rewardCoins;
      bondXp += a.rewardBondXp;
    }

    await Promise.all([
      db.userProgress.upsert({
        where: { userId: viewerDiscordId },
        update: { guildId: input.guildId, xp: { increment: xp }, coins: { increment: coins } },
        create: { userId: viewerDiscordId, guildId: input.guildId, level: 1, title: "Rookie", xp, coins }
      }),
      db.transaction.create({
        data: { userId: viewerDiscordId, guildId: input.guildId, amount: coins, reason: "family-achievement-web" }
      })
    ]);

    if (partner?.progress && bondXp > 0) {
      const next = computeBondLevel((partner.progress.bondXp ?? 0) + bondXp);
      await db.socialRelationshipProgress.update({
        where: { relationshipId: partner.id },
        data: {
          bondXp: (partner.progress.bondXp ?? 0) + bondXp,
          bondLevel: next.level,
          bondScore: { increment: Math.floor(bondXp / 2) }
        }
      });
    }

    return { ok: true, claimed: claimable.map((x: { key: string }) => x.key), rewards: { xp, coins, bondXp } };
  }

  throw new Error("Unsupported action.");
}
