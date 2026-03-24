import { db } from "@cocosui/db";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";

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
      embeds: [
        new EmbedBuilder()
          .setColor(0xf4b942)
          .setTitle("AFK Enabled")
          .setDescription(`You're now AFK.\n**Reason:** ${reason}`)
      ],
      ephemeral: true
    });
  }
};
