import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Check bot latency."),
  async execute(interaction) {
    try {
      await interaction.reply({
        content: "`🏓` **- Getting my ping ...**",
        flags: MessageFlags.Ephemeral
      });

      const sent = await interaction.fetchReply();
      const commandLatency = sent.createdTimestamp - interaction.createdTimestamp;
      const gatewayLatency = Math.round(interaction.client.ws.ping);

      const embed = new EmbedBuilder()
        .setColor(0xf72585)
        .setDescription(
          `:heartpulse: Command: \`${commandLatency} ms\`\n:stopwatch: Gateway: \`${gatewayLatency} ms\``
        )
        .setAuthor({
          name: interaction.client.user.username,
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ content: "", embeds: [embed] });
    } catch (error) {
      const content = "⚠️ There was an error while trying to get the ping.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content, embeds: [] }).catch(() => null);
        return;
      }
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  }
};
