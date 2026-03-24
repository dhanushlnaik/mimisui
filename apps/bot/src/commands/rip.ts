import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const ripCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rip")
    .setDescription("Generate an RIP gravestone meme.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Whose avatar to use (defaults to you)")
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("Tombstone message")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = getTargetUser(interaction);
      const message = interaction.options.getString("message") ?? "You will be missed.";
      const result = await callWeebyGenerator("rip", {
        avatar: getAvatarUrl(user),
        username: user.username,
        message
      });

      await interaction.editReply({
        files: [weebyAttachment("rip", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate rip image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
