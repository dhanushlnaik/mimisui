import { MODULE_KEYS } from "@cocosui/config";
import { db } from "@cocosui/db";
import {
  AttachmentBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type Message,
  type User
} from "discord.js";
import {
  commandCatalog,
  findCommandDoc,
  helpCategoryLabels,
  prefixAliasMap,
  type HelpCategory
} from "./command-catalog.js";
import { buildHelpMessage } from "./help-view.js";
import { getCurrentFamilyEvent } from "./family-events.js";
import {
  awardPartnerActionBond,
  awardDateInteraction,
  awardFamilySimulationInteraction,
  awardFamilySimulationDuel,
  adminForceEndFamilySimulationSeason,
  adminForceStartFamilySimulationSeason,
  adminRecomputeFamilySimulationLadder,
  adminResetFamilySimulationLadder,
  adminClearFamilyPenaltyFlags,
  buildFamilyModerationAuditEmbed,
  buildFamilySimulationAdminResultEmbed,
  buildFamilySimulationAdminPanelComponents,
  buildFamilySimulationAdminPanelEmbed,
  buildFamilySimulationDuelHistoryEmbed,
  buildFamilySimulationDuelResultEmbed,
  buildFamilySimulationLadderEmbed,
  buildFamilySimulationSeasonClaimEmbed,
  buildFamilySimulationSeasonOverviewEmbed,
  buildFamilySimulationMilestonesEmbed,
  buildFamilySimulationPanelComponents,
  buildFamilySimulationRecentEmbed,
  buildFamilySimulationResultEmbed,
  buildFamilySimulationStatsEmbed,
  buildFamilyAchievementClaimComponents,
  buildProposalMessage,
  claimAnniversaryReward,
  claimFamilyAchievementRewards,
  createProposal,
  endPartnerRelationship,
  ensureFamilyEnabledOrThrow,
  ensureMarriageEnabledOrThrow,
  ensureSiblingsEnabledOrThrow,
  getBondStatus,
  getCoupleLeaderboard,
  getFamilyProfile,
  getFamilyQuestBoard,
  getFamilyAchievements,
  getFamilySimulationAnalytics,
  getFamilySimulationDuelHistory,
  getFamilyModerationAudit,
  getFamilySimulationLadder,
  getFamilySimulationSeasonOverview,
  claimFamilySimulationSeasonRewards,
  getFamilySimulationMilestoneBoard,
  getRelationshipIdentity,
  getFamilySettings,
  buildFamilyQuestClaimComponents,
  scheduleProposalTimeout,
  getTopFamilyLeaderboard,
  removeSibling
} from "./family.js";
import {
  buildCoupleLeaderboardEmbed,
  buildFamilyLeaderboardEmbed,
  buildFamilyPanelPayload,
  buildMarriageStatusEmbed
} from "./family-ui.js";
import {
  eightBallAnswer,
  gayScan,
  getMommaJoke,
  getTodQuestion,
  shipResult,
  textToOwo
} from "./fun-utils.js";
import { ensureGuild, getGuildPrefix, setGuildPrefix } from "./guild-config.js";
import { overlayTypes } from "../commands/overlays.js";
import { getLeaderboard, getProfile, claimDaily, getQuestBoard } from "./progression.js";
import {
  avatarSplitFromUrls,
  buildSimpCardFromAvatar,
  buildUk07Card,
  petPetFromAvatarUrl
} from "./rich-media.js";
import { getAvatarUrl } from "./user-avatar.js";
import { callWeebyCustom, callWeebyGenerator, callWeebyGif, callWeebyOverlay, weebyAttachment } from "./weeby.js";
import {
  buyRelationshipItem,
  getActiveRelationshipEffects,
  getRelationshipInventory,
  getRelationshipItemDefs,
  useRelationshipItem,
  type RelationshipItemCode
} from "./relationship-items.js";
import sharp from "sharp";

type PrefixContext = {
  message: Message;
  command: string;
  args: string[];
};

const RANDOM_EJECT_TEXTS = [
  "was sus",
  "forgot to do tasks",
  "vented in front of everyone",
  "said trust me bro",
  "looked kinda suspicious"
];
const OVERLAY_TYPE_SET = new Set<string>(overlayTypes);
const BASE_PREFIX_COMMANDS = [
  "ping",
  "avatar",
  "serverav",
  "banner",
  "userinfo",
  "serverinfo",
  "users",
  "enlarge",
  "splitimg",
  "multipfp",
  "shiprate",
  "eightball",
  "gay",
  "insult",
  "say",
  "dog",
  "cat",
  "poke",
  "hug",
  "pat",
  "kiss",
  "cuddle",
  "slap",
  "highfive",
  "bonk",
  "tickle",
  "wink",
  "owo",
  "dare",
  "truth",
  "wyr",
  "nhie",
  "urban",
  "rps",
  "afk",
  "prefix",
  "config",
  "help",
  "family",
  "marry",
  "divorce",
  "partner",
  "date",
  "familysim",
  "familysimstats",
  "familysimmilestones",
  "familysimladder",
  "familysimduel",
  "familysimduelhistory",
  "familysimseason",
  "familysimseasonclaim",
  "familysimseasonstart",
  "familysimseasonend",
  "familysimladderreset",
  "familysimladderrecompute",
  "familysimaudit",
  "familysimpenaltyclear",
  "familysimadminpanel",
  "familysimpanel",
  "anniversary",
  "anniversaryclaim",
  "familyevent",
  "familyprofile",
  "siblings",
  "siblingadd",
  "siblingremove",
  "coupleleaderboard",
  "familyleaderboard",
  "bondstatus",
  "familyquests",
  "familyachievements",
  "familyachieveclaim",
  "relationshipshop",
  "relationshipinventory",
  "relationshipbuy",
  "relationshipuse",
  "profile",
  "daily",
  "quests",
  "leaderboard",
  "shop",
  "triggered",
  "rip",
  "tweet",
  "quote",
  "eject",
  "friendship",
  "demotivational",
  "simp",
  "thisisspotify",
  "spotifynp",
  "uk07",
  "petpet",
  "avsplit",
  "achievement",
  "bartchalkboard",
  "changemymind",
  "lisapresentation",
  "jimwhiteboard"
];
const ALL_PREFIX_COMMANDS = [...BASE_PREFIX_COMMANDS, ...overlayTypes];

function isManageGuild(message: Message) {
  return message.member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;
}

function pickSingleUser(message: Message, args: string[]) {
  const mention = message.mentions.users.first();
  if (mention && args[0]?.startsWith("<@")) {
    return { user: mention, rest: args.slice(1) };
  }
  return { user: message.author, rest: args };
}

function pickTwoUsers(message: Message, args: string[]) {
  const mentioned = [...message.mentions.users.values()];
  let consumed = 0;

  let first: User = message.author;
  let second: User = message.author;

  if (args[0]?.startsWith("<@") && mentioned[0]) {
    first = mentioned[0];
    consumed++;
  }
  if (args[consumed]?.startsWith("<@") && mentioned[consumed]) {
    second = mentioned[consumed] ?? message.author;
    consumed++;
  } else if (mentioned[1]) {
    second = mentioned[1];
  }

  return { first, second, rest: args.slice(consumed) };
}

function splitByPipe(text: string) {
  return text
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeHex(input: string) {
  const value = input.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(value) ? value : "1DB954";
}

function colorFromUserId(userId: string) {
  return normalizeHex(userId.slice(-6));
}

function progressBarText(percent: number) {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round(p / 10);
  return `${"▰".repeat(filled)}${"▱".repeat(10 - filled)} ${p}%`;
}

function nextUtcResetUnix() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.floor(next.getTime() / 1000);
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function parseEmoji(input: string) {
  const match = input.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (!match) return null;
  const animated = input.startsWith("<a:");
  const name = match[1] ?? "emoji";
  const id = match[2] ?? "";
  const ext = animated ? "gif" : "png";
  return { id, name, animated, url: `https://cdn.discordapp.com/emojis/${id}.${ext}?size=1024` };
}

function waitForUserMessage(input: {
  source: Message;
  userId: string;
  timeoutMs: number;
}) {
  return new Promise<Message | null>((resolve) => {
    const channelId = input.source.channelId;
    const onMessage = (m: Message) => {
      if (m.author.bot) return;
      if (m.author.id !== input.userId) return;
      if (m.channelId !== channelId) return;
      cleanup();
      resolve(m);
    };
    const cleanup = () => {
      clearTimeout(timer);
      input.source.client.off("messageCreate", onMessage);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, input.timeoutMs);
    input.source.client.on("messageCreate", onMessage);
  });
}

async function fetchImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function getReferencedMessage(message: Message) {
  if (!message.reference?.messageId) return null;
  return message.fetchReference().catch(() => null);
}

async function fetchJson<T>(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

async function runPing({ message }: PrefixContext) {
  await message.reply("Pong!");
}

async function runShipRate({ message, args }: PrefixContext) {
  const { first, second, rest } = pickTwoUsers(message, args);
  const name1 = rest[0] ?? first.displayName;
  const name2 = rest[1] ?? second.displayName ?? "mystery";
  const result = shipResult(name1, name2);
  const merged = await avatarSplitFromUrls(getAvatarUrl(first), getAvatarUrl(second));
  await message.reply({
    files: [new AttachmentBuilder(merged, { name: "shiprate.png" })],
    embeds: [
      new EmbedBuilder()
        .setColor(result.color)
        .setTitle("Love Test")
        .setDescription(`**${name1}** + **${name2}**`)
        .setImage("attachment://shiprate.png")
        .addFields(
          { name: "Result", value: `${result.score}%`, inline: true },
          { name: "Status", value: result.status, inline: false }
        )
    ]
  });
}

async function runEightBall({ message, args }: PrefixContext) {
  const question = args.join(" ").trim() || "No question";
  const res = eightBallAnswer();
  await message.reply({
    embeds: [new EmbedBuilder().setColor(res.color).setTitle(`Question: ${question}`).setDescription(`${res.answer} 🎱`)]
  });
}

async function runGay({ message, args }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const name = rest.join(" ").trim() || user.displayName;
  const res = gayScan(name);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(res.color)
        .setTitle("Gay-Scanner")
        .setDescription(`Gayness for **${name}**`)
        .setImage(getAvatarUrl(user))
        .addFields(
          { name: "Gayness", value: `${res.score}%`, inline: true },
          { name: "Comment", value: `${res.comment} :kiss_mm:` }
        )
    ]
  });
}

