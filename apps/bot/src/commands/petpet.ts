import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { petPetFromAvatarUrl } from "../lib/rich-media.js";
import type { SlashCommand } from "../types/command.js";

export const petPetCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("petpet")
    .setDescription("Generate a pet-pet GIF from avatar.")
    .addUserOption((option) =>
      option.setName("user").setDescription("User avatar (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = getTargetUser(interaction);
      const avatar = getAvatarUrl(user, 256);
      const gifBuffer = await petPetFromAvatarUrl(avatar);

      await interaction.editReply({
        content: `*pets ${user}*`,
        files: [new AttachmentBuilder(gifBuffer, { name: "petpet.gif" })]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate petpet gif. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
