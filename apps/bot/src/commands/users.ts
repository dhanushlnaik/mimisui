import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
import type { SlashCommand } from "../types/command.js";

export const usersCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("users").setDescription("Show total members in server"),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command works in servers only.", ephemeral: true });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(C_MAIN)
          .setTitle("Server Members")
          .setDescription(`Total members: **${interaction.guild.memberCount}**`)
      ]
    });
  }
};