async function runInsult({ message }: PrefixContext) {
  const target = message.mentions.users.first();
  const joke = getMommaJoke();
  await message.reply(target ? `${target} eat this: ${joke}` : `${message.author} for yourself: ${joke}`);
}

async function runSay({ message, args }: PrefixContext) {
  const text = args.join(" ").trim();
  if (!text) {
    await message.reply("Usage: say <text>");
    return;
  }
  if ("send" in message.channel) {
    await message.channel.send(text);
    return;
  }
  await message.reply(text);
}

async function runDog({ message }: PrefixContext) {
  try {
    const img = await fetchJson<{ link?: string; image?: string }>("https://some-random-api.com/animal/dog");
    const fact = await fetchJson<{ fact?: string }>("https://some-random-api.com/animal/dog");
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff006a)
          .setTitle("Doggo!")
          .setDescription(fact.fact ?? "Woof!")
          .setImage(img.link ?? img.image ?? null)
      ]
    });
  } catch {
    await message.reply("Couldn't fetch dog content right now.");
  }
}

async function runCat({ message }: PrefixContext) {
  try {
    const img = await fetchJson<{ link?: string; image?: string }>("https://some-random-api.com/animal/cat");
    const fact = await fetchJson<{ fact?: string }>("https://some-random-api.com/animal/cat");
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff006a)
          .setTitle("Catto!")
          .setDescription(fact.fact ?? "Meow!")
          .setImage(img.link ?? img.image ?? null)
      ]
    });
  } catch {
    await message.reply("Couldn't fetch cat content right now.");
  }
}

async function runPoke({ message }: PrefixContext) {
  const user = message.mentions.users.first();
  if (!user) {
    await message.reply("Please mention someone to poke.");
    return;
  }
  let gifUrl: string | null = null;
  try {
    gifUrl = await callWeebyGif("poke");
  } catch {
    gifUrl = null;
  }
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf72585)
        .setDescription(`${message.author} pokes ${user} ~ OwO`)
        .setImage(gifUrl)
        .setFooter({ text: "Team Tatsui ❤️" })
    ]
  });
}

async function runActionGif(
  message: Message,
  config: {
    gifType: string;
    text: (author: string, target: string) => string;
    partnerBondAction?: "hug" | "pat" | "kiss" | "cuddle";
  }
) {
  const target = message.mentions.users.first() ?? message.author;
  let gifUrl: string | null = null;
  try {
    gifUrl = await callWeebyGif(config.gifType);
  } catch {
    gifUrl = null;
  }
  let partnerBonusLine: string | null = null;
  if (config.partnerBondAction) {
    const bonus = await awardPartnerActionBond({
      userId: message.author.id,
      targetUserId: target.id,
      guildId: message.guildId,
      action: config.partnerBondAction
    });
    if (bonus?.applied) {
      partnerBonusLine = `💞 Partner Bonus: +${bonus.rewards.bondXp} bond XP • +${bonus.rewards.bondScore} UwU`;
    }
  }
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf72585)
        .setDescription(
          [config.text(`${message.author}`, `${target}`), partnerBonusLine]
            .filter(Boolean)
            .join("\n")
        )
        .setImage(gifUrl)
        .setFooter({ text: "Team Tatsui ❤️" })
    ]
  });
}

async function runOwo({ message, args }: PrefixContext) {
  const text = args.join(" ").trim();
  if (!text) {
    await message.reply("Usage: owo <text>");
    return;
  }
  await message.reply(textToOwo(text));
}

async function runTod({ message, command }: PrefixContext) {
  const q = await getTodQuestion(command as "dare" | "truth" | "wyr" | "nhie");
  await message.reply({
    embeds: [new EmbedBuilder().setColor(0xf88379).setAuthor({ name: `${command.toUpperCase()}: ${q}` })]
  });
}

async function runUrban({ message, args }: PrefixContext) {
  const term = args.join(" ").trim();
  if (!term) {
    await message.reply("Usage: urban <term>");
    return;
  }
  try {
    const data = await fetchJson<{ list: { definition: string; example: string }[] }>(
      `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`
    );
    const first = data.list[0];
    if (!first) {
      await message.reply(`No result for **${term}**.`);
      return;
    }
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf88379)
          .setTitle(term)
          .setDescription(`Meaning: ${first.definition.slice(0, 1500)}`)
          .addFields({ name: "Example", value: first.example.slice(0, 1000) || "N/A" })
      ]
    });
  } catch {
    await message.reply("Urban lookup failed right now.");
  }
}

async function runRps({ message, args }: PrefixContext) {
  const userChoice = (args[0] ?? "").toLowerCase();
  const map: Record<string, string> = { r: "Rock", p: "Paper", s: "Scissors", rock: "Rock", paper: "Paper", scissors: "Scissors" };
  const user = map[userChoice];
  if (!user) {
    await message.reply("Usage: rps <rock|paper|scissors>");
    return;
  }
  const bot = ["Rock", "Paper", "Scissors"][Math.floor(Math.random() * 3)] ?? "Rock";
  const win =
    (user === "Rock" && bot === "Scissors") ||
    (user === "Paper" && bot === "Rock") ||
    (user === "Scissors" && bot === "Paper");
  const draw = user === bot;
  const result = draw ? "It's a draw." : win ? "You win!" : "I win!";
  await message.reply(`You: **${user}** | Me: **${bot}**\n${result}`);
}

async function runAvatar({ message, args }: PrefixContext) {
  const mentions = [...message.mentions.users.values()];

  if (mentions.length < 2 || mentions[0]?.id === mentions[1]?.id) {
    const user = mentions[0] ?? message.author;
    const animated = user.avatar?.startsWith("a_") ?? false;
    const ext = animated ? "gif" : "png";
    const avatarUrl = user.displayAvatarURL({
      extension: ext,
      forceStatic: !animated,
      size: 1024
    });
    const buffer = await fetchImage(avatarUrl);
    const fileName = `avatar.${ext}`;

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff006a)
          .setTitle("Avatar")
          .setDescription(`\`Nickname: ${user.displayName}\nID: ${user.id}\``)
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setImage(`attachment://${fileName}`)
      ],
      files: [new AttachmentBuilder(buffer, { name: fileName })]
    });
    return;
  }

  const user1 = mentions[0] ?? message.author;
  const user2 = mentions[1] ?? message.author;
  const merged = await avatarSplitFromUrls(getAvatarUrl(user1, 512), getAvatarUrl(user2, 512));

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff006a)
        .setTitle("Shared Avatar")
        .setDescription(`${user1} + ${user2}`)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setImage("attachment://shared.png")
    ],
    files: [new AttachmentBuilder(merged, { name: "shared.png" })]
  });
}

async function runServerAvatar({ message, args }: PrefixContext) {
  const { user } = pickSingleUser(message, args);
  const member = message.guild?.members.cache.get(user.id);
  const image = member?.displayAvatarURL({ size: 1024 }) ?? user.displayAvatarURL({ size: 1024 });
  await message.reply({
    embeds: [new EmbedBuilder().setColor(0xff006a).setTitle(`${user.displayName}'s Server Avatar`).setImage(image)]
  });
}

async function runBanner({ message, args }: PrefixContext) {
  const { user } = pickSingleUser(message, args);
  const fetched = await message.client.users.fetch(user.id, { force: true });
  const banner = fetched.bannerURL({ size: 2048 });
  if (!banner) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xff4400).setDescription(`${user} has no banner.`)] });
    return;
  }
  await message.reply({
    embeds: [new EmbedBuilder().setColor(0xff006a).setTitle(`${user.displayName}'s Banner`).setImage(banner)]
  });
}

async function runUserInfo({ message, args }: PrefixContext) {
  if (!message.guild) return;
  const { user } = pickSingleUser(message, args);
  const member = await message.guild.members.fetch(user.id);
  const roles = member.roles.cache.filter((r) => r.id !== message.guild!.id).map((r) => r.toString());
  const keyPerms = member.permissions
    .toArray()
    .slice(0, 12)
    .map((p) => p.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff006a)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL({ size: 512 }))
        .setDescription(`${user} \`[${user.id}]\``)
        .addFields(
          { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
          {
            name: "Joined",
            value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "Unknown",
            inline: true
          },
          { name: `Roles [${roles.length}]`, value: roles.length > 0 ? roles.slice(0, 20).join(" ") : "No roles" },
          { name: "Key Permissions", value: keyPerms.length > 0 ? keyPerms.join(", ") : "No key permissions" }
        )
    ]
  });
}

