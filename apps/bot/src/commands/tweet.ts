import { SlashCommandBuilder } from "discord.js";
import { fetchMessageFromLink } from "../lib/message-link.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const tweetCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tweet")
    .setDescription("Generate a fake tweet image.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Tweet text")
    )
    .addStringOption((option) =>
      option
        .setName("message_link")
        .setDescription("Discord message link to use as tweet content/author")
    )
    .addStringOption((option) =>
      option.setName("username").setDescription("Display username (default: selected user)")
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Avatar user (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      let user = getTargetUser(interaction);
      let tweet = interaction.options.getString("text")?.trim();

      const link = interaction.options.getString("message_link");
      if (link) {
        const linkedMessage = await fetchMessageFromLink(interaction.client, link);
        if (linkedMessage?.author) {
          user = linkedMessage.author;
          tweet = linkedMessage.content.trim() || tweet;
        }
      }

      if (!tweet) {
        tweet = "Hello world from CoCo-sui.";
      }

      const username = interaction.options.getString("username") ?? user.username;
      const result = await callWeebyGenerator("tweet", {
        username,
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
