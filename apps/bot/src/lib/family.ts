import { db } from "@cocosui/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type User
} from "discord.js";
import { logger } from "./logger.js";
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

export async function getFamilySettings(guildId: string | null) {
  if (!guildId) return FAMILY_DEFAULTS;
  const guild = await fdb.guild.findUnique({ where: { id: guildId } });
  const settings = (guild?.settings as Record<string, unknown> | null) ?? {};
  return {
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
  const recent = await fdb.socialProposal.findFirst({
    where: {
      fromUserId: input.from.id,
      status: "PENDING",
      createdAt: { gt: new Date(now - PROPOSAL_COOLDOWN_MS) }
    }
  });
  if (recent) throw new Error("Slow down. Wait before sending another proposal.");

  await fdb.socialProposal.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "ENDED" }
  });

  const proposal = await fdb.socialProposal.create({
    data: {
      type: input.type,
      fromUserId: input.from.id,
      toUserId: input.to.id,
      guildId: input.guildId,
      status: "PENDING",
      expiresAt: new Date(now + PROPOSAL_TTL_MS)
    }
  });

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

  const baseXp = Math.floor((40 + Math.random() * 31) * rate);
  const baseCoins = Math.floor((55 + Math.random() * 46) * rate);
  const bondGain = Math.floor((30 + Math.random() * 21) * rate);
  const scoreGain = Math.floor((20 + Math.random() * 16) * rate);
  const rare = Math.random() < 0.12;
  const rareBonus = rare ? 35 : 0;

  const streakDelta = streakFromLastDate(progress.lastDateAt, now);
  const currentStreak =
    streakDelta.next === 0 ? progress.currentStreak : streakDelta.reset ? 1 : progress.currentStreak + 1;
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
      sharedCoins: { increment: baseCoins * 2 },
      lastDateAt: now
    }
  });

  await addRelationshipEvent(relationship.id, input.userId, "DATE_COMPLETED", {
    bondGain,
    scoreGain,
    coins: baseCoins,
    rareBonus
  });

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
      data: { xp: { increment: baseXp }, coins: { increment: baseCoins } }
    }),
    fdb.userProgress.update({
      where: { userId: partnerId },
      data: { xp: { increment: baseXp }, coins: { increment: baseCoins } }
    }),
    fdb.transaction.create({
      data: { userId: input.userId, guildId: input.guildId, amount: baseCoins, reason: "family-date" }
    }),
    fdb.transaction.create({
      data: { userId: partnerId, guildId: input.guildId, amount: baseCoins, reason: "family-date" }
    })
  ]);

  return {
    relationshipId: relationship.id,
    partnerId,
    partnerUsername: partnerUser?.username ?? "Unknown",
    scenario: DATE_SCENARIOS[Math.floor(Math.random() * DATE_SCENARIOS.length)] ?? DATE_SCENARIOS[0],
    rewards: {
      xp: baseXp,
      coins: baseCoins,
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

export async function getFamilyProfile(userId: string) {
  ensureSocialDelegates();
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

  return {
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
}

export async function getCoupleLeaderboard(limit = 10) {
  ensureSocialDelegates();
  const couples = await fdb.socialRelationship.findMany({
    where: { type: "PARTNER", status: "ACTIVE" },
    include: { progress: true }
  });

  const userIds = couples.flatMap((c: any) => [c.userAId, c.userBId]);
  const users = await fdb.discordUser.findMany({ where: { id: { in: userIds } } });
  const userMap = new Map(users.map((u: any) => [u.id, u.username]));

  return couples
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
}

export async function getTopFamilyLeaderboard(limit = 10) {
  ensureSocialDelegates();
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

  return rows.sort((a, b) => b.totalBondScore - a.totalBondScore).slice(0, limit);
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
        ephemeral: true
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
      logger.warn("Ignored stale proposal failure reply (10062).");
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