async function runServerInfo({ message }: PrefixContext) {
  if (!message.guild) return;
  const guild = message.guild;
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff006a)
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ size: 512 }))
        .addFields(
          { name: "Server ID", value: guild.id, inline: false },
          { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
          { name: "Members", value: String(guild.memberCount), inline: true },
          { name: "Roles", value: String(guild.roles.cache.size), inline: true },
          { name: "Emojis", value: String(guild.emojis.cache.size), inline: true },
          { name: "Channels", value: String(guild.channels.cache.size), inline: true },
          { name: "Verification", value: String(guild.verificationLevel), inline: true }
        )
    ]
  });
}

async function runUsers({ message }: PrefixContext) {
  if (!message.guild) return;
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff006a)
        .setTitle("Server Members")
        .setDescription(`Total members: **${message.guild.memberCount}**`)
    ]
  });
}

async function runEnlarge({ message, args }: PrefixContext) {
  const raw = args.join(" ").trim();
  const parsed = parseEmoji(raw);
  if (!parsed) {
    await message.reply("Usage: enlarge <custom emoji>");
    return;
  }
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00aeff)
        .setTitle("Enlarged Emoji")
        .setDescription(`\`${parsed.name}\` • \`${parsed.id}\``)
        .setImage(parsed.url)
    ]
  });
}

async function runSplitImg({ message }: PrefixContext) {
  const first = message.attachments.first();
  if (!first) {
    await message.reply("Attach an image and run `splitimg`.");
    return;
  }
  const input = await fetchImage(first.url);
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 2 || height < 1) {
    await message.reply("Image is too small to split.");
    return;
  }
  const half = Math.floor(width / 2);
  const left = await sharp(input).extract({ left: 0, top: 0, width: half, height }).png().toBuffer();
  const right = await sharp(input)
    .extract({ left: half, top: 0, width: width - half, height })
    .png()
    .toBuffer();

  await message.reply({
    files: [
      new AttachmentBuilder(left, { name: "left.png" }),
      new AttachmentBuilder(right, { name: "right.png" })
    ]
  });
}

async function runMultiPfp({ message }: PrefixContext) {
  const members = [...message.mentions.users.values()];
  const users = members.length > 0 ? members : [message.author];
  const uniqueUsers = [...new Map(users.map((u) => [u.id, u])).values()];
  const size = 500;

  const avatars = await Promise.all(
    uniqueUsers.map(async (user) => {
      const input = await fetchImage(getAvatarUrl(user, 512));
      return sharp(input).resize(size, size, { fit: "cover" }).png().toBuffer();
    })
  );

  const merged = await sharp({
    create: {
      width: size * avatars.length,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(avatars.map((input, i) => ({ input, left: i * size, top: 0 })))
    .png()
    .toBuffer();

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xff006a)
        .setTitle("Multiple PFP Merge")
        .setDescription(uniqueUsers.map((u) => u.toString()).join(" "))
        .setImage("attachment://multipfp.png")
    ],
    files: [new AttachmentBuilder(merged, { name: "multipfp.png" })]
  });
}

async function runAfk({ message, args }: PrefixContext) {
  const reason = args.join(" ").trim() || "Away";

  await db.discordUser.upsert({
    where: { id: message.author.id },
    update: {
      username: message.author.username,
      avatar: message.author.avatarURL() ?? undefined
    },
    create: {
      id: message.author.id,
      username: message.author.username,
      avatar: message.author.avatarURL() ?? undefined
    }
  });

  await db.aFK.upsert({
    where: { userId: message.author.id },
    update: {
      guildId: message.guildId ?? "dm",
      reason,
      mentionCount: 0
    },
    create: {
      userId: message.author.id,
      guildId: message.guildId ?? "dm",
      reason
    }
  });

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf4b942)
        .setTitle("AFK Enabled")
        .setDescription(`You're now AFK.\n**Reason:** ${reason}`)
    ]
  });
}

async function runPrefix({ message, args }: PrefixContext) {
  if (!message.guildId) {
    await message.reply("This command works in a server only.");
    return;
  }

  const sub = (args[0] ?? "").toLowerCase();
  if (!sub || sub === "get") {
    const prefix = await getGuildPrefix(message.guildId);
    await message.reply(`Current prefix: \`${prefix}\``);
    return;
  }

  if (sub !== "set") {
    await message.reply("Usage: prefix get | prefix set <value>");
    return;
  }

  if (!isManageGuild(message)) {
    await message.reply("You need Manage Server permission to change prefix.");
    return;
  }

  const newPrefix = (args[1] ?? "").trim();
  if (!newPrefix) {
    await message.reply("Usage: prefix set <value>");
    return;
  }

  if (newPrefix.length > 5) {
    await message.reply("Prefix must be 5 chars or fewer.");
    return;
  }

  await setGuildPrefix(message.guildId, newPrefix);
  await message.reply(`Prefix updated to \`${newPrefix}\``);
}

async function runConfig({ message, args }: PrefixContext) {
  if (!message.guildId) {
    await message.reply("This command works in a server only.");
    return;
  }

  if (!isManageGuild(message)) {
    await message.reply("You need Manage Server permission to change config.");
    return;
  }

  const moduleName = (args[0] ?? "").toLowerCase();
  const enabledRaw = (args[1] ?? "").toLowerCase();
  const configKeys = [
    MODULE_KEYS.afk,
    MODULE_KEYS.fun,
    MODULE_KEYS.games,
    MODULE_KEYS.utility,
    "familyEnabled",
    "marriageEnabled",
    "siblingsEnabled",
    "publicFamilyAnnouncements"
  ];

  if (!configKeys.map((k) => k.toLowerCase()).includes(moduleName)) {
    await message.reply(
      "Usage: config <afk|fun|games|utility|familyEnabled|marriageEnabled|siblingsEnabled|publicFamilyAnnouncements> <on|off>"
    );
    return;
  }

  const enabled = enabledRaw === "on" || enabledRaw === "true" || enabledRaw === "enable";
  const disabled = enabledRaw === "off" || enabledRaw === "false" || enabledRaw === "disable";

  if (!enabled && !disabled) {
    await message.reply(
      "Usage: config <afk|fun|games|utility|familyEnabled|marriageEnabled|siblingsEnabled|publicFamilyAnnouncements> <on|off>"
    );
    return;
  }

  const guild = await ensureGuild(message.guildId, message.guild?.name);
  const settings = {
    ...(guild.settings as Record<string, unknown>),
    [moduleName]: enabled
  };

  await db.guild.update({
    where: { id: message.guildId },
    data: { settings }
  });

  await message.reply(`${moduleName} is now ${enabled ? "enabled" : "disabled"}.`);
}

async function runTriggered({ message, args }: PrefixContext) {
  const { user } = pickSingleUser(message, args);
  const result = await callWeebyGenerator("triggered", {
    image: getAvatarUrl(user),
    tint: "true"
  });
  await message.reply({ files: [weebyAttachment("triggered", result, "gif")] });
}

async function runRip({ message, args }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const result = await callWeebyGenerator("rip", {
    avatar: getAvatarUrl(user),
    username: user.username,
    message: rest.join(" ").trim() || "You will be missed."
  });
  await message.reply({ files: [weebyAttachment("rip", result, "png")] });
}

async function runTweet({ message, args }: PrefixContext) {
  const { user: mentionedUser, rest } = pickSingleUser(message, args);
  const referenced = await getReferencedMessage(message);
  const user = referenced?.author ?? mentionedUser;
  const text = (referenced?.content || rest.join(" ").trim() || "Hello world from CoCo-sui.").trim();

  const result = await callWeebyGenerator("tweet", {
    username: user.username,
    tweet: text,
    avatar: getAvatarUrl(user)
  });
  await message.reply({ files: [weebyAttachment("tweet", result, "png")] });
}

async function runQuote({ message, args }: PrefixContext) {
  const { user: mentionedUser, rest } = pickSingleUser(message, args);
  const referenced = await getReferencedMessage(message);
  const user = referenced?.author ?? mentionedUser;
  const [textPart, authorPart] = splitByPipe(referenced?.content || rest.join(" "));
  if (!textPart) {
    const fallback = await callWeebyGenerator("quote", {
      image: getAvatarUrl(user),
      text: "No quote provided.",
      author: user.username
    });
    await message.reply({ files: [weebyAttachment("quote", fallback, "png")] });
    return;
  }

  const result = await callWeebyGenerator("quote", {
    image: getAvatarUrl(user),
    text: textPart,
    author: authorPart || user.username
  });
  await message.reply({ files: [weebyAttachment("quote", result, "png")] });
}

async function runEject({ message, args }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const [text, outcomeRaw] = rest;
  const outcome =
    outcomeRaw && ["ejected", "imposter", "notimposter"].includes(outcomeRaw.toLowerCase())
      ? outcomeRaw.toLowerCase()
      : "ejected";

  let result;
  try {
    result = await callWeebyGenerator("eject", {
      image: getAvatarUrl(user),
      text: text || `${user.username} ${randomItem(RANDOM_EJECT_TEXTS)}`,
      outcome
    });
  } catch {
    result = await callWeebyGenerator("eject", {
      image: getAvatarUrl(user),
      text: user.username,
      outcome: "ejected"
    });
  }
  await message.reply({ files: [weebyAttachment("eject", result, "png")] });
}

