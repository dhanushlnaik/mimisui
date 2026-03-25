import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type Client,
  type User
} from "discord.js";
import { logger } from "./logger.js";
import { getFamilyProfile } from "./family.js";
import { getAvatarUrl } from "./user-avatar.js";

export type FamilyPanelSection = "overview" | "partner" | "siblings";

const FAMILY_COLOR = 0xf72585;
const PANEL_PREFIX = "familyui";
const COUPLE_IMAGE = "https://i.gifer.com/ZdPB.gif";
const SIBLING_IMAGE =
  "https://4.bp.blogspot.com/-T2bVs6xiUks/XHeLMCZlvOI/AAAAAAAUQDU/k-8YrZmX5j4S9VOaOULzqtExdduBcfPtQCLcBGAs/s1600/AW3567431_10.gif";

function isUnknownInteractionError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 10062
  );
}

function shortSection(section: FamilyPanelSection) {
  if (section === "overview") return "o";
  if (section === "partner") return "p";
  return "s";
}

function parseSection(code: string): FamilyPanelSection | null {
  if (code === "o") return "overview";
  if (code === "p") return "partner";
  if (code === "s") return "siblings";
  return null;
}

function panelCustomId(section: FamilyPanelSection, targetId: string, controllerId: string) {
  return `${PANEL_PREFIX}:${shortSection(section)}:${targetId}:${controllerId}`;
}

