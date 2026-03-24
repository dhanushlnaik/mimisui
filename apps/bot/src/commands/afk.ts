import { db } from "@cocosui/db";
import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command";

export const afkCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Mark yourself as AFK.")
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for being AFK")
        .setRequired(false)
    ),
  async execute(interaction) {
    const reason = interaction.options.getString("reason") ?? "Away";

    await db.discordUser.upsert({
      where: { id: interaction.user.id },
      update: {
        username: interaction.user.username,
        avatar: interaction.user.avatarURL() ?? undefined
      },
      create: {
        id: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.avatarURL() ?? undefined
      }
    });

    await db.aFK.upsert({
      where: { userId: interaction.user.id },
      update: {
        guildId: interaction.guildId ?? "dm",
        reason,
        mentionCount: 0
      },
      create: {
        userId: interaction.user.id,
        guildId: interaction.guildId ?? "dm",
        reason
      }
    });

    await interaction.reply({
      content: `You're AFK now: ${reason}`,
      ephemeral: true
    });
  }
};
