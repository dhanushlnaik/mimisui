import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import type { MessageContextCommand } from "../types/command.js";

export const tweetThisCommand: MessageContextCommand = {
  type: ApplicationCommandType.Message,
  data: new ContextMenuCommandBuilder()
    .setName("Tweet This")
    .setType(ApplicationCommandType.Message),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const target = interaction.targetMessage;
      const user = target.author;
      const tweet = target.content.trim() || "No text message content.";

      const result = await callWeebyGenerator("tweet", {
        username: user.username,
        tweet,
        avatar: getAvatarUrl(user)
      });

      await interaction.editReply({
        files: [weebyAttachment("tweet", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate tweet image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
