import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getQuestBoard } from "../lib/progression.js";
import type { SlashCommand } from "../types/command.js";

export const questsCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("quests").setDescription("View your daily and weekly quests."),
  async execute(interaction) {
    const quests = await getQuestBoard(
      interaction.user.id,
      interaction.guildId,
      interaction.user.username
    );

    const daily = quests.filter((q: any) => q.type === "daily");
    const weekly = quests.filter((q: any) => q.type === "weekly");

    const format = (rows: any[]) =>
      rows
        .map(
          (q, i) =>
            `**${i + 1}. ${q.title}**\n` +
            `\`▸ Reward:\` **${q.rewardXP} XP + ${q.rewardCoins} coins**\n` +
            `\`▸ Progress:\` **[${q.progress}/${q.target}]** ${q.completed ? "✅" : ""}`
        )
        .join("\n\n") || "No quests.";

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5b8cff)
          .setAuthor({
            name: `${interaction.user.displayName}'s Quest Log`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setDescription(`These quests belong to ${interaction.user}`)
          .addFields(
            { name: "🗓 Daily Quests", value: format(daily) },
            { name: "📆 Weekly Quests", value: format(weekly) }
          )
          .setFooter({ text: "Quest progress updates automatically when you use commands." })
      ],
      ephemeral: true
    });
  }
};
