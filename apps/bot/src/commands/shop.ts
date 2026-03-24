import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";

export const shopCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("shop").setDescription("View progression shop items."),
  async execute(interaction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("CoCo-sui Shop")
          .setDescription("Item purchasing flow is next step. Catalog is live now.")
          .addFields(
            { name: "XP Boost (30m)", value: "2x XP • 450 coins" },
            { name: "XP Boost (1h)", value: "1.5x XP • 700 coins" },
            { name: "Coin Boost (1h)", value: "1.5x coins • 600 coins" },
            { name: "Cosmetic Title", value: "Custom title slot • 1200 coins" }
          )
      ],
      ephemeral: true
    });
  }
};

