import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import type { MessageContextCommand } from "../types/command.js";

export const quoteThisCommand: MessageContextCommand = {
  type: ApplicationCommandType.Message,
  data: new ContextMenuCommandBuilder()
    .setName("Quote This")
    .setType(ApplicationCommandType.Message),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const target = interaction.targetMessage;
      const user = target.author;
      const text = target.content.trim() || "No quote text provided.";

      const result = await callWeebyGenerator("quote", {
        image: getAvatarUrl(user),
        text,
        author: user.username
      });

      await interaction.editReply({
        files: [weebyAttachment("quote", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate quote image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
