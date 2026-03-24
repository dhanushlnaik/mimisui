import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
import type { SlashCommand } from "../types/command.js";

export const serverInfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server information"),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command works in servers only.", ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setColor(C_MAIN)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 512 }) ?? null)
      .addFields(
        { name: "Server ID", value: guild.id, inline: false },
        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "Members", value: String(guild.memberCount), inline: true },
        { name: "Roles", value: String(guild.roles.cache.size), inline: true },
        { name: "Emojis", value: String(guild.emojis.cache.size), inline: true },
        { name: "Channels", value: String(guild.channels.cache.size), inline: true },
        { name: "Verification", value: String(guild.verificationLevel), inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
