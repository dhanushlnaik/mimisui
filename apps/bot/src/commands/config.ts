import { MODULE_KEYS } from "@cocosui/config";
import { db } from "@cocosui/db";
import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import { ensureGuild } from "../lib/guild-config.js";

const CONFIG_CHOICES = [
  { name: "AFK", value: MODULE_KEYS.afk },
  { name: "Fun", value: MODULE_KEYS.fun },
  { name: "Games", value: MODULE_KEYS.games },
  { name: "Utility", value: MODULE_KEYS.utility },
  { name: "Family Enabled", value: "familyEnabled" },
  { name: "Marriage Enabled", value: "marriageEnabled" },
  { name: "Siblings Enabled", value: "siblingsEnabled" },
  { name: "Family Announcements", value: "publicFamilyAnnouncements" }
] as const;

export const configCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Toggle guild modules and family settings")
    .addStringOption((option) =>
      option
        .setName("module")
        .setDescription("Setting to update")
        .setRequired(true)
        .addChoices(...CONFIG_CHOICES)
    )
    .addBooleanOption((option) =>
      option.setName("enabled").setDescription("Enable or disable this module").setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command works in a server only.", ephemeral: true });
      return;
    }

    const moduleName = interaction.options.getString("module", true);
    const enabled = interaction.options.getBoolean("enabled", true);

    const guild = await ensureGuild(interaction.guildId, interaction.guild?.name);
    const settings = {
      ...(guild.settings as Record<string, unknown>),
      [moduleName]: enabled
    };

    await db.guild.update({
      where: { id: interaction.guildId },
      data: { settings }
    });

    await interaction.reply({
      content: `${moduleName} is now ${enabled ? "enabled" : "disabled"}.`,
      ephemeral: true
    });
  }
};
