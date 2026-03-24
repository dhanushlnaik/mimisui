import { SlashCommandBuilder } from "discord.js";
import { weebyAttachment, callWeebyGenerator } from "../lib/weeby.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import type { SlashCommand } from "../types/command.js";

export const triggeredCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("triggered")
    .setDescription("Create a triggered GIF from a user's avatar.")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to use (defaults to you)")
    )
    .addBooleanOption((option) =>
      option.setName("tint").setDescription("Orange tint (default: true)")
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const user = getTargetUser(interaction);
      const tint = interaction.options.getBoolean("tint") ?? true;
      const result = await callWeebyGenerator("triggered", {
        image: getAvatarUrl(user),
        tint: String(tint)
      });

      await interaction.editReply({
        content: `Triggered: ${user}`,
        files: [weebyAttachment("triggered", result, "gif")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate triggered image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
