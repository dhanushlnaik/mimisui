import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildCommandHelpMessage, buildHelpMessage } from "../lib/help-view.js";
import type { SlashCommand } from "../types/command.js";

export const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Open interactive help with categories.")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Get detailed help for a specific command or alias")
    ),
  async execute(interaction) {
    const command = interaction.options.getString("command");
    if (command) {
      await interaction.reply({
        embeds: [buildCommandHelpMessage(command)],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      ...buildHelpMessage("overview", interaction.user.id),
      flags: MessageFlags.Ephemeral
    });
  }
};
