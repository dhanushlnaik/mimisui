import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

function normalizeHex(input: string) {
  const value = input.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(value) ? value : "1DB954";
}

function colorFromUserId(userId: string) {
  return normalizeHex(userId.slice(-6));
}

export const thisIsSpotifyCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("thisisspotify")
    .setDescription("Generate a This Is Spotify style card.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Playlist title text")
    )
    .addStringOption((option) =>
      option.setName("color").setDescription("Background hex color (ex: 1DB954)")
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("User avatar (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = getTargetUser(interaction);
      const text = interaction.options.getString("text") ?? `${user.username}'s Mix`;
      const color = normalizeHex(interaction.options.getString("color") ?? colorFromUserId(user.id));
      const result = await callWeebyGenerator("thisisspotify", {
        image: getAvatarUrl(user),
        text,
        color
      });

      await interaction.editReply({
        files: [weebyAttachment("thisisspotify", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate thisisspotify image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
