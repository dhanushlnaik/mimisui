import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { claimDaily } from "../lib/progression.js";
import type { SlashCommand } from "../types/command.js";

function nextUtcResetUnix() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.floor(next.getTime() / 1000);
}

export const dailyCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily reward."),
  async execute(interaction) {
    const result = await claimDaily({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      username: interaction.user.username
    });

    if (!result.claimed) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb347)
            .setTitle("🕒 Daily Already Claimed")
            .setDescription(
              [
                `You already claimed today's daily reward.`,
                `🔥 Streak: **${result.streak}**`,
                `⏱ Next daily: <t:${nextUtcResetUnix()}:R>`
              ].join("\n")
            )
        ],
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x15ff00)
          .setTitle("🎁 Daily Claimed")
          .setDescription(
            [
              `✨ You received **${result.coins} Sui Coins**`,
              `📚 XP gained: **${result.xp}**`,
              `🔥 Daily streak: **${result.streak}**`,
              `⏱ Next daily: <t:${nextUtcResetUnix()}:R>`
            ].join("\n")
          )
      ]
    });
  }
};