function daysSince(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function familyFooter() {
  return { text: "Team Tatsui ❤️" };
}

function familyButtons(
  section: FamilyPanelSection,
  targetId: string,
  controllerId: string
) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(panelCustomId("overview", targetId, controllerId))
        .setLabel("Overview")
        .setEmoji("🏠")
        .setStyle(section === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(section === "overview"),
      new ButtonBuilder()
        .setCustomId(panelCustomId("partner", targetId, controllerId))
        .setLabel("Partner")
        .setEmoji("💍")
        .setStyle(section === "partner" ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(section === "partner"),
      new ButtonBuilder()
        .setCustomId(panelCustomId("siblings", targetId, controllerId))
        .setLabel("Siblings")
        .setEmoji("🧬")
        .setStyle(section === "siblings" ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(section === "siblings")
    )
  ];
}

function buildOverviewEmbed(
  target: User,
  profile: Awaited<ReturnType<typeof getFamilyProfile>>
) {
  return new EmbedBuilder()
    .setColor(FAMILY_COLOR)
    .setAuthor({
      name: `${target.displayName ?? target.username}'s Family`,
      iconURL: getAvatarUrl(target)
    })
    .setThumbnail(getAvatarUrl(target))
    .setDescription(
      [
        `Nickname: \`${target.displayName ?? target.username}\``,
        `ID: \`${target.id}\``,
        "",
        "Check Family - Select desired family option using the buttons below."
      ].join("\n")
    )
    .setFooter(familyFooter());
}

function buildPartnerEmbed(
  target: User,
  profile: Awaited<ReturnType<typeof getFamilyProfile>>
) {
  const base = new EmbedBuilder()
    .setColor(FAMILY_COLOR)
    .setAuthor({ name: "You are not currently married.", iconURL: getAvatarUrl(target) })
    .setThumbnail(COUPLE_IMAGE)
    .setImage(COUPLE_IMAGE)
    .setTimestamp(new Date())
    .setFooter(familyFooter());

  if (!profile.partner) {
    return base.setDescription(
      `${target.username}, you are not married! Please Marry Someone First! \n Usage : \`/marry @user\``
    );
  }

  const since = new Date(profile.partner.since);
  return base
    .setAuthor({
      name: `${target.username}, you are happily married to ${profile.partner.username ?? "your partner"}`,
      iconURL: getAvatarUrl(target)
    })
    .setDescription(
      [
        `Married since ${since.toDateString()} (${daysSince(since)} days) ! The Perfect Cuple <3 UwU.`,
        `You've dated \`${profile.partner.totalDates}\` times ~Damn!`,
        `> And Your UwU score is \`${profile.partner.bondScore}\`! Pretty Good :smirk:`
      ].join("\n")
    );
}

function buildSiblingsEmbed(
  target: User,
  profile: Awaited<ReturnType<typeof getFamilyProfile>>
) {
  const siblingDesc =
    profile.siblings.length > 0
      ? profile.siblings
          .map(
            (s: { username?: string; userId: string }, i: number) =>
              `\`[${i + 1}] ${s.username ?? s.userId}\``
          )
          .join(" | ")
      : "You have no E-siblings!";
  return new EmbedBuilder()
    .setColor(FAMILY_COLOR)
    .setAuthor({
      name: `${target.displayName ?? target.username}'s Siblings`,
      iconURL: getAvatarUrl(target)
    })
    .setThumbnail(SIBLING_IMAGE)
    .setImage(SIBLING_IMAGE)
    .setDescription(`** Siblings[${profile.siblings.length}] :**\n${siblingDesc}`)
    .setTimestamp(new Date())
    .setFooter(familyFooter());
}

export function buildMarriageStatusEmbed(
  target: User,
  profile: Awaited<ReturnType<typeof getFamilyProfile>>,
  usagePrefix: string
) {
  if (!profile.partner) {
    return new EmbedBuilder()
      .setColor(FAMILY_COLOR)
      .setAuthor({
        name: "You are not currently married.",
        iconURL: getAvatarUrl(target)
      })
      .setDescription(
        `${target.username}, you are not married! Please Marry Someone First! \n Usage : \`${usagePrefix}marry @user\``
      )
      .setTimestamp(new Date())
      .setFooter(familyFooter());
  }

  const since = new Date(profile.partner.since);
  return new EmbedBuilder()
    .setColor(FAMILY_COLOR)
    .setAuthor({
      name: `${target.username}, you are happily married to ${profile.partner.username ?? "your partner"}`,
      iconURL: getAvatarUrl(target)
    })
    .setThumbnail(COUPLE_IMAGE)
    .setImage(COUPLE_IMAGE)
    .setDescription(
      [
        `Married since ${since.toDateString()} (${daysSince(since)} days) ! The Perfect Cuple <3 UwU.`,
        `You've dated \`${profile.partner.totalDates}\` times ~Damn!`,
        `> And Your UwU score is \`${profile.partner.bondScore}\`! Pretty Good :smirk:`
      ].join("\n")
    )
    .setTimestamp(new Date())
    .setFooter(familyFooter());
}

export async function buildFamilyPanelPayload(
  target: User,
  controllerId: string,
  section: FamilyPanelSection
) {
  const profile = await getFamilyProfile(target.id);
  const embed =
    section === "partner"
      ? buildPartnerEmbed(target, profile)
      : section === "siblings"
        ? buildSiblingsEmbed(target, profile)
        : buildOverviewEmbed(target, profile);
  return {
    embeds: [embed],
    components: familyButtons(section, target.id, controllerId)
  };
}

export function buildCoupleLeaderboardEmbed(
  rows: Array<{ userAId: string; userBId: string; bondScore: number; totalDates: number; streak: number }>
) {
  return new EmbedBuilder()
    .setColor(FAMILY_COLOR)
    .setAuthor({ name: "Marriage Leaderboard", iconURL: COUPLE_IMAGE })
    .setDescription(
      rows.length > 0
        ? rows
            .map(
              (r, i) =>
                `\`${i + 1}.\` <@${r.userAId}> ♡ <@${r.userBId}>\n> UwU Score: \`${r.bondScore}\` • Dates: \`${r.totalDates}\` • Streak: \`${r.streak}\``
            )
            .join("\n")
        : "No active couples yet."
    )
    .setThumbnail(COUPLE_IMAGE)
    .setImage(COUPLE_IMAGE)
    .setFooter(familyFooter());
}

export function buildFamilyLeaderboardEmbed(
  rows: Array<{ userId: string; totalBondScore: number; siblingCount: number; hasPartner: boolean }>
) {
  return new EmbedBuilder()
    .setColor(FAMILY_COLOR)
    .setAuthor({ name: "Family Leaderboard" })
    .setDescription(
      rows.length > 0
        ? rows
            .map(
              (r, i) =>
                `\`${i + 1}.\` <@${r.userId}> • UwU Score \`${r.totalBondScore}\` • Siblings \`${r.siblingCount}\` • ${r.hasPartner ? "💍 Married" : "💤 Single"}`
            )
            .join("\n")
        : "No family data yet."
    )
    .setFooter(familyFooter());
}

export async function handleFamilyPanelButton(
  interaction: ButtonInteraction,
  client: Client
) {
  const [prefix, code, targetId, controllerId] = interaction.customId.split(":");
  if (prefix !== PANEL_PREFIX || !code || !targetId || !controllerId) return false;

  const section = parseSection(code);
  if (!section) return false;

  if (interaction.user.id !== controllerId) {
    try {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(FAMILY_COLOR)
            .setDescription("Only the command invoker can control this family panel.")
            .setFooter(familyFooter())
        ],
        ephemeral: true
      });
    } catch (error) {
      if (!isUnknownInteractionError(error)) throw error;
      logger.warn("Ignored stale family panel interaction (10062).");
    }
    return true;
  }

  try {
    const target =
      client.users.cache.get(targetId) ??
      (await client.users.fetch(targetId).catch(() => null));
    if (!target) {
      try {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(FAMILY_COLOR)
              .setDescription("Target user not found for this panel.")
              .setFooter(familyFooter())
          ],
          ephemeral: true
        });
      } catch (error) {
        if (!isUnknownInteractionError(error)) throw error;
        logger.warn("Ignored stale family panel interaction (10062).");
      }
      return true;
    }
    const payload = await buildFamilyPanelPayload(target, controllerId, section);
    try {
      await interaction.update(payload);
    } catch (error) {
      if (!isUnknownInteractionError(error)) throw error;
      logger.warn("Ignored stale family panel interaction update (10062).");
    }
    return true;
  } catch (error) {
    try {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(FAMILY_COLOR)
            .setTitle("Panel Update Failed")
            .setDescription(error instanceof Error ? error.message : "Could not update panel.")
            .setFooter(familyFooter())
        ],
        ephemeral: true
      });
    } catch (replyError) {
      if (!isUnknownInteractionError(replyError)) throw replyError;
      logger.warn("Ignored stale family panel failure reply (10062).");
    }
    return true;
  }
}
