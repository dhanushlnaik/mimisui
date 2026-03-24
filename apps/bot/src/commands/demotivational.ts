import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const demotivationalCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("demotivational")
    .setDescription("Generate a demotivational poster.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Poster text").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Title (default: Demotivational)")
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Image user (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = getTargetUser(interaction);
      const title = interaction.options.getString("title") ?? "Demotivational";
      const text = interaction.options.getString("text", true);
      const result = await callWeebyGenerator("demotivational", {
        image: getAvatarUrl(user),
        title,
        text
      });

      await interaction.editReply({
        files: [weebyAttachment("demotivational", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate demotivational image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
