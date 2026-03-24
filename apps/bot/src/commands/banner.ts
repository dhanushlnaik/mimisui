import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_MAIN, C_ORANGE } from "../lib/colors.js";
import type { SlashCommand } from "../types/command.js";

export const bannerCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Show a user's profile banner")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to show (defaults to you)")
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const fetched = await interaction.client.users.fetch(user.id, { force: true });
    const banner = fetched.bannerURL({ size: 2048 });

    if (!banner) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(C_ORANGE)
            .setTitle("No Banner")
            .setDescription(`${user} does not have a profile banner.`)
        ],
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(C_MAIN)
          .setTitle(`${user.displayName}'s Banner`)
          .setImage(banner)
      ]
    });
  }
};