async function runFriendship({ message, args }: PrefixContext) {
  const { first, second } = pickTwoUsers(message, args);
  const result = await callWeebyGenerator("friendship", {
    firstimage: getAvatarUrl(first),
    secondimage: getAvatarUrl(second),
    firsttext: first.username,
    secondtext: second.username
  });
  await message.reply({ files: [weebyAttachment("friendship", result, "png")] });
}

async function runDemotivational({ message, args }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const [textPart, titlePart] = splitByPipe(rest.join(" "));
  if (!textPart) {
    await message.reply("Usage: demotivational [@user] <text> [| title]");
    return;
  }

  const result = await callWeebyGenerator("demotivational", {
    image: getAvatarUrl(user),
    title: titlePart || "Demotivational",
    text: textPart
  });
  await message.reply({ files: [weebyAttachment("demotivational", result, "png")] });
}

async function runThisIsSpotify({ message, args }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const [textPart, colorPart] = splitByPipe(rest.join(" "));
  const text = textPart || `${user.username}'s Mix`;

  const color = normalizeHex(colorPart ?? colorFromUserId(user.id));
  const result = await callWeebyGenerator("thisisspotify", {
    image: getAvatarUrl(user),
    text,
    color
  });
  await message.reply({ files: [weebyAttachment("thisisspotify", result, "png")] });
}

async function runSpotifyNp({ message, args }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const [title, artist, album] = splitByPipe(rest.join(" "));

  const result = await callWeebyGenerator("spotifynp", {
    image: getAvatarUrl(user),
    title: title || "Unknown Track",
    artist: artist || user.username,
    album: album || "Now Playing"
  });
  await message.reply({ files: [weebyAttachment("spotifynp", result, "png")] });
}

async function runPetPet({ message, args }: PrefixContext) {
  const { user } = pickSingleUser(message, args);
  const gifBuffer = await petPetFromAvatarUrl(getAvatarUrl(user, 256));
  await message.reply({
    files: [new AttachmentBuilder(gifBuffer, { name: "petpet.gif" })]
  });
}

async function runSimp({ message, args }: PrefixContext) {
  const mention = message.mentions.users.first();
  const target = mention ?? message.client.user ?? message.author;
  const image = await buildSimpCardFromAvatar(
    getAvatarUrl(message.author, 1024),
    message.author.displayName,
    target.displayName
  );

  await message.reply({
    files: [new AttachmentBuilder(image, { name: "simpcard.png" })]
  });
}

async function runUk07({ message, args }: PrefixContext) {
  const referenced = await getReferencedMessage(message);
  const text = (referenced?.content || args.join(" ").trim() || "Recharge khatam hogya").trim();
  const image = await buildUk07Card(text);

  await message.reply({
    files: [new AttachmentBuilder(image, { name: "uk07.png" })]
  });
}

async function runAvSplit({ message, args }: PrefixContext) {
  const { first, second } = pickTwoUsers(message, args);
  const merged = await avatarSplitFromUrls(getAvatarUrl(first), getAvatarUrl(second));
  await message.reply({
    files: [new AttachmentBuilder(merged, { name: "avsplit.png" })]
  });
}

async function runOverlay({ message, args, command }: PrefixContext) {
  const { user } = pickSingleUser(message, args);
  const result = await callWeebyOverlay(command, {
    image: getAvatarUrl(user)
  });
  await message.reply({ files: [weebyAttachment(command, result)] });
}

async function runImageTextGenerator({ message, args, command }: PrefixContext) {
  const { user, rest } = pickSingleUser(message, args);
  const text = rest.join(" ").trim();
  if (!text) {
    await message.reply(`Usage: ${command} [@user] <text>`);
    return;
  }
  const result = await callWeebyGenerator(command, {
    image: getAvatarUrl(user),
    text
  });
  await message.reply({ files: [weebyAttachment(command, result, "png")] });
}

async function runHelp({ message, args }: PrefixContext) {
  const detail = args[0]?.toLowerCase();
  const detailCommand = detail ? findCommandDoc(detail) : null;
  if (detail && detailCommand) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5b8cff)
          .setTitle(`Help: ${detailCommand.name}`)
          .setDescription(detailCommand.description)
          .addFields(
            { name: "Slash", value: `\`${detailCommand.slash}\`` },
            {
              name: "Prefix",
              value: detailCommand.prefix ? `\`${detailCommand.prefix}\`` : "N/A"
            },
            {
              name: "Aliases",
              value:
                detailCommand.aliases && detailCommand.aliases.length > 0
                  ? detailCommand.aliases.map((a) => `\`${a}\``).join(", ")
                  : "None"
            }
          )
      ]
    });
    return;
  }

  const normalized = (detail ?? "overview").toLowerCase();
  const categories = new Set<HelpCategory>(Object.keys(helpCategoryLabels) as HelpCategory[]);

  const category =
    categories.has(normalized as HelpCategory) && normalized !== "overview"
      ? (normalized as HelpCategory)
      : ("overview" as HelpCategory);
  await message.reply(buildHelpMessage(category, message.author.id, 0));
}

