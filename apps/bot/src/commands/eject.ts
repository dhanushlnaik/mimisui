import { SlashCommandBuilder } from "discord.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import { callWeebyGenerator, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

const RANDOM_EJECT_TEXTS = [
  "was sus",
  "forgot to do tasks",
  "vented in front of everyone",
  "said trust me bro",
  "looked kinda suspicious"
];

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

export const ejectCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("eject")
    .setDescription("Generate an Among Us eject meme.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Name/text (default: selected user)")
    )
    .addStringOption((option) =>
      option
        .setName("outcome")
        .setDescription("Outcome")
        .addChoices(
          { name: "Ejected", value: "ejected" },
          { name: "Imposter", value: "imposter" },
          { name: "Not Imposter", value: "notimposter" }
        )
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Avatar user (defaults to you)")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = getTargetUser(interaction);
      const text = interaction.options.getString("text") ?? `${user.username} ${randomItem(RANDOM_EJECT_TEXTS)}`;
      const outcome = interaction.options.getString("outcome") ?? "ejected";
      let result;
      try {
        result = await callWeebyGenerator("eject", {
          image: getAvatarUrl(user),
          text,
          outcome
        });
      } catch {
        result = await callWeebyGenerator("eject", {
          image: getAvatarUrl(user),
          text: user.username,
          outcome: "ejected"
        });
      }

      await interaction.editReply({
        files: [weebyAttachment("eject", result, "png")]
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to generate eject image. ${error instanceof Error ? error.message : ""}`
      });
    }
  }
};
