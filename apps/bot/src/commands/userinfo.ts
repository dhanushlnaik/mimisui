import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
import type { SlashCommand } from "../types/command.js";

export const userInfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show user info and roles")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to inspect (defaults to you)")
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command works in servers only.", ephemeral: true });
      return;
    }

    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;
    const joinedAt = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "Unknown";
    const roles = member.roles.cache.filter((r) => r.id !== interaction.guild!.id).map((r) => r.toString());
    const keyPerms = member.permissions
      .toArray()
      .slice(0, 12)
      .map((p) => p.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));

    const embed = new EmbedBuilder()
      .setColor(C_MAIN)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .setDescription(`${user} \`[${user.id}]\``)
      .addFields(
        { name: "Created", value: createdAt, inline: true },
        { name: "Joined", value: joinedAt, inline: true },
        {
          name: `Roles [${roles.length}]`,
          value: roles.length > 0 ? roles.slice(0, 20).join(" ") : "No roles",
          inline: false
        },
        {
          name: "Key Permissions",
          value: keyPerms.length > 0 ? keyPerms.join(", ") : "No key permissions",
          inline: false
        }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
