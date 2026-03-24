import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const friendshipCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship two users with a friendship banner.")
    .addUserOption((option) =>
      option.setName("user1").setDescription("First user (default: you)")
    )
    .addUserOption((option) =>
      option.setName("user2").setDescription("Second user (default: you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user1 = interaction.options.getUser("user1") ?? interaction.user;
      const user2 = interaction.options.getUser("user2") ?? interaction.user;
      const result = await callWeebyGenerator("friendship", {
        firstimage: getAvatarUrl(user1),
        secondimage: getAvatarUrl(user2),
        firsttext: user1.username,
        secondtext: user2.username
      });

      await interaction.editReply({
        files: [weebyAttachment("friendship", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate friendship image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
