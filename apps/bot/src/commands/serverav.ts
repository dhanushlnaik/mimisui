import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
import type { SlashCommand } from "../types/command.js";

export const serverAvatarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("serverav")
    .setDescription("Show server-specific avatar")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to show (defaults to you)")
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);
    const image = member?.displayAvatarURL({ size: 1024 }) ?? user.displayAvatarURL({ size: 1024 });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(C_MAIN)
          .setTitle(`${user.displayName}'s Server Avatar`)
          .setImage(image)
      ]
    });
  }
};
