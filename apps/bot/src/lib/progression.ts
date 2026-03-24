import { db } from "@cocosui/db";

const pdb = db as any;

const XP_COOLDOWN_MS = 12_000;
const XP_PER_MIN_CAP = 120;
const FIRST_COMMAND_BONUS = 25;

const SOCIAL_COMMANDS = new Set(["ship", "friendship", "shiprate", "poke", "afk"]);

const spamMemory = new Map<
  string,
  {
    lastCommand: string;
    lastAt: number;
    sameCount: number;
  }
>();

type QuestTemplate = {
  type: "daily" | "weekly";
  action: string;
  target: number;
  rewardXP: number;
  rewardCoins: number;
  title: string;
};

const QUEST_TEMPLATES: QuestTemplate[] = [
  { type: "daily", action: "any_command", target: 10, rewardXP: 120, rewardCoins: 80, title: "Use any command 10 times" },
  { type: "daily", action: "cat_command", target: 3, rewardXP: 70, rewardCoins: 60, title: "Use /cat 3 times" },
  { type: "daily", action: "rps_command", target: 5, rewardXP: 90, rewardCoins: 70, title: "Play /rps 5 times" },
  { type: "weekly", action: "xp_gain", target: 500, rewardXP: 200, rewardCoins: 150, title: "Gain 500 XP" },
  { type: "weekly", action: "weekly_commands", target: 40, rewardXP: 180, rewardCoins: 140, title: "Use 40 commands" },
  { type: "weekly", action: "social_interaction", target: 10, rewardXP: 150, rewardCoins: 120, title: "Use 10 social commands" }
];

export function xpRequiredForLevel(level: number) {
  return Math.max(100, Math.floor(100 * Math.pow(level, 1.5)));
}

