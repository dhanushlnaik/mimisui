import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { fetchMessageFromLink } from "../lib/message-link.js";
import { buildUk07Card } from "../lib/rich-media.js";
import type { SlashCommand } from "../types/command.js";

export const uk07Command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("uk07")
    .setDescription("Generate UK07 meme text image.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Text to render")
    )
    .addStringOption((option) =>
      option
        .setName("message_link")
        .setDescription("Discord message link to auto-fill text")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      let text = interaction.options.getString("text")?.trim();
      const link = interaction.options.getString("message_link");

      if (link) {
        const linkedMessage = await fetchMessageFromLink(interaction.client, link);
        if (linkedMessage?.content) {
          text = linkedMessage.content.trim() || text;
        }
      }

      const image = await buildUk07Card(text ?? "Recharge khatam hogya");

      await interaction.editReply({
        files: [new AttachmentBuilder(image, { name: "uk07.png" })]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate uk07 image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};

