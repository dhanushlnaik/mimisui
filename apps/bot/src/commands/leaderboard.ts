import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getLeaderboard } from "../lib/progression.js";
import type { SlashCommand } from "../types/command.js";

export const leaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("leaderboard").setDescription("Top progression users in this server."),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "Use this in a server.", ephemeral: true });
      return;
    }
    const rows = await getLeaderboard(interaction.guildId, 10);
    const text =
      rows
        .map(
          (row: any, i: number) =>
            `**${i + 1}.** <@${row.userId}> • Lv ${row.level} • ${row.xp} XP • ${row.coins} coins`
        )
        .join("\n") || "No leaderboard data yet.";

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x00aeff).setTitle("Server Leaderboard").setDescription(text)]
    });
  }
};

