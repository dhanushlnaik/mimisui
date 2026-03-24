import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import { getGuildPrefix, setGuildPrefix } from "../lib/guild-config.js";

export const prefixCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("prefix")
    .setDescription("Get or set the guild prefix")
    .addSubcommand((sub) => sub.setName("get").setDescription("Get current prefix"))
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a new prefix")
        .addStringOption((option) =>
          option.setName("value").setDescription("New prefix").setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command works in a server only.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "get") {
      const prefix = await getGuildPrefix(interaction.guildId);
      await interaction.reply({ content: `Current prefix: \`${prefix}\``, ephemeral: true });
      return;
    }

    const newPrefix = interaction.options.getString("value", true).trim();
    if (newPrefix.length > 5) {
      await interaction.reply({ content: "Prefix must be 5 chars or fewer.", ephemeral: true });
      return;
    }

    await setGuildPrefix(interaction.guildId, newPrefix);
    await interaction.reply({ content: `Prefix updated to \`${newPrefix}\``, ephemeral: true });
  }
};
