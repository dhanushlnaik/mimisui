import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

const imageTextTypes = [
  "achievement",
  "bartchalkboard",
  "changemymind",
  "lisapresentation",
  "jimwhiteboard"
] as const;

function createImageTextCommand(type: (typeof imageTextTypes)[number]): SlashCommand {
  return {
    data: new SlashCommandBuilder()
      .setName(type)
      .setDescription(`Generate ${type} image with text.`)
      .addStringOption((option) =>
        option.setName("text").setDescription("Text to print").setRequired(true)
      )
      .addUserOption((option) =>
        option.setName("user").setDescription("Avatar user (defaults to you)")
      ),
    async execute(interaction) {
      await interaction.deferReply();
      try {
        const text = interaction.options.getString("text", true);
        const user = getTargetUser(interaction);
        const result = await callWeebyGenerator(type, {
          image: getAvatarUrl(user),
          text
        });

        await interaction.editReply({
          files: [weebyAttachment(type, result, "png")]
        });
      } catch (error) {
        await interaction.editReply({
          content: `Failed to generate ${type}. ${error instanceof Error ? error.message : ""}`
        });
      }
    }
  };
}

export const imageTextCommands: SlashCommand[] = imageTextTypes.map((type) =>
  createImageTextCommand(type)
);

