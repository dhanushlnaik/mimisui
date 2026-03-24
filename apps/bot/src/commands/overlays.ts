import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyOverlay, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

export const overlayTypes = [
  "approved",
  "bazinga",
  "caution",
  "christmas",
  "easter",
  "fire",
  "glass",
  "halloween",
  "hearts",
  "jail",
  "rainbow",
  "rejected",
  "snow",
  "thuglife",
  "balance",
  "brilliance",
  "bravery",
  "wasted"
] as const;

function createOverlayCommand(type: (typeof overlayTypes)[number]): SlashCommand {
  return {
    data: new SlashCommandBuilder()
      .setName(type)
      .setDescription(`Apply ${type} overlay to an avatar.`)
      .addUserOption((option) =>
        option.setName("user").setDescription("Target user (defaults to you)")
      ),
    async execute(interaction) {
      await interaction.deferReply();
      try {
        const user = getTargetUser(interaction);
        const result = await callWeebyOverlay(type, {
          image: getAvatarUrl(user)
        });

        await interaction.editReply({
          files: [weebyAttachment(type, result)]
        });
      } catch (error) {
        await interaction.editReply({
          content: `Failed to generate ${type} overlay. ${
            error instanceof Error ? error.message : ""
          }`
        });
      }
    }
  };
}

export const overlayCommands: SlashCommand[] = overlayTypes.map((type) => createOverlayCommand(type));