export function titleForLevel(level: number) {
  if (level >= 50) return "Legend";
  if (level >= 30) return "Elite";
  if (level >= 15) return "Explorer";
  if (level >= 5) return "Beginner";
  return "Rookie";
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function computeLevel(totalXp: number) {
  let level = 1;
  let spent = 0;
  while (true) {
    const needed = xpRequiredForLevel(level);
    if (spent + needed > totalXp) break;
    spent += needed;
    level += 1;
    if (level > 1000) break;
  }
  const currentLevelXp = totalXp - spent;
  const nextLevelXp = xpRequiredForLevel(level);
  return { level, currentLevelXp, nextLevelXp };
}

async function ensureProgress(userId: string, guildId: string | null, username: string) {
  await pdb.discordUser.upsert({
    where: { id: userId },
    update: { username },
    create: { id: userId, username }
  });

  const progress = await pdb.userProgress.upsert({
    where: { userId },
    update: guildId ? { guildId } : {},
    create: { userId, guildId, title: "Rookie", level: 1, xp: 0, coins: 0 }
  });

  return progress;
}

async function getBoostMultipliers(userId: string) {
  const now = new Date();
  const active = await pdb.booster.findMany({
    where: { userId, expiresAt: { gt: now } }
  });

  let xpMultiplier = 1;
  let coinMultiplier = 1;
  for (const b of active) {
    if (b.type === "xp") xpMultiplier *= b.multiplier;
    if (b.type === "coin") coinMultiplier *= b.multiplier;
  }
  return { xpMultiplier, coinMultiplier, active };
}

function antiSpamMultiplier(userId: string, commandName: string, nowMs: number) {
  const key = `${userId}`;
  const prev = spamMemory.get(key);
  if (!prev) {
    spamMemory.set(key, { lastCommand: commandName, lastAt: nowMs, sameCount: 1 });
    return 1;
  }

  if (prev.lastCommand === commandName && nowMs - prev.lastAt < 60_000) {
    prev.sameCount += 1;
  } else {
    prev.sameCount = 1;
    prev.lastCommand = commandName;
  }
  prev.lastAt = nowMs;
  spamMemory.set(key, prev);

  if (prev.sameCount >= 5) return 0.35;
  if (prev.sameCount >= 3) return 0.6;
  return 1;
}

async function ensureQuests(userId: string, guildId: string | null) {
  const day = todayKey();
  const week = weekKey();

  for (const q of QUEST_TEMPLATES) {
    const periodKey = q.type === "daily" ? day : week;
    await pdb.userQuest.upsert({
      where: {
        userId_guildId_type_action_periodKey: {
          userId,
          guildId,
          type: q.type,
          action: q.action,
          periodKey
        }
      },
      update: {},
      create: {
        userId,
        guildId,
        type: q.type,
        action: q.action,
        target: q.target,
        rewardXP: q.rewardXP,
        rewardCoins: q.rewardCoins,
        periodKey
      }
    });
  }
}

async function applyQuestProgress(
  userId: string,
  guildId: string | null,
  commandName: string,
  xpGained: number
) {
  await ensureQuests(userId, guildId);

  const day = todayKey();
  const week = weekKey();
  const quests = await pdb.userQuest.findMany({
    where: {
      userId,
      guildId,
      OR: [{ periodKey: day }, { periodKey: week }]
    }
  });

  const increments = new Map<string, number>();
  increments.set("any_command", 1);
  increments.set("weekly_commands", 1);
  if (commandName === "cat") increments.set("cat_command", 1);
  if (commandName === "rps") increments.set("rps_command", 1);
  if (SOCIAL_COMMANDS.has(commandName)) increments.set("social_interaction", 1);
  if (xpGained > 0) increments.set("xp_gain", xpGained);

  let rewardXP = 0;
  let rewardCoins = 0;
  const completed: string[] = [];

  for (const quest of quests) {
    const inc = increments.get(quest.action);
    if (!inc || quest.claimed) continue;

    const nextProgress = Math.min(quest.target, quest.progress + inc);
    const isNowCompleted = nextProgress >= quest.target;

    await pdb.userQuest.update({
      where: { id: quest.id },
      data: {
        progress: nextProgress,
        completed: isNowCompleted || quest.completed,
        claimed: isNowCompleted ? true : quest.claimed
      }
    });

    if (isNowCompleted && !quest.claimed) {
      rewardXP += quest.rewardXP;
      rewardCoins += quest.rewardCoins;
      const template = QUEST_TEMPLATES.find((x) => x.action === quest.action && x.type === quest.type);
      if (template) completed.push(template.title);
    }
  }

  return { rewardXP, rewardCoins, completed };
}

export async function grantCommandProgress(input: {
  userId: string;
  guildId: string | null;
  username: string;
  commandName: string;
}) {
  const now = new Date();
  const nowMs = now.getTime();
  const progress = await ensureProgress(input.userId, input.guildId, input.username);

  const minuteBucket = new Date(now);
  minuteBucket.setSeconds(0, 0);
  const sameMinute =
    progress.xpMinuteBucket && new Date(progress.xpMinuteBucket).getTime() === minuteBucket.getTime();

  if (progress.lastXpAt && nowMs - new Date(progress.lastXpAt).getTime() < XP_COOLDOWN_MS) {
    return { gainedXp: 0, gainedCoins: 0, levelUp: null as null | { from: number; to: number; title: string }, completedQuests: [] as string[] };
  }

  if (sameMinute && progress.xpMinuteGained >= XP_PER_MIN_CAP) {
    return { gainedXp: 0, gainedCoins: 0, levelUp: null as null | { from: number; to: number; title: string }, completedQuests: [] as string[] };
  }

  const spamMul = antiSpamMultiplier(input.userId, input.commandName, nowMs);
  const { xpMultiplier, coinMultiplier } = await getBoostMultipliers(input.userId);

  let baseXp = Math.floor(5 + Math.random() * 11);
  let baseCoins = Math.floor(2 + Math.random() * 4);

  if (progress.firstCommandDate !== todayKey(now)) {
    baseXp += FIRST_COMMAND_BONUS;
  }

  const gainedXp = Math.max(1, Math.floor(baseXp * spamMul * xpMultiplier));
  const gainedCoins = Math.max(1, Math.floor(baseCoins * coinMultiplier));

  const questRewards = await applyQuestProgress(input.userId, input.guildId, input.commandName, gainedXp);
  const totalXpGain = gainedXp + questRewards.rewardXP;
  const totalCoinGain = gainedCoins + questRewards.rewardCoins;

  const before = computeLevel(progress.xp);
  const afterTotalXp = progress.xp + totalXpGain;
  const after = computeLevel(afterTotalXp);
  const newTitle = titleForLevel(after.level);

  await pdb.userProgress.update({
    where: { userId: input.userId },
    data: {
      guildId: input.guildId,
      xp: { increment: totalXpGain },
      coins: { increment: totalCoinGain },
      level: after.level,
      title: newTitle,
      firstCommandDate: todayKey(now),
      lastXpAt: now,
      xpMinuteBucket: minuteBucket,
      xpMinuteGained: sameMinute ? { increment: gainedXp } : gainedXp
    }
  });

  await pdb.transaction.create({
    data: {
      userId: input.userId,
      guildId: input.guildId,
      amount: totalCoinGain,
      reason: questRewards.rewardCoins > 0 ? "command+quest" : "command"
    }
  });

  return {
    gainedXp: totalXpGain,
    gainedCoins: totalCoinGain,
    levelUp: after.level > before.level ? { from: before.level, to: after.level, title: newTitle } : null,
    completedQuests: questRewards.completed
  };
}

export async function claimDaily(input: { userId: string; guildId: string | null; username: string }) {
  const progress = await ensureProgress(input.userId, input.guildId, input.username);
  const today = todayKey();

  if (progress.lastDailyClaimDate === today) {
    return { claimed: false, streak: progress.dailyStreak, xp: 0, coins: 0 };
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = todayKey(yesterday);
  const streak = progress.lastDailyClaimDate === yesterdayKey ? progress.dailyStreak + 1 : 1;

  const xp = 40 + Math.floor(Math.random() * 31);
  const coins = 120 + Math.floor(Math.random() * 101) + streak * 10;
  const after = computeLevel(progress.xp + xp);

  await pdb.userProgress.update({
    where: { userId: input.userId },
    data: {
      xp: { increment: xp },
      coins: { increment: coins },
      level: after.level,
      title: titleForLevel(after.level),
      dailyStreak: streak,
      lastDailyClaimDate: today
    }
  });

  await pdb.transaction.create({
    data: {
      userId: input.userId,
      guildId: input.guildId,
      amount: coins,
      reason: "daily"
    }
  });

  return { claimed: true, streak, xp, coins };
}

export async function getProfile(userId: string, guildId: string | null, username: string) {
  const progress = await ensureProgress(userId, guildId, username);
  const level = computeLevel(progress.xp);
  const boosts = await getBoostMultipliers(userId);
  return {
    ...progress,
    levelComputed: level.level,
    levelProgress: level.currentLevelXp,
    levelRequired: level.nextLevelXp,
    xpMultiplier: boosts.xpMultiplier,
    coinMultiplier: boosts.coinMultiplier,
    activeBoosts: boosts.active
  };
}

export async function getQuestBoard(userId: string, guildId: string | null, username: string) {
  await ensureProgress(userId, guildId, username);
  await ensureQuests(userId, guildId);

  const day = todayKey();
  const week = weekKey();
  const quests = await pdb.userQuest.findMany({
    where: {
      userId,
      guildId,
      OR: [{ periodKey: day }, { periodKey: week }]
    },
    orderBy: [{ type: "asc" }, { action: "asc" }]
  });

  return quests.map((q: any) => {
    const t = QUEST_TEMPLATES.find((x) => x.action === q.action && x.type === q.type);
    return {
      ...q,
      title: t?.title ?? q.action
    };
  });
}

export async function getLeaderboard(guildId: string, limit = 10) {
  const rows = await pdb.userProgress.findMany({
    where: { guildId },
    orderBy: [{ level: "desc" }, { xp: "desc" }],
    take: limit
  });
  return rows;
}

