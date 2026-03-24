import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import sharp from "sharp";
import type { SlashCommand } from "../types/command.js";

async function fetchImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

export const splitImageCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("splitimg")
    .setDescription("Split an image into left and right halves")
    .addAttachmentOption((option) =>
      option.setName("image").setDescription("Image to split").setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const image = interaction.options.getAttachment("image", true);
      const input = await fetchImage(image.url);

      const meta = await sharp(input).metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;
      if (width < 2 || height < 1) {
        await interaction.editReply("Image is too small to split.");
        return;
      }

      const half = Math.floor(width / 2);
      const left = await sharp(input)
        .extract({ left: 0, top: 0, width: half, height })
        .png()
        .toBuffer();
      const right = await sharp(input)
        .extract({ left: half, top: 0, width: width - half, height })
        .png()
        .toBuffer();

      await interaction.editReply({
        content: "Split complete.",
        files: [
          new AttachmentBuilder(left, { name: "left.png" }),
          new AttachmentBuilder(right, { name: "right.png" })
        ]
      });
    } catch (error) {
      await interaction.editReply(
        `Failed to split image. ${error instanceof Error ? error.message : ""}`
      );
    }
  }
};