async function runFamily({ message, args }: PrefixContext) {
  const sub = (args[0] ?? "").toLowerCase();
  const settings = await getFamilySettings(message.guildId);
  ensureFamilyEnabledOrThrow(settings);
  const usageEmbed = (hint: string, title = "Family Usage") =>
    new EmbedBuilder()
      .setColor(0xf72585)
      .setTitle(`👪 ${title}`)
      .setDescription(`Try: \`${hint}\``)
      .setFooter({ text: "Team Tatsui ❤️" });
  const adminOnlyEmbed = () =>
    new EmbedBuilder()
      .setColor(0xf72585)
      .setTitle("🚫 Permission Required")
      .setDescription("You need `Manage Server` to use this command.")
      .setFooter({ text: "Team Tatsui ❤️" });

  if (!sub) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setTitle("👪 Family Commands")
          .setDescription(
            [
              "`family marry @user`",
              "`family divorce`",
              "`family date`",
              "`family familysim`",
              "`family familysimstats`",
              "`family familysimmilestones`",
              "`family familysimladder`",
              "`family familysimduel @user`",
              "`family familysimduelhistory`",
              "`family familysimseason`",
              "`family familysimseasonclaim`",
              "`family familysimseasonstart [seasonKey]`",
              "`family familysimseasonend [seasonKey]`",
              "`family familysimladderreset [seasonKey]`",
              "`family familysimladderrecompute [seasonKey]`",
              "`family familysimaudit`",
              "`family familysimpenaltyclear [all|flag <id>|@user|rel <relationshipId>]`",
              "`family familysimadminpanel`",
              "`family familysimpanel`",
              "`family profile [@user]`",
              "`family anniversaryclaim`",
              "`family siblings`",
              "`family siblingadd @user`",
              "`family siblingremove @user`",
              "`family coupleleaderboard`",
              "`family leaderboard`",
              "`family bondstatus @user`",
              "`family familyquests`",
              "`family familyachievements`",
              "`family familyachieveclaim [key]`"
            ].join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "marry") {
    ensureMarriageEnabledOrThrow(settings);
    const target = message.mentions.users.first();
    if (!target) {
      const profile = await getFamilyProfile(message.author.id);
      const prefix = await getGuildPrefix(message.guildId ?? "0");
      await message.reply({ embeds: [buildMarriageStatusEmbed(message.author, profile, prefix)] });
      return;
    }
    if (target.id === message.author.id) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setAuthor({ name: "Sheesh!", iconURL: getAvatarUrl(message.author) })
            .setDescription("> You Can't Marry Yourself Dumbo!\n**__Usage__:**\n`marry @user`")
            .setImage("https://c.tenor.com/mW-BeHkDVKEAAAAC/monsters-inc-pixar.gif")
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    if (target.bot) {
      await message.reply("BRUH!! You can't make a bot your partner!!");
      return;
    }
    const [selfProfile, targetProfile, bond] = await Promise.all([
      getFamilyProfile(message.author.id),
      getFamilyProfile(target.id),
      getBondStatus(message.author.id, target.id)
    ]);
    if (bond?.type === "SIBLING") {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setAuthor({
              name: "Wha-! You Wanna Marry Your Sibling?",
              iconURL: getAvatarUrl(message.author)
            })
            .setDescription("> You Can't Marry Your Sibling !!\nI mean u can- But my dev won't allow it.\n**__Usage__:**\n`marry @user`")
            .setImage("https://c.tenor.com/wuupKv_VikQAAAAC/sweet-home-alabama.gif")
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    if (selfProfile.partner || targetProfile.partner) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(`:no_entry_sign: | **${message.author.username}** , you or your friend is already married!`)
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const proposal = await createProposal({
      type: "PARTNER",
      from: message.author,
      to: target,
      guildId: message.guildId
    });
    const sent = await message.reply({
      content: `${target}, you have a new proposal.`,
      ...buildProposalMessage({
        proposalId: proposal.id,
        type: "PARTNER",
        from: message.author,
        to: target,
        expiresAt: proposal.expiresAt
      })
    });
    scheduleProposalTimeout({
      client: message.client,
      proposalId: proposal.id,
      channelId: sent.channelId,
      messageId: sent.id,
      expiresAt: proposal.expiresAt
    });
    return;
  }

  if (sub === "divorce") {
    ensureMarriageEnabledOrThrow(settings);
    await endPartnerRelationship(message.author.id);
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(`:broken_heart:  || ${message.author}, You have decided to divorce.`)
          .setThumbnail("https://i.gifer.com/ZdPB.gif")
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "date") {
    ensureMarriageEnabledOrThrow(settings);
    const result = await awardDateInteraction({
      userId: message.author.id,
      guildId: message.guildId,
      username: message.author.username
    });
    const profile = await getFamilyProfile(message.author.id);
    const totalDates = profile.partner?.totalDates ?? 0;
    const uwuScore = profile.partner?.bondScore ?? result.rewards.bondScore;
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(
            [
              `💰 | ${message.author}, Here is your daily for your date \`${result.rewards.coins}\``,
              `💞 | You've dated ${totalDates} times!`,
              `And Your UwU score is \`${uwuScore}\`! Pretty Good :smirk:`,
              "",
              `\`Tier:\` **${result.scenarioTier}**`,
              `\`Event:\` **${result.event.name}**`,
              `*${result.scenario}*`,
              result.rareBonus > 0 ? `✨ Rare bonus: +${result.rareBonus}` : null,
              `🎉 ${result.event.bonusText} (ends <t:${Math.floor(new Date(result.event.endsAt).getTime() / 1000)}:R>)`
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "familysim" || sub === "sim" || sub === "simulate") {
    ensureMarriageEnabledOrThrow(settings);
    const result = await awardFamilySimulationInteraction({
      userId: message.author.id,
      guildId: message.guildId,
      username: message.author.username
    });
    await message.reply({
      embeds: [buildFamilySimulationResultEmbed(result, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimstats" || sub === "simstats" || sub === "simlog") {
    ensureMarriageEnabledOrThrow(settings);
    const stats = await getFamilySimulationAnalytics(message.author.id);
    await message.reply({
      embeds: [buildFamilySimulationStatsEmbed(stats, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimmilestones" || sub === "simmilestones" || sub === "simmile") {
    ensureMarriageEnabledOrThrow(settings);
    const board = await getFamilySimulationMilestoneBoard(message.author.id);
    await message.reply({
      embeds: [buildFamilySimulationMilestonesEmbed(board, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimladder" || sub === "simladder" || sub === "ladder") {
    ensureMarriageEnabledOrThrow(settings);
    const ladder = await getFamilySimulationLadder({ userId: message.author.id, limit: 10 });
    await message.reply({
      embeds: [buildFamilySimulationLadderEmbed(ladder, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimduel" || sub === "simduel" || sub === "duel") {
    ensureMarriageEnabledOrThrow(settings);
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply({ embeds: [usageEmbed("family familysimduel @user")] });
      return;
    }
    const duel = await awardFamilySimulationDuel({
      userId: message.author.id,
      opponentUserId: target.id,
      guildId: message.guildId,
      username: message.author.username
    });
    await message.reply({
      embeds: [buildFamilySimulationDuelResultEmbed(duel, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimduelhistory" || sub === "simduelhistory" || sub === "duelhistory") {
    ensureMarriageEnabledOrThrow(settings);
    const history = await getFamilySimulationDuelHistory({ userId: message.author.id, limit: 10 });
    await message.reply({
      embeds: [buildFamilySimulationDuelHistoryEmbed(history, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimseason" || sub === "simseason" || sub === "season") {
    ensureMarriageEnabledOrThrow(settings);
    const season = await getFamilySimulationSeasonOverview({ userId: message.author.id, limit: 10 });
    await message.reply({
      embeds: [buildFamilySimulationSeasonOverviewEmbed(season, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimseasonclaim" || sub === "simseasonclaim" || sub === "seasonclaim") {
    ensureMarriageEnabledOrThrow(settings);
    const claim = await claimFamilySimulationSeasonRewards({
      userId: message.author.id,
      guildId: message.guildId
    });
    await message.reply({
      embeds: [buildFamilySimulationSeasonClaimEmbed(claim, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimseasonstart" || sub === "simseasonstart") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    const seasonKey = args[1] ?? undefined;
    const result = await adminForceStartFamilySimulationSeason({
      adminUserId: message.author.id,
      guildId: message.guildId,
      seasonKey
    });
    await message.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: message.author,
          title: "✅ Season Force Started",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "All active couples were moved into this season with ladder reset to fresh."
        })
      ]
    });
    return;
  }

  if (sub === "familysimseasonend" || sub === "simseasonend") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    const seasonKey = args[1] ?? undefined;
    const result = await adminForceEndFamilySimulationSeason({
      adminUserId: message.author.id,
      guildId: message.guildId,
      seasonKey
    });
    await message.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: message.author,
          title: "🛑 Season Force Ended",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "Couples were shifted off active week key so rewards can be claimable immediately."
        })
      ]
    });
    return;
  }

  if (sub === "familysimladderreset" || sub === "simladderreset") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    const seasonKey = args[1] ?? undefined;
    const result = await adminResetFamilySimulationLadder({
      adminUserId: message.author.id,
      guildId: message.guildId,
      seasonKey
    });
    await message.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: message.author,
          title: "♻️ Ladder Reset Complete",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "Points/tier/reward-mask were reset for all active couples."
        })
      ]
    });
    return;
  }

  if (sub === "familysimladderrecompute" || sub === "simladderrecompute") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    const seasonKey = args[1] ?? undefined;
    const result = await adminRecomputeFamilySimulationLadder({
      adminUserId: message.author.id,
      guildId: message.guildId,
      seasonKey
    });
    await message.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: message.author,
          title: "🧮 Ladder Recomputed",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "Tier buckets were recomputed from current season points."
        })
      ]
    });
    return;
  }

  if (sub === "familysimaudit" || sub === "simaudit") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    const audit = await getFamilyModerationAudit({ guildId: message.guildId, limit: 10 });
    if (!audit.supported) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Audit tables are not available yet. Run Prisma push/migrate first.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    await message.reply({
      embeds: [buildFamilyModerationAuditEmbed(audit, message.author)]
    });
    return;
  }

  if (sub === "familysimpenaltyclear" || sub === "simpenaltyclear") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    const mode = (args[1] ?? "").toLowerCase();
    const mention = message.mentions.users.first();
    const clearAll = mode === "all";
    const flagId =
      mode === "flag"
        ? args[2]
        : !clearAll && !mention && mode && mode !== "rel" && mode !== "user"
          ? args[1]
          : undefined;
    const relationshipId = mode === "rel" ? args[2] : undefined;
    const userId = mention?.id ?? (mode === "user" ? args[2] : undefined);
    if (!clearAll && !flagId && !relationshipId && !userId) {
      await message.reply({
        embeds: [
          usageEmbed(
            "family familysimpenaltyclear [all|flag <id>|@user|rel <relationshipId>]"
          )
        ]
      });
      return;
    }
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("📝 Penalty Clear Reason Required")
          .setDescription(
            [
              "Reply with: `reason | optional note`",
              "Example: `False positive collusion | reviewed manually by mods`",
              "Type `cancel` to abort."
            ].join("\n")
          )
          .setFooter({ text: "Waiting 2 minutes for your reply." })
      ]
    });
    const response = await waitForUserMessage({
      source: message,
      userId: message.author.id,
      timeoutMs: 120_000
    });
    if (!response) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Timed out waiting for reason. Penalty clear cancelled.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const text = response.content.trim();
    if (text.toLowerCase() === "cancel") {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Penalty clear cancelled.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const [reasonRaw, noteRaw] = text.split("|", 2).map((x: string) => x.trim());
    if (!reasonRaw) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Reason is required. Penalty clear cancelled.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("⚠️ Confirm Penalty Clear")
          .setDescription(
            [
              `Target filter: ${
                clearAll
                  ? "`all`"
                  : flagId
                    ? `flag \`${flagId}\``
                    : relationshipId
                      ? `relationship \`${relationshipId}\``
                      : userId
                        ? `<@${userId}>`
                        : "`unknown`"
              }`,
              `Reason: **${reasonRaw}**`,
              noteRaw ? `Note: ${noteRaw}` : null,
              "",
              "Type `YES` to confirm, or `no`/`cancel` to abort."
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setFooter({ text: "Waiting 60 seconds for confirmation." })
      ]
    });
    const confirmation = await waitForUserMessage({
      source: message,
      userId: message.author.id,
      timeoutMs: 60_000
    });
    if (!confirmation) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Timed out waiting for confirmation. Penalty clear cancelled.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const confirmationText = confirmation.content.trim().toLowerCase();
    if (confirmationText !== "yes") {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Penalty clear cancelled.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const result = await adminClearFamilyPenaltyFlags({
      adminUserId: message.author.id,
      guildId: message.guildId,
      flagId,
      userId,
      relationshipId,
      clearAll,
      reason: reasonRaw,
      note: noteRaw || null
    });
    if (!result.supported) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Penalty tables are not available yet. Run Prisma push/migrate first.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("🧹 Penalty Flags Cleared")
          .setDescription(
            [
              `Cleared: **${result.cleared}**`,
              `Matched: **${result.matched}**`,
              `Auto-Resolved: **${result.autoResolved ?? 0}**`,
              `Reason: **${reasonRaw}**`,
              noteRaw ? `Note: ${noteRaw}` : null
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "familysimadminpanel" || sub === "simadminpanel") {
    ensureMarriageEnabledOrThrow(settings);
    if (!isManageGuild(message)) {
      await message.reply({ embeds: [adminOnlyEmbed()] });
      return;
    }
    await message.reply({
      embeds: [buildFamilySimulationAdminPanelEmbed(message.author)],
      components: buildFamilySimulationAdminPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "familysimpanel" || sub === "simpanel") {
    ensureMarriageEnabledOrThrow(settings);
    const stats = await getFamilySimulationAnalytics(message.author.id);
    await message.reply({
      embeds: [buildFamilySimulationRecentEmbed(stats, message.author)],
      components: buildFamilySimulationPanelComponents(message.author.id)
    });
    return;
  }

  if (sub === "partner") {
    const payload = await buildFamilyPanelPayload(
      message.author,
      message.author.id,
      "partner"
    );
    await message.reply(payload);
    return;
  }

  if (sub === "anniversary") {
    const profile = await getFamilyProfile(message.author.id);
    if (!profile.partner) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setAuthor({ name: "You are not currently married.", iconURL: getAvatarUrl(message.author) })
            .setDescription(`${message.author.username}, you are not married! Please Marry Someone First! \n Usage : \`marry @user\``)
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const d = new Date(profile.partner.since);
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("Anniversary")
          .setDescription(
            [
              `Partner: <@${profile.partner.userId}>`,
              `Started: <t:${Math.floor(d.getTime() / 1000)}:D>`,
              `Days Together: **${Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))}**`
            ].join("\n")
          )
      ]
    });
    return;
  }

  if (sub === "anniversaryclaim") {
    ensureMarriageEnabledOrThrow(settings);
    const result = await claimAnniversaryReward({
      userId: message.author.id,
      guildId: message.guildId
    });
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x15ff00)
          .setTitle("💍 Anniversary Reward Claimed")
          .setDescription(
            [
              `Partner: <@${result.partnerId}>`,
              `Days Together: **${result.daysTogether}**`,
              `+${result.rewards.xp} XP • +${result.rewards.coins} coins • +${result.rewards.bondXp} bond XP`
            ].join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "familyevent") {
    const event = getCurrentFamilyEvent();
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setTitle(`🎊 ${event.name}`)
          .setDescription(
            [
              event.description,
              "",
              `Bonus: ${event.bonusText}`,
              `Started: <t:${Math.floor(event.startsAt.getTime() / 1000)}:D>`,
              `Ends: <t:${Math.floor(event.endsAt.getTime() / 1000)}:R>`
            ].join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "profile") {
    const target = message.mentions.users.first() ?? message.author;
    const payload = await buildFamilyPanelPayload(
      target,
      message.author.id,
      "overview"
    );
    await message.reply(payload);
    return;
  }

  if (sub === "siblings") {
    const payload = await buildFamilyPanelPayload(
      message.author,
      message.author.id,
      "siblings"
    );
    await message.reply(payload);
    return;
  }

  if (sub === "siblingadd") {
    ensureSiblingsEnabledOrThrow(settings);
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply({ embeds: [usageEmbed("family siblingadd @user")] });
      return;
    }
    const proposal = await createProposal({
      type: "SIBLING",
      from: message.author,
      to: target,
      guildId: message.guildId
    });
    const sent = await message.reply({
      content: `${target}, you got a sibling request.`,
      ...buildProposalMessage({
        proposalId: proposal.id,
        type: "SIBLING",
        from: message.author,
        to: target,
        expiresAt: proposal.expiresAt
      })
    });
    scheduleProposalTimeout({
      client: message.client,
      proposalId: proposal.id,
      channelId: sent.channelId,
      messageId: sent.id,
      expiresAt: proposal.expiresAt
    });
    return;
  }

  if (sub === "siblingremove") {
    ensureSiblingsEnabledOrThrow(settings);
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply({ embeds: [usageEmbed("family siblingremove @user")] });
      return;
    }
    await removeSibling(message.author.id, target.id);
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(`:broken_heart:  || ${message.author}, You have decided to disown them as sibling.`)
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "coupleleaderboard") {
    const rows = await getCoupleLeaderboard(10);
    await message.reply({ embeds: [buildCoupleLeaderboardEmbed(rows)] });
    return;
  }

  if (sub === "leaderboard" || sub === "familyleaderboard") {
    const rows = await getTopFamilyLeaderboard(10);
    await message.reply({ embeds: [buildFamilyLeaderboardEmbed(rows)] });
    return;
  }

  if (sub === "bondstatus") {
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply({ embeds: [usageEmbed("family bondstatus @user")] });
      return;
    }
    const status = await getBondStatus(message.author.id, target.id);
    if (!status) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(`You have no active relationship with ${target}.`)
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    const relationLabel = status.type === "PARTNER" ? "Partner" : "Sibling";
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${message.author.username}'s Bond with ${target.username}`,
            iconURL: getAvatarUrl(message.author)
          })
          .setThumbnail("https://i.gifer.com/ZdPB.gif")
          .setDescription(
            [
              `Type: \`${relationLabel}\``,
              `Started: <t:${Math.floor(new Date(status.startedAt).getTime() / 1000)}:D>`,
              `And Your UwU score is \`${status.bondScore}\`! Pretty Good :smirk:`,
              `Bond Level: \`${status.bondLevel}\` • Bond XP: \`${status.bondXp}\``,
              `Current Streak: \`${status.streak}\` • Dates: \`${status.totalDates}\``
            ].join("\n")
          )
          .setImage("https://i.gifer.com/ZdPB.gif")
          .setTimestamp(new Date())
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
    return;
  }

  if (sub === "familyquests") {
    const board = await getFamilyQuestBoard(message.author.id, message.guildId);
    const fmt = (quests: Array<{ title: string; progress: number; target: number; rewardXp: number; rewardCoins: number; rewardBondXp: number; completed: boolean; claimed: boolean }>) =>
      quests
        .map((q, i) =>
          [
            `${i + 1}. ${q.claimed ? "🏆" : q.completed ? "✅" : "▫️"} ${q.title}`,
            `▸ Reward: \`${q.rewardXp} XP\` • \`${q.rewardCoins} coins\` • \`${q.rewardBondXp} bond XP\``,
            `▸ Progress: \`[${Math.min(q.progress, q.target)}/${q.target}]\` ${q.claimed ? "• `CLAIMED`" : ""}`
          ].join("\n")
        )
        .join("\n\n");
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${message.author.displayName}'s Family Quest Log`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(
            [
              `These quests belong to ${message.author}.`,
              board.hasPartner ? "💍 Partner bond detected." : "💤 No active partner right now.",
              board.hasSiblings ? "🧬 Sibling bond detected." : "🫧 No active siblings right now."
            ].join("\n")
          )
          .addFields(
            { name: "🗓 Partner Quests", value: fmt(board.partner) },
            { name: "📆 Sibling & Family Quests", value: fmt(board.sibling) }
          )
          .setFooter({ text: "Progress updates automatically when you use family commands." })
      ],
      components: buildFamilyQuestClaimComponents(message.author.id)
    });
    return;
  }

  if (sub === "familyachievements") {
    const board = await getFamilyAchievements(message.author.id, message.guildId);
    const fmt = (rows: Array<{ title: string; progress: number; target: number; rewardXp: number; rewardCoins: number; rewardBondXp: number; completed: boolean; claimed: boolean }>) =>
      rows
        .map((a, i) =>
          [
            `${i + 1}. ${a.claimed ? "🏆" : a.completed ? "✅" : "▫️"} ${a.title}`,
            `▸ Reward: \`${a.rewardXp} XP\` • \`${a.rewardCoins} coins\` • \`${a.rewardBondXp} bond XP\``,
            `▸ Progress: \`[${Math.min(a.progress, a.target)}/${a.target}]\` ${a.claimed ? "• \`CLAIMED\`" : ""}`
          ].join("\n")
        )
        .join("\n\n");
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${message.author.displayName}'s Family Achievements`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(`Unlocked: **${board.unlocked}/${board.total}**`)
          .addFields({ name: "🏆 Achievement Board", value: fmt(board.achievements) || "No achievements yet." })
          .setFooter({ text: "Permanent milestones. Claim once forever." })
      ],
      components: buildFamilyAchievementClaimComponents(message.author.id)
    });
    return;
  }

  if (sub === "familyachieveclaim") {
    const key = args[1] ? String(args[1]) : undefined;
    const result = await claimFamilyAchievementRewards({
      userId: message.author.id,
      guildId: message.guildId,
      key
    });
    if (result.claimed.length === 0) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("No completed unclaimed achievements found.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    await message.reply({
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
    return;
  }

  await message.reply({
    embeds: [usageEmbed("family <marry|divorce|partner|date|familysim|familysimstats|familysimmilestones|familysimladder|familysimduel|familysimduelhistory|familysimseason|familysimseasonclaim|familysimseasonstart|familysimseasonend|familysimladderreset|familysimladderrecompute|familysimaudit|familysimpenaltyclear|familysimadminpanel|familysimpanel|anniversary|anniversaryclaim|familyevent|profile|siblings|siblingadd|siblingremove|coupleleaderboard|leaderboard|bondstatus|familyquests|familyachievements|familyachieveclaim>", "Unknown Family Subcommand")]
  });
}

