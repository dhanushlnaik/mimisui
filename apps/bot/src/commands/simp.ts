import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { buildSimpCardFromAvatar } from "../lib/rich-media.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import type { SlashCommand } from "../types/command.js";

export const simpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("simp")
    .setDescription("Generate a simp ID card.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Who you simp for (defaults to bot)")
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const author = interaction.user;
    const target = interaction.options.getUser("user") ?? interaction.client.user ?? interaction.user;

    try {
      const image = await buildSimpCardFromAvatar(
        getAvatarUrl(author, 1024),
        author.displayName,
        target.displayName
      );

      await interaction.editReply({
        files: [new AttachmentBuilder(image, { name: "simpcard.png" })]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate simp card. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};

