import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Check bot latency."),
  async execute(interaction) {
    const sent = Date.now() - interaction.createdTimestamp;
    await interaction.reply({ content: `Pong! ${sent}ms`, ephemeral: true });
  }
};