function asFamilyCtx(ctx: PrefixContext, sub: string): PrefixContext {
  return { ...ctx, command: "family", args: [sub, ...ctx.args] };
}

async function runProfile({ message, args }: PrefixContext) {
  const { user } = pickSingleUser(message, args);
  const profile = await getProfile(user.id, message.guildId, user.username);
  const identity = await getRelationshipIdentity(user.id);
  const familyAchievements = await getFamilyAchievements(user.id, message.guildId);
  const activeRelationshipEffects = await getActiveRelationshipEffects(user.id);
  const progressBar = Math.max(0, Math.min(100, Math.floor((profile.levelProgress / profile.levelRequired) * 100)));

  const embed = new EmbedBuilder()
    .setColor(0x5b8cff)
    .setAuthor({ name: `${user.displayName}'s Profile`, iconURL: getAvatarUrl(user, 256) })
    .setThumbnail(getAvatarUrl(user))
    .setDescription(
      [
        `**🏷 Title:** ${profile.title}`,
        `**📈 Progress:** ${progressBarText(progressBar)}`,
        `**⚡ XP Multiplier:** x${profile.xpMultiplier.toFixed(2)} • **💰 Coin Multiplier:** x${profile.coinMultiplier.toFixed(2)}`
      ].join("\n")
    )
    .addFields(
      { name: "⭐ Level", value: `${profile.levelComputed}`, inline: true },
      { name: "📚 XP", value: `${profile.levelProgress}/${profile.levelRequired}`, inline: true },
      { name: "🪙 Coins", value: `${profile.coins}`, inline: true },
      { name: "🔥 Streak", value: `${profile.dailyStreak}`, inline: true },
      {
        name: "💞 Active Relationship Effects",
        value:
          activeRelationshipEffects.length > 0
            ? [
                "```diff",
                "+ Relationship Aura Active",
                "```",
                activeRelationshipEffects.map((e: string) => `> ${e}`).join("\n")
              ].join("\n")
            : "```diff\n- No active relationship aura right now\n```"
      },
      {
        name: "🏷 Relationship Identity",
        value: `Title: **${identity.title}**\nBadges: ${identity.badges.length > 0 ? identity.badges.join(" • ") : "None"}`
      },
      {
        name: "🏆 Family Achievements",
        value: `Unlocked: **${familyAchievements.unlocked}/${familyAchievements.total}** • Claimed: **${familyAchievements.claimed}**`
      }
    )
    .setFooter({ text: "CoCo-sui Progression" });

  try {
    const rank = await callWeebyCustom("rank", {
      avatar: getAvatarUrl(user, 1024),
      username: user.username,
      bgColor: colorFromUserId(user.id),
      level: String(profile.levelComputed),
      xp: String(profile.levelProgress),
      progressBar: String(progressBar),
      progressBarColor: "4F46E5",
      status: "22C55E",
      font: "nexa"
    });
    const rankAttachment = weebyAttachment("rank", rank, "png");
    embed.setImage("attachment://rank.png");
    await message.reply({ embeds: [embed], files: [rankAttachment] });
    return;
  } catch {
    await message.reply({ embeds: [embed] });
  }
}

