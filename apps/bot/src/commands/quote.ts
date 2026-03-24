import { SlashCommandBuilder } from "discord.js";
import { fetchMessageFromLink } from "../lib/message-link.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const quoteImageCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Generate a quote image with avatar.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Quote text")
    )
    .addStringOption((option) =>
      option
        .setName("message_link")
        .setDescription("Discord message link to auto-fill quote and author")
    )
    .addStringOption((option) =>
      option.setName("author").setDescription("Author name (default: selected user)")
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Avatar user (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      let user = getTargetUser(interaction);
      let text = interaction.options.getString("text")?.trim();

      const link = interaction.options.getString("message_link");
      if (link) {
        const linkedMessage = await fetchMessageFromLink(interaction.client, link);
        if (linkedMessage?.author) {
          user = linkedMessage.author;
          text = linkedMessage.content.trim() || text;
        }
      }

      if (!text) {
        text = "No quote provided.";
      }

      const author = interaction.options.getString("author") ?? user.username;
      const result = await callWeebyGenerator("quote", {
        image: getAvatarUrl(user),
        text,
        author
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
