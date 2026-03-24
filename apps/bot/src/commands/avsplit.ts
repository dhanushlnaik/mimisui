import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import { avatarSplitFromUrls } from "../lib/rich-media.js";
import type { SlashCommand } from "../types/command.js";

export const avatarSplitCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("avsplit")
    .setDescription("Combine two avatars side-by-side into one image.")
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
      const merged = await avatarSplitFromUrls(getAvatarUrl(user1, 512), getAvatarUrl(user2, 512));

      await interaction.editReply({
        content: `${user1} + ${user2}`,
        files: [new AttachmentBuilder(merged, { name: "avsplit.png" })]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate avatar split image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
