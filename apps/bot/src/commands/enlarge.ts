import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_BLUE } from "../lib/colors.js";
import type { SlashCommand } from "../types/command.js";

function parseEmoji(input: string) {
  const match = input.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (!match) return null;
  const animated = input.startsWith("<a:");
  const name = match[1] ?? "emoji";
  const id = match[2] ?? "";
  const ext = animated ? "gif" : "png";
  return { id, name, animated, url: `https://cdn.discordapp.com/emojis/${id}.${ext}?size=1024` };
}

export const enlargeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("enlarge")
    .setDescription("Enlarge a custom emoji")
    .addStringOption((option) =>
      option.setName("emoji").setDescription("Custom emoji like <:name:id>").setRequired(true)
    ),
  async execute(interaction) {
    const raw = interaction.options.getString("emoji", true);
    const parsed = parseEmoji(raw);
    if (!parsed) {
      await interaction.reply({
        content: "Please provide a valid custom emoji like `<:name:id>` or `<a:name:id>`.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(C_BLUE)
          .setTitle("Enlarged Emoji")
          .setDescription(`\`${parsed.name}\` • \`${parsed.id}\``)
          .setImage(parsed.url)
      ]
    });
  }
};
