import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import type { SlashCommand } from "../types/command.js";
import {
  awardDateInteraction,
  awardFamilySimulationInteraction,
  awardFamilySimulationDuel,
  adminForceEndFamilySimulationSeason,
  adminForceStartFamilySimulationSeason,
  adminRecomputeFamilySimulationLadder,
  adminResetFamilySimulationLadder,
  adminClearFamilyPenaltyFlags,
  buildFamilySimulationDuelHistoryEmbed,
  buildFamilySimulationDuelResultEmbed,
  buildFamilySimulationAdminResultEmbed,
  buildFamilySimulationAdminPanelEmbed,
  buildFamilySimulationAdminPanelComponents,
  buildFamilySimulationLadderEmbed,
  buildFamilyModerationAuditEmbed,
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
  getFamilySettings,
  getFamilyQuestBoard,
  getFamilyAchievements,
  getFamilySimulationAnalytics,
  getFamilySimulationLadder,
  getFamilySimulationDuelHistory,
  getFamilyModerationAudit,
  getFamilySimulationSeasonOverview,
  claimFamilySimulationSeasonRewards,
  getFamilySimulationMilestoneBoard,
  buildFamilyQuestClaimComponents,
  scheduleProposalTimeout,
  getTopFamilyLeaderboard,
  removeSibling
} from "../lib/family.js";
import { getCurrentFamilyEvent } from "../lib/family-events.js";
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
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.deferReply();
    const proposal = await createProposal({
      type: "PARTNER",
      from: interaction.user,
      to: target,
      guildId: interaction.guildId
    });
    await interaction.editReply({
      content: `${target}, you have a new proposal.`,
      ...buildProposalMessage({
        proposalId: proposal.id,
        type: "PARTNER",
        from: interaction.user,
        to: target,
        expiresAt: proposal.expiresAt
      })
    });
    const sent = await interaction.fetchReply();
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
    await interaction.deferReply();
    const payload = await buildFamilyPanelPayload(
      interaction.user,
      interaction.user.id,
      "partner"
    );
    await interaction.editReply(payload);
  }
};

const dateCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("date").setDescription("Go on a date with your partner."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    await interaction.deferReply();
    const result = await awardDateInteraction({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      username: interaction.user.username
    });
    const profile = await getFamilyProfile(interaction.user.id);
    const totalDates = profile.partner?.totalDates ?? 0;
    const uwuScore = profile.partner?.bondScore ?? result.rewards.bondScore;
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(
            [
              `💰 | ${interaction.user}, Here is your daily for your date \`${result.rewards.coins}\``,
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
  }
};

const familySimCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("familysim").setDescription("Run a family simulation with your partner."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    await interaction.deferReply();
    const result = await awardFamilySimulationInteraction({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      username: interaction.user.username
    });
    await interaction.editReply({
      embeds: [buildFamilySimulationResultEmbed(result, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimStatsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimstats")
    .setDescription("View family simulation analytics and recent outcomes."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    await interaction.deferReply();
    const stats = await getFamilySimulationAnalytics(interaction.user.id);
    await interaction.editReply({
      embeds: [buildFamilySimulationStatsEmbed(stats, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimMilestonesCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimmilestones")
    .setDescription("View simulation milestone progress and rewards."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    await interaction.deferReply();
    const board = await getFamilySimulationMilestoneBoard(interaction.user.id);
    await interaction.editReply({
      embeds: [buildFamilySimulationMilestonesEmbed(board, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimLadderCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimladder")
    .setDescription("View weekly seasonal simulation ladder."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    await interaction.deferReply();
    const ladder = await getFamilySimulationLadder({ userId: interaction.user.id, limit: 10 });
    await interaction.editReply({
      embeds: [buildFamilySimulationLadderEmbed(ladder, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimDuelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimduel")
    .setDescription("Duel another active couple in simulation ladder.")
    .addUserOption((o) => o.setName("user").setDescription("A member of target couple").setRequired(true)),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    const target = interaction.options.getUser("user", true);
    const duel = await awardFamilySimulationDuel({
      userId: interaction.user.id,
      opponentUserId: target.id,
      guildId: interaction.guildId,
      username: interaction.user.username
    });
    await interaction.reply({
      embeds: [buildFamilySimulationDuelResultEmbed(duel, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimDuelHistoryCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimduelhistory")
    .setDescription("View recent simulation duel history."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    const history = await getFamilySimulationDuelHistory({ userId: interaction.user.id, limit: 10 });
    await interaction.reply({
      embeds: [buildFamilySimulationDuelHistoryEmbed(history, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimSeasonCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimseason")
    .setDescription("View current simulation season overview."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    const season = await getFamilySimulationSeasonOverview({ userId: interaction.user.id, limit: 10 });
    await interaction.reply({
      embeds: [buildFamilySimulationSeasonOverviewEmbed(season, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimSeasonClaimCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimseasonclaim")
    .setDescription("Claim previous season simulation rewards."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    const claim = await claimFamilySimulationSeasonRewards({
      userId: interaction.user.id,
      guildId: interaction.guildId
    });
    await interaction.reply({
      embeds: [buildFamilySimulationSeasonClaimEmbed(claim, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
    });
  }
};

const familySimSeasonStartAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimseasonstart")
    .setDescription("Admin: force start/reset simulation season.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("season_key").setDescription("Optional manual season key (e.g., 2026-W12)")),
  async execute(interaction) {
    const seasonKey = interaction.options.getString("season_key") ?? undefined;
    const result = await adminForceStartFamilySimulationSeason({
      adminUserId: interaction.user.id,
      guildId: interaction.guildId,
      seasonKey
    });
    await interaction.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: interaction.user,
          title: "✅ Season Force Started",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "All active couples were moved into this season with ladder reset to fresh."
        })
      ]
    });
  }
};

const familySimSeasonEndAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimseasonend")
    .setDescription("Admin: force end current simulation season.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("season_key").setDescription("Optional key to archive as ended season")),
  async execute(interaction) {
    const seasonKey = interaction.options.getString("season_key") ?? undefined;
    const result = await adminForceEndFamilySimulationSeason({
      adminUserId: interaction.user.id,
      guildId: interaction.guildId,
      seasonKey
    });
    await interaction.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: interaction.user,
          title: "🛑 Season Force Ended",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "Couples were shifted off active week key so rewards can be claimable immediately."
        })
      ]
    });
  }
};

const familySimLadderResetAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimladderreset")
    .setDescription("Admin: reset simulation ladder points.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("season_key").setDescription("Optional season key to reset under")),
  async execute(interaction) {
    const seasonKey = interaction.options.getString("season_key") ?? undefined;
    const result = await adminResetFamilySimulationLadder({
      adminUserId: interaction.user.id,
      guildId: interaction.guildId,
      seasonKey
    });
    await interaction.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: interaction.user,
          title: "♻️ Ladder Reset Complete",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "Points/tier/reward-mask were reset for all active couples."
        })
      ]
    });
  }
};

const familySimLadderRecomputeAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimladderrecompute")
    .setDescription("Admin: recompute ladder tiers from current points.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("season_key").setDescription("Optional season key to recompute under")),
  async execute(interaction) {
    const seasonKey = interaction.options.getString("season_key") ?? undefined;
    const result = await adminRecomputeFamilySimulationLadder({
      adminUserId: interaction.user.id,
      guildId: interaction.guildId,
      seasonKey
    });
    await interaction.reply({
      embeds: [
        buildFamilySimulationAdminResultEmbed({
          user: interaction.user,
          title: "🧮 Ladder Recomputed",
          seasonKey: result.seasonKey,
          touched: result.touched,
          note: "Tier buckets were recomputed from current season points."
        })
      ]
    });
  }
};

const familySimModerationAuditCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimaudit")
    .setDescription("Admin: view simulation anti-abuse logs and active flags.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) =>
      o.setName("limit").setDescription("How many rows to show (1-25)").setMinValue(1).setMaxValue(25)
    ),
  async execute(interaction) {
    const limit = interaction.options.getInteger("limit") ?? 10;
    const audit = await getFamilyModerationAudit({ guildId: interaction.guildId, limit });
    if (!audit.supported) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Audit tables are not available yet. Run Prisma push/migrate first.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.reply({
      embeds: [buildFamilyModerationAuditEmbed(audit, interaction.user)],
      flags: MessageFlags.Ephemeral
    });
  }
};

const familySimPenaltyClearCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimpenaltyclear")
    .setDescription("Admin: clear active anti-abuse penalty flags.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("flag_id").setDescription("Specific penalty flag id"))
    .addUserOption((o) => o.setName("user").setDescription("Clear all active flags for this user"))
    .addStringOption((o) => o.setName("relationship_id").setDescription("Clear by relationship id"))
    .addBooleanOption((o) => o.setName("all").setDescription("Clear all active flags in this guild")),
  async execute(interaction) {
    const flagId = interaction.options.getString("flag_id") ?? undefined;
    const userId = interaction.options.getUser("user")?.id;
    const relationshipId = interaction.options.getString("relationship_id") ?? undefined;
    const clearAll = interaction.options.getBoolean("all") ?? false;
    const filterOk = clearAll || flagId || userId || relationshipId;
    if (!filterOk) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Provide a target: `all`, `flag_id`, `user`, or `relationship_id`.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const modalId = `familysimpenaltyclear:${flagId ?? "-"}:${userId ?? "-"}:${relationshipId ?? "-"}:${clearAll ? "1" : "0"}`;
    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle("Clear Penalty Flags");
    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(120)
      .setPlaceholder("Why are you clearing these penalties?");
    const noteInput = new TextInputBuilder()
      .setCustomId("note")
      .setLabel("Note (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500)
      .setPlaceholder("Extra moderation context (optional)");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(noteInput)
    );
    await interaction.showModal(modal);

    let submitted;
    try {
      submitted = await interaction.awaitModalSubmit({
        time: 120_000,
        filter: (i) => i.customId === modalId && i.user.id === interaction.user.id
      });
    } catch {
      return;
    }

    const reason = submitted.fields.getTextInputValue("reason")?.trim() || "No reason provided";
    const note = submitted.fields.getTextInputValue("note")?.trim() || null;
    await submitted.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await adminClearFamilyPenaltyFlags({
      adminUserId: interaction.user.id,
      guildId: interaction.guildId,
      flagId,
      userId,
      relationshipId,
      clearAll,
      reason,
      note
    });
    if (!result.supported) {
      await submitted.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("Penalty tables are not available yet. Run Prisma push/migrate first.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
      return;
    }
    await submitted.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("🧹 Penalty Flags Cleared")
          .setDescription(
            [
              `Cleared: **${result.cleared}**`,
              `Matched: **${result.matched}**`,
              `Auto-Resolved: **${result.autoResolved ?? 0}**`,
              `Reason: **${reason}**`,
              note ? `Note: ${note}` : null
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

const familySimAdminPanelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimadminpanel")
    .setDescription("Admin: open simulation operations panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.reply({
      embeds: [buildFamilySimulationAdminPanelEmbed(interaction.user)],
      components: buildFamilySimulationAdminPanelComponents(interaction.user.id),
      flags: MessageFlags.Ephemeral
    });
  }
};

const familySimPanelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familysimpanel")
    .setDescription("Open interactive family simulation control panel."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    await interaction.deferReply();
    const stats = await getFamilySimulationAnalytics(interaction.user.id);
    await interaction.editReply({
      embeds: [buildFamilySimulationRecentEmbed(stats, interaction.user)],
      components: buildFamilySimulationPanelComponents(interaction.user.id)
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
        flags: MessageFlags.Ephemeral
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

const anniversaryClaimCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("anniversaryclaim").setDescription("Claim monthly anniversary rewards."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    ensureMarriageEnabledOrThrow(settings);
    const result = await claimAnniversaryReward({
      userId: interaction.user.id,
      guildId: interaction.guildId
    });
    await interaction.reply({
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
  }
};

const familyEventCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("familyevent").setDescription("View this week's active family event."),
  async execute(interaction) {
    const event = getCurrentFamilyEvent();
    await interaction.reply({
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
    await interaction.deferReply();
    const target = interaction.options.getUser("user") ?? interaction.user;
    const payload = await buildFamilyPanelPayload(
      target,
      interaction.user.id,
      "overview"
    );
    await interaction.editReply(payload);
  }
};

const siblingsCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("siblings").setDescription("View your sibling list."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    await interaction.deferReply();
    const payload = await buildFamilyPanelPayload(
      interaction.user,
      interaction.user.id,
      "siblings"
    );
    await interaction.editReply(payload);
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
    await interaction.deferReply();
    const target = interaction.options.getUser("user", true);
    const proposal = await createProposal({
      type: "SIBLING",
      from: interaction.user,
      to: target,
      guildId: interaction.guildId
    });
    await interaction.editReply({
      content: `${target}, you got a sibling request.`,
      ...buildProposalMessage({
        proposalId: proposal.id,
        type: "SIBLING",
        from: interaction.user,
        to: target,
        expiresAt: proposal.expiresAt
      })
    });
    const sent = await interaction.fetchReply();
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
    await interaction.deferReply();
    const target = interaction.options.getUser("user", true);
    await removeSibling(interaction.user.id, target.id);
    await interaction.editReply({
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
    await interaction.deferReply();
    const rows = await getCoupleLeaderboard(10);
    await interaction.editReply({
      embeds: [buildCoupleLeaderboardEmbed(rows)]
    });
  }
};

const familyLeaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("familyleaderboard").setDescription("Top family profiles by total bond score."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    await interaction.deferReply();
    const rows = await getTopFamilyLeaderboard(10);
    await interaction.editReply({
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
        flags: MessageFlags.Ephemeral
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

const familyQuestsCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("familyquests").setDescription("View your family relationship quests."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    await interaction.deferReply();

    const board = await getFamilyQuestBoard(interaction.user.id, interaction.guildId);
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

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${interaction.user.displayName}'s Family Quest Log`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setDescription(
            [
              `These quests belong to ${interaction.user}.`,
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
      components: buildFamilyQuestClaimComponents(interaction.user.id)
    });
  }
};

const familyAchievementsCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("familyachievements").setDescription("View permanent family achievements."),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    await interaction.deferReply();
    const board = await getFamilyAchievements(interaction.user.id, interaction.guildId);
    const fmt = (rows: Array<{ title: string; progress: number; target: number; rewardXp: number; rewardCoins: number; rewardBondXp: number; completed: boolean; claimed: boolean }>) =>
      rows
        .map((a, i) =>
          [
            `${i + 1}. ${a.claimed ? "🏆" : a.completed ? "✅" : "▫️"} ${a.title}`,
            `▸ Reward: \`${a.rewardXp} XP\` • \`${a.rewardCoins} coins\` • \`${a.rewardBondXp} bond XP\``,
            `▸ Progress: \`[${Math.min(a.progress, a.target)}/${a.target}]\` ${a.claimed ? "• `CLAIMED`" : ""}`
          ].join("\n")
        )
        .join("\n\n");
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setAuthor({
            name: `${interaction.user.displayName}'s Family Achievements`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setDescription(`Unlocked: **${board.unlocked}/${board.total}**`)
          .addFields({ name: "🏆 Achievement Board", value: fmt(board.achievements) || "No achievements yet." })
          .setFooter({ text: "Permanent milestones. Claim once forever." })
      ],
      components: buildFamilyAchievementClaimComponents(interaction.user.id)
    });
  }
};

const familyAchieveClaimCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("familyachieveclaim")
    .setDescription("Claim completed family achievements.")
    .addStringOption((o) => o.setName("key").setDescription("Specific achievement key")),
  async execute(interaction) {
    const settings = await getFamilySettings(interaction.guildId);
    ensureFamilyEnabledOrThrow(settings);
    const key = interaction.options.getString("key") ?? undefined;
    const result = await claimFamilyAchievementRewards({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      key
    });
    if (result.claimed.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription("No completed unclaimed achievements found.")
            .setFooter({ text: "Team Tatsui ❤️" })
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.reply({
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
  }
};

export const familyCommands: SlashCommand[] = [
  marryCommand,
  divorceCommand,
  partnerCommand,
  dateCommand,
  familySimCommand,
  familySimStatsCommand,
  familySimMilestonesCommand,
  familySimLadderCommand,
  familySimDuelCommand,
  familySimDuelHistoryCommand,
  familySimSeasonCommand,
  familySimSeasonClaimCommand,
  familySimSeasonStartAdminCommand,
  familySimSeasonEndAdminCommand,
  familySimLadderResetAdminCommand,
  familySimLadderRecomputeAdminCommand,
  familySimModerationAuditCommand,
  familySimPenaltyClearCommand,
  familySimAdminPanelCommand,
  familySimPanelCommand,
  anniversaryCommand,
  anniversaryClaimCommand,
  familyEventCommand,
  familyProfileCommand,
  siblingsCommand,
  siblingAddCommand,
  siblingRemoveCommand,
  coupleLeaderboardCommand,
  familyLeaderboardCommand,
  bondStatusCommand,
  familyQuestsCommand
  ,
  familyAchievementsCommand,
  familyAchieveClaimCommand
];
