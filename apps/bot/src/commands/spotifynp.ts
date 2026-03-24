import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const spotifyNowPlayingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("spotifynp")
    .setDescription("Generate a Spotify Now Playing card.")
    .addStringOption((option) =>
      option.setName("title").setDescription("Song title")
    )
    .addStringOption((option) =>
      option.setName("artist").setDescription("Artist name")
    )
    .addStringOption((option) =>
      option.setName("album").setDescription("Album name")
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Cover image user (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const user = getTargetUser(interaction);
      const title = interaction.options.getString("title") ?? "Unknown Track";
      const artist = interaction.options.getString("artist") ?? user.username;
      const album = interaction.options.getString("album") ?? "Now Playing";

      const result = await callWeebyGenerator("spotifynp", {
        image: getAvatarUrl(user),
        title,
        artist,
        album
      });

      await interaction.editReply({
        files: [weebyAttachment("spotifynp", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate spotifynp image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
