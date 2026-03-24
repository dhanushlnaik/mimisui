import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfile } from "../lib/progression.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import { callWeebyCustom, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

function hexFromId(id: string) {
  const value = id.slice(-6);
  return /^[0-9a-fA-F]{6}$/.test(value) ? value : "1F2937";
}

function progressBarText(percent: number) {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round(p / 10);
  return `${"▰".repeat(filled)}${"▱".repeat(10 - filled)} ${p}%`;
}

export const profileCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View profile progression stats.")
    .addUserOption((o) => o.setName("user").setDescription("User to view"))
    .addBooleanOption((o) => o.setName("card").setDescription("Render rank card image")),
  async execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("user") ?? interaction.user;
    const useCard = interaction.options.getBoolean("card") ?? true;

    const profile = await getProfile(user.id, interaction.guildId, user.username);
    const progressBar = Math.max(0, Math.min(100, Math.floor((profile.levelProgress / profile.levelRequired) * 100)));

    const embed = new EmbedBuilder()
      .setColor(0x5b8cff)
      .setAuthor({ name: `${user.displayName}'s Profile`, iconURL: getAvatarUrl(user, 256) })
      .setThumbnail(getAvatarUrl(user))
      .setDescription(
        [
          `**🏷 Title:** ${profile.title}`,
          `**📈 Progress:** ${progressBarText(progressBar)}`,
          `**⚡ XP Multiplier:** x${profile.xpMultiplier.toFixed(2)} • **💰 Coin Multiplier:** x${profile.coinMultiplier.toFixed(2)}`
        ].join("\n")
      )
      .addFields(
        { name: "⭐ Level", value: `${profile.levelComputed}`, inline: true },
        { name: "📚 XP", value: `${profile.levelProgress}/${profile.levelRequired}`, inline: true },
        { name: "🪙 Coins", value: `${profile.coins}`, inline: true },
        { name: "🔥 Daily Streak", value: `${profile.dailyStreak}`, inline: true },
        {
          name: "🧪 Active Boosts",
          value:
            profile.activeBoosts.length > 0
              ? profile.activeBoosts
                  .map((b: any) => `${b.type.toUpperCase()} x${b.multiplier} until <t:${Math.floor(new Date(b.expiresAt).getTime() / 1000)}:R>`)
                  .join("\n")
              : "None"
        }
      )
      .setFooter({ text: "CoCo-sui Progression" });

    if (!useCard) {
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const rank = await callWeebyCustom("rank", {
        avatar: getAvatarUrl(user, 1024),
        username: user.username,
        bgColor: hexFromId(user.id),
        level: String(profile.levelComputed),
        xp: String(profile.levelProgress),
        progressBar: String(progressBar),
        progressBarColor: "4F46E5",
        status: "22C55E",
        font: "nexa"
      });
      const rankAttachment = weebyAttachment("rank", rank, "png");
      embed.setImage("attachment://rank.png");
      await interaction.editReply({
        embeds: [embed],
        files: [rankAttachment]
      });
    } catch {
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