async function runDaily({ message }: PrefixContext) {
  const result = await claimDaily({
    userId: message.author.id,
    guildId: message.guildId,
    username: message.author.username
  });

  if (!result.claimed) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffb347)
          .setTitle("🕒 Daily Already Claimed")
          .setDescription(
            [
              "You already claimed today's daily reward.",
              `🔥 Streak: **${result.streak}**`,
              `⏱ Next daily: <t:${nextUtcResetUnix()}:R>`
            ].join("\n")
          )
      ]
    });
    return;
  }

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x15ff00)
        .setTitle("🎁 Daily Claimed")
        .setDescription(
          [
            `✨ You received **${result.coins} Sui Coins**`,
            `📚 XP gained: **${result.xp}**`,
            `🔥 Daily streak: **${result.streak}**`,
            `⏱ Next daily: <t:${nextUtcResetUnix()}:R>`
          ].join("\n")
        )
    ]
  });
}

async function runQuests({ message }: PrefixContext) {
  const quests = await getQuestBoard(message.author.id, message.guildId, message.author.username);
  const daily = quests.filter((q: any) => q.type === "daily");
  const weekly = quests.filter((q: any) => q.type === "weekly");
  const format = (rows: any[]) =>
    rows
      .map(
        (q, i) =>
          `**${i + 1}. ${q.title}**\n` +
          `\`▸ Reward:\` **${q.rewardXP} XP + ${q.rewardCoins} coins**\n` +
          `\`▸ Progress:\` **[${q.progress}/${q.target}]** ${q.completed ? "✅" : ""}`
      )
      .join("\n\n") || "None";

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5b8cff)
        .setAuthor({
          name: `${message.author.displayName}'s Quest Log`,
          iconURL: message.author.displayAvatarURL()
        })
        .setDescription(`These quests belong to ${message.author}`)
        .addFields({ name: "🗓 Daily Quests", value: format(daily) }, { name: "📆 Weekly Quests", value: format(weekly) })
        .setFooter({ text: "Quest progress updates automatically when you use commands." })
    ]
  });
}

async function runLeaderboard({ message }: PrefixContext) {
  if (!message.guildId) {
    await message.reply("Use in a server.");
    return;
  }
  const rows = await getLeaderboard(message.guildId, 10);
  const text =
    rows.map((row: any, i: number) => `**${i + 1}.** <@${row.userId}> • Lv ${row.level} • ${row.xp} XP`).join("\n") ||
    "No data yet.";
  await message.reply({ embeds: [new EmbedBuilder().setColor(0x00aeff).setTitle("Leaderboard").setDescription(text)] });
}

async function runShop({ message }: PrefixContext) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("CoCo-sui Shop")
        .setDescription("XP Boost 2x (30m): 450 coins\nXP Boost 1.5x (1h): 700 coins\nCoin Boost 1.5x (1h): 600 coins")
    ]
  });
}

async function runRelationshipShop({ message }: PrefixContext) {
  const items = getRelationshipItemDefs();
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf72585)
        .setTitle("Relationship Shop")
        .setDescription(
          items
            .map((i) => `**${i.name}** (\`${i.code}\`)\n${i.description}\nPrice: \`${i.price} coins\``)
            .join("\n\n")
        )
        .setFooter({ text: "Use relationshipbuy <item> [quantity] to purchase." })
    ]
  });
}

async function runRelationshipInventory({ message }: PrefixContext) {
  const inv = await getRelationshipInventory(message.author.id);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf72585)
        .setTitle("Relationship Inventory")
        .setDescription(
          inv.length > 0
            ? inv.map((i: any) => `• **${i.item?.name ?? i.itemCode}** x${i.quantity} (\`${i.itemCode}\`)`).join("\n")
            : "No relationship items in inventory."
        )
        .setFooter({ text: "Use relationshipuse <item> to activate an item." })
    ]
  });
}

async function runRelationshipBuy({ message, args }: PrefixContext) {
  const itemCode = (args[0] ?? "").toLowerCase() as RelationshipItemCode;
  const quantity = Number.parseInt(args[1] ?? "1", 10);
  if (!itemCode) {
    await message.reply("Usage: relationshipbuy <double_date_pass|bond_bloom|streak_shield> [quantity]");
    return;
  }
  const result = await buyRelationshipItem({
    userId: message.author.id,
    guildId: message.guildId,
    itemCode,
    quantity: Number.isFinite(quantity) ? quantity : 1
  });
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x15ff00)
        .setTitle("Purchase Successful")
        .setDescription(`Bought: **${result.item.name}** x${result.quantity}\nCost: \`${result.totalCost} coins\``)
    ]
  });
}

async function runRelationshipUse({ message, args }: PrefixContext) {
  const itemCode = (args[0] ?? "").toLowerCase() as RelationshipItemCode;
  if (!itemCode) {
    await message.reply("Usage: relationshipuse <double_date_pass|bond_bloom|streak_shield>");
    return;
  }
  const result = await useRelationshipItem({
    userId: message.author.id,
    guildId: message.guildId,
    itemCode
  });
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x15ff00)
        .setTitle("Item Activated")
        .setDescription(`**${result.item.name}** used.\n${result.effectText}`)
    ]
  });
}

function getCommandSuggestions(input: string) {
  const q = input.toLowerCase();
  const starts = ALL_PREFIX_COMMANDS.filter((cmd) => cmd.startsWith(q));
  if (starts.length > 0) return starts.slice(0, 5);

  const includes = ALL_PREFIX_COMMANDS.filter((cmd) => cmd.includes(q));
  return includes.slice(0, 5);
}

