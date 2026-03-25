import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import {
  awardDateInteraction,
  buildProposalMessage,
  createProposal,
  endPartnerRelationship,
  ensureFamilyEnabledOrThrow,
  ensureMarriageEnabledOrThrow,
  ensureSiblingsEnabledOrThrow,
  getBondStatus,
  getCoupleLeaderboard,
  getFamilyProfile,
  getFamilySettings,
  scheduleProposalTimeout,
  getTopFamilyLeaderboard,
  removeSibling
} from "../lib/family.js";
import {
  buildCoupleLeaderboardEmbed,
  buildFamilyLeaderboardEmbed,
  buildFamilyPanelPayload,
  buildMarriageStatusEmbed
} from "../lib/family-ui.js";

function daysSince(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

const COUPLE_IMAGE = "https://i.gifer.com/ZdPB.gif";

const marryCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Send a marriage proposal.")
    .addUserOption((o) => o.setName("user").setDescription("User to marry")),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);

    const target = interaction.options.getUser("user");
    if (!target) {
      const profile = await getFamilyProfile(interaction.user.id);
      await interaction.reply({
        embeds: [buildMarriageStatusEmbed(interaction.user, profile, "/")]
      });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setAuthor({ name: "Sheesh!", iconURL: interaction.user.displayAvatarURL() })
            .setDescription("> You Can't Marry Yourself Dumbo!\n**__Usage__:**\n`/marry @user`")
            .setImage("https://c.tenor.com/mW-BeHkDVKEAAAAC/monsters-inc-pixar.gif")
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        ephemeral: true
      });
      return;
    }
    if (target.bot) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("BRUH!! You can't make a bot your partner!!")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        ephemeral: true
      });
      return;
    }
    const [selfProfile, targetProfile, bond] = await Promise.all([
      getFamilyProfile(interaction.user.id),
      getFamilyProfile(target.id),
      getBondStatus(interaction.user.id, target.id)
    ]);
    if (bond?.type === "SIBLING") {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setAuthor({
              name: "Wha-! You Wanna Marry Your Sibling?",
              iconURL: interaction.user.displayAvatarURL()
            })
            .setDescription("> You Can't Marry Your Sibling !!\nI mean u can- But my dev won't allow it.\n**__Usage__:**\n`/marry @user`")
            .setImage("https://c.tenor.com/wuupKv_VikQAAAAC/sweet-home-alabama.gif")
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        ephemeral: true
      });
      return;
    }
    if (selfProfile.partner || targetProfile.partner) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(`:no_entry_sign: | **${interaction.user.username}** , you or your friend is already married!`)
            .setTimestamp(new Date())
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        ephemeral: true
      });
      return;
    }
    const proposal = await createProposal({
      type: "PARTNER",
      from: interaction.user,
      to: target,
      guildId: interaction.guildId
    });
    const sent = await interaction.reply({
      content: `${target}, you have a new proposal.`,
      ...buildProposalMessage({
        proposalId: proposal.id,
        type: "PARTNER",
        from: interaction.user,
        to: target,
        expiresAt: proposal.expiresAt
      }),
      fetchReply: true
    });
    if (interaction.channelId) {
      scheduleProposalTimeout({
        client: interaction.client,
        proposalId: proposal.id,
        channelId: interaction.channelId,
        messageId: sent.id,
        expiresAt: proposal.expiresAt
      });
    }
  }
};

const divorceCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("divorce").setDescription("End your active partner relationship."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);

    await endPartnerRelationship(interaction.user.id);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${interaction.user.username}, are you sure you want to divorce?`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setDescription(
            [
              `:broken_heart:  || ${interaction.user}, You have decided to divorce.`
            ].join("\n")
          )
          .setThumbnail(COUPLE_IMAGE)
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

const partnerCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("partner").setDescription("View your active partner bond status."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const payload = await buildFamilyPanelPayload(
      interaction.user,
      interaction.user.id,
      "partner"
    );
    await interaction.reply(payload);
  }
};

const dateCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("date").setDescription("Go on a date with your partner."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    const result = await awardDateInteraction({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      username: interaction.user.username
    });
    const profile = await getFamilyProfile(interaction.user.id);
    const totalDates = profile.partner?.totalDates ?? 0;
    const uwuScore = profile.partner?.bondScore ?? result.rewards.bondScore;
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(
            [
              `💰 | ${interaction.user}, Here is your daily for your date \`${result.rewards.coins}\``,
              `💞 | You've dated ${totalDates} times!`,
              `And Your UwU score is \`${uwuScore}\`! Pretty Good :smirk:`,
              "",
              `*${result.scenario}*`,
              result.rareBonus > 0 ? `✨ Rare bonus: +${result.rareBonus}` : null
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

const anniversaryCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("anniversary").setDescription("View your anniversary and days together."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const profile = await getFamilyProfile(interaction.user.id);
    if (!profile.partner) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setAuthor({ name: "You are not currently married.", iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`${interaction.user.username}, you are not married! Please Marry Someone First! \n Usage : \`/marry @user\``)
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        ephemeral: true
      });
      return;
    }
    const d = new Date(profile.partner.since);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setTitle("💍 Anniversary")
          .setDescription(
            [
              `Partner: <@${profile.partner.userId}>`,
              `Started: <t:${Math.floor(d.getTime() / 1000)}:D>`,
              `Days Together: **${daysSince(d)}**`
            ].join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

const familyProfileCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familyprofile")
    .setDescription("View family profile for yourself or another user.")
    .addUserOption((o) => o.setName("user").setDescription("Target user")),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const target = interaction.options.getUser("user") ?? interaction.user;
    const payload = await buildFamilyPanelPayload(
      target,
      interaction.user.id,
      "overview"
    );
    await interaction.reply(payload);
  }
};

const siblingsCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("siblings").setDescription("View your sibling list."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const payload = await buildFamilyPanelPayload(
      interaction.user,
      interaction.user.id,
      "siblings"
    );
    await interaction.reply(payload);
  }
};

const siblingAddCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("siblingadd")
    .setDescription("Send a sibling request.")
    .addUserOption((o) => o.setName("user").setDescription("User to add as sibling").setRequired(true)),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureSiblingsEnabledOrThrow(settings);
    const target = interaction.options.getUser("user", true);
    const proposal = await createProposal({
      type: "SIBLING",
      from: interaction.user,
      to: target,
      guildId: interaction.guildId
    });
    const sent = await interaction.reply({
      content: `${target}, you got a sibling request.`,
      ...buildProposalMessage({
        proposalId: proposal.id,
        type: "SIBLING",
        from: interaction.user,
        to: target,
        expiresAt: proposal.expiresAt
      }),
      fetchReply: true
    });
    if (interaction.channelId) {
      scheduleProposalTimeout({
        client: interaction.client,
        proposalId: proposal.id,
        channelId: interaction.channelId,
        messageId: sent.id,
        expiresAt: proposal.expiresAt
      });
    }
  }
};

const siblingRemoveCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("siblingremove")
    .setDescription("Remove an active sibling.")
    .addUserOption((o) => o.setName("user").setDescription("Sibling to remove").setRequired(true)),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureSiblingsEnabledOrThrow(settings);
    const target = interaction.options.getUser("user", true);
    await removeSibling(interaction.user.id, target.id);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(`:broken_heart:  || ${interaction.user}, You have decided to disown them as sibling.`)
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

const coupleLeaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("coupleleaderboard").setDescription("Top active couples by bond score."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const rows = await getCoupleLeaderboard(10);
    await interaction.reply({
      embeds: [buildCoupleLeaderboardEmbed(rows)]
    });
  }
};

const familyLeaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("familyleaderboard").setDescription("Top family profiles by total bond score."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const rows = await getTopFamilyLeaderboard(10);
    await interaction.reply({
      embeds: [buildFamilyLeaderboardEmbed(rows)]
    });
  }
};

const bondStatusCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("bondstatus")
    .setDescription("View bond status with a user.")
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true)),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const target = interaction.options.getUser("user", true);
    const status = await getBondStatus(interaction.user.id, target.id);
    if (!status) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(`You have no active relationship with ${target}.`)
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        ephemeral: true
      });
      return;
    }
    const relationLabel = status.type === "PARTNER" ? "Partner" : "Sibling";
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${interaction.user.username}'s Bond with ${target.username}`,
            iconURL: interaction.user.displayAvatarURL()
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
  }
};

export const familyCommands: SlashCommand[] = [
  marryCommand,
  divorceCommand,
  partnerCommand,
  dateCommand,
  anniversaryCommand,
  familyProfileCommand,
  siblingsCommand,
  siblingAddCommand,
  siblingRemoveCommand,
  coupleLeaderboardCommand,
  familyLeaderboardCommand,
  bondStatusCommand
];