export async function handlePrefixCommand(message: Message) {
  if (!message.guildId || message.author.bot) {
    return;
  }

  const prefix = await getGuildPrefix(message.guildId);
  const botId = message.client.user?.id;
  const mentionPrefixes = botId ? [`<@${botId}>`, `<@!${botId}>`] : [];

  let withoutPrefix = "";
  let displayPrefix = prefix;

  if (message.content.startsWith(prefix)) {
    withoutPrefix = message.content.slice(prefix.length).trim();
    displayPrefix = prefix;
  } else {
    const matchedMention = mentionPrefixes.find((m) => message.content.startsWith(m));
    if (!matchedMention) {
      return;
    }
    withoutPrefix = message.content.slice(matchedMention.length).trim();
    displayPrefix = `${matchedMention} `;
  }

  if (!withoutPrefix) {
    return;
  }

  const [commandRaw, ...args] = withoutPrefix.split(/\s+/);
  const parsedCommand = (commandRaw ?? "").toLowerCase();
  const command = prefixAliasMap[parsedCommand] ?? parsedCommand;
  const ctx: PrefixContext = { message, command, args };

  try {
    switch (ctx.command) {
      case "ping":
        await runPing(ctx);
        return;
      case "shiprate":
        await runShipRate(ctx);
        return;
      case "eightball":
        await runEightBall(ctx);
        return;
      case "gay":
        await runGay(ctx);
        return;
      case "insult":
        await runInsult(ctx);
        return;
      case "say":
        await runSay(ctx);
        return;
      case "dog":
        await runDog(ctx);
        return;
      case "cat":
        await runCat(ctx);
        return;
      case "poke":
        await runPoke(ctx);
        return;
      case "hug":
        await runActionGif(ctx.message, {
          gifType: "hug",
          text: (a, b) => `${a} hugs ${b} ~~ awiee!`,
          partnerBondAction: "hug"
        });
        return;
      case "pat":
        await runActionGif(ctx.message, {
          gifType: "pat",
          text: (a, b) => `${a} pats ${b} ~~ awiee!`,
          partnerBondAction: "pat"
        });
        return;
      case "kiss":
        await runActionGif(ctx.message, {
          gifType: "kiss",
          text: (a, b) => `${a} kisses ${b} ~ cute`,
          partnerBondAction: "kiss"
        });
        return;
      case "cuddle":
        await runActionGif(ctx.message, {
          gifType: "cuddle",
          text: (a, b) => `${a} cuddles ${b} ~ kyaaa!`,
          partnerBondAction: "cuddle"
        });
        return;
      case "slap":
        await runActionGif(ctx.message, {
          gifType: "slap",
          text: (a, b) => `${a} slaps ${b} ~ baakaah`
        });
        return;
      case "highfive":
        await runActionGif(ctx.message, {
          gifType: "highfive",
          text: (a, b) => `${a} high fives ${b} ~ yoshh!`
        });
        return;
      case "bonk":
        await runActionGif(ctx.message, {
          gifType: "bonk",
          text: (a, b) => `${a} bonks ${b} ~ >.<`
        });
        return;
      case "tickle":
        await runActionGif(ctx.message, {
          gifType: "tickle",
          text: (a, b) => `${a} tickles ${b} ~_~`
        });
        return;
      case "wink":
        await runActionGif(ctx.message, {
          gifType: "wink",
          text: (a, b) => `${a} winks at ${b} ~ uwu`
        });
        return;
      case "owo":
        await runOwo(ctx);
        return;
      case "dare":
      case "truth":
      case "wyr":
      case "nhie":
        await runTod(ctx);
        return;
      case "urban":
        await runUrban(ctx);
        return;
      case "rps":
        await runRps(ctx);
        return;
      case "avatar":
        await runAvatar(ctx);
        return;
      case "serverav":
        await runServerAvatar(ctx);
        return;
      case "banner":
        await runBanner(ctx);
        return;
      case "userinfo":
        await runUserInfo(ctx);
        return;
      case "serverinfo":
        await runServerInfo(ctx);
        return;
      case "users":
        await runUsers(ctx);
        return;
      case "enlarge":
        await runEnlarge(ctx);
        return;
      case "splitimg":
        await runSplitImg(ctx);
        return;
      case "multipfp":
        await runMultiPfp(ctx);
        return;
      case "afk":
        await runAfk(ctx);
        return;
      case "prefix":
        await runPrefix(ctx);
        return;
      case "config":
        await runConfig(ctx);
        return;
      case "help":
        await runHelp(ctx);
        return;
      case "family":
        await runFamily(ctx);
        return;
      case "marry":
        await runFamily(asFamilyCtx(ctx, "marry"));
        return;
      case "divorce":
        await runFamily(asFamilyCtx(ctx, "divorce"));
        return;
      case "partner":
        await runFamily(asFamilyCtx(ctx, "partner"));
        return;
      case "date":
        await runFamily(asFamilyCtx(ctx, "date"));
        return;
      case "familysim":
        await runFamily(asFamilyCtx(ctx, "familysim"));
        return;
      case "familysimstats":
        await runFamily(asFamilyCtx(ctx, "familysimstats"));
        return;
      case "familysimmilestones":
        await runFamily(asFamilyCtx(ctx, "familysimmilestones"));
        return;
      case "familysimladder":
        await runFamily(asFamilyCtx(ctx, "familysimladder"));
        return;
      case "familysimduel":
        await runFamily(asFamilyCtx(ctx, "familysimduel"));
        return;
      case "familysimduelhistory":
        await runFamily(asFamilyCtx(ctx, "familysimduelhistory"));
        return;
      case "familysimseason":
        await runFamily(asFamilyCtx(ctx, "familysimseason"));
        return;
      case "familysimseasonclaim":
        await runFamily(asFamilyCtx(ctx, "familysimseasonclaim"));
        return;
      case "familysimseasonstart":
        await runFamily(asFamilyCtx(ctx, "familysimseasonstart"));
        return;
      case "familysimseasonend":
        await runFamily(asFamilyCtx(ctx, "familysimseasonend"));
        return;
      case "familysimladderreset":
        await runFamily(asFamilyCtx(ctx, "familysimladderreset"));
        return;
      case "familysimladderrecompute":
        await runFamily(asFamilyCtx(ctx, "familysimladderrecompute"));
        return;
      case "familysimaudit":
        await runFamily(asFamilyCtx(ctx, "familysimaudit"));
        return;
      case "familysimadminpanel":
        await runFamily(asFamilyCtx(ctx, "familysimadminpanel"));
        return;
      case "familysimpenaltyclear":
        await runFamily(asFamilyCtx(ctx, "familysimpenaltyclear"));
        return;
      case "familysimpanel":
        await runFamily(asFamilyCtx(ctx, "familysimpanel"));
        return;
      case "anniversary":
        await runFamily(asFamilyCtx(ctx, "anniversary"));
        return;
      case "anniversaryclaim":
        await runFamily(asFamilyCtx(ctx, "anniversaryclaim"));
        return;
      case "familyevent":
        await runFamily(asFamilyCtx(ctx, "familyevent"));
        return;
      case "familyprofile":
        await runFamily(asFamilyCtx(ctx, "profile"));
        return;
      case "siblings":
        await runFamily(asFamilyCtx(ctx, "siblings"));
        return;
      case "siblingadd":
        await runFamily(asFamilyCtx(ctx, "siblingadd"));
        return;
      case "siblingremove":
        await runFamily(asFamilyCtx(ctx, "siblingremove"));
        return;
      case "coupleleaderboard":
        await runFamily(asFamilyCtx(ctx, "coupleleaderboard"));
        return;
      case "familyleaderboard":
        await runFamily(asFamilyCtx(ctx, "leaderboard"));
        return;
      case "bondstatus":
        await runFamily(asFamilyCtx(ctx, "bondstatus"));
        return;
      case "familyquests":
        await runFamily(asFamilyCtx(ctx, "familyquests"));
        return;
      case "familyachievements":
        await runFamily(asFamilyCtx(ctx, "familyachievements"));
        return;
      case "familyachieveclaim":
        await runFamily(asFamilyCtx(ctx, "familyachieveclaim"));
        return;
      case "profile":
        await runProfile(ctx);
        return;
      case "daily":
        await runDaily(ctx);
        return;
      case "quests":
        await runQuests(ctx);
        return;
      case "leaderboard":
        await runLeaderboard(ctx);
        return;
      case "shop":
        await runShop(ctx);
        return;
      case "relationshipshop":
        await runRelationshipShop(ctx);
        return;
      case "relationshipinventory":
        await runRelationshipInventory(ctx);
        return;
      case "relationshipbuy":
        await runRelationshipBuy(ctx);
        return;
      case "relationshipuse":
        await runRelationshipUse(ctx);
        return;
      case "triggered":
        await runTriggered(ctx);
        return;
      case "rip":
        await runRip(ctx);
        return;
      case "tweet":
        await runTweet(ctx);
        return;
      case "quote":
        await runQuote(ctx);
        return;
      case "eject":
        await runEject(ctx);
        return;
      case "friendship":
        await runFriendship(ctx);
        return;
      case "demotivational":
        await runDemotivational(ctx);
        return;
      case "thisisspotify":
        await runThisIsSpotify(ctx);
        return;
      case "spotifynp":
        await runSpotifyNp(ctx);
        return;
      case "uk07":
        await runUk07(ctx);
        return;
      case "petpet":
        await runPetPet(ctx);
        return;
      case "simp":
        await runSimp(ctx);
        return;
      case "avsplit":
        await runAvSplit(ctx);
        return;
      case "achievement":
      case "bartchalkboard":
      case "changemymind":
      case "lisapresentation":
      case "jimwhiteboard":
        await runImageTextGenerator(ctx);
        return;
      default:
        if (OVERLAY_TYPE_SET.has(ctx.command)) {
          await runOverlay(ctx);
          return;
        }

        const suggestions = getCommandSuggestions(ctx.command);
        const suggestionText =
          suggestions.length > 0
            ? suggestions.map((name) => `\`${displayPrefix}${name}\``).join(", ")
            : "Try `help` to see all commands.";

        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffb347)
              .setTitle("Unknown Prefix Command")
              .setDescription(
                `I couldn't find \`${displayPrefix}${ctx.command}\`.\n` +
                  `Use \`${displayPrefix}help\` or \`/help\` for categories.`
              )
              .addFields({
                name: "Did You Mean",
                value: suggestionText
              })
          ]
        });
        return;
    }
  } catch (error) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle("Command Failed")
          .setDescription(
            error instanceof Error
              ? error.message
              : "Something went wrong while running that command."
          )
          .addFields({
            name: "Tip",
            value: `Try \`${displayPrefix}help\` or \`/help\` for proper command usage.`
          })
      ]
    });
  }
}
