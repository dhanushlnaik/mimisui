import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder, type User } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
import { avatarSplitFromUrls } from "../lib/rich-media.js";
import { getAvatarUrl, getTargetUser } from "../lib/user-avatar.js";
import type { SlashCommand } from "../types/command.js";

async function fetchImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

function isAnimated(user: User) {
  return user.avatar?.startsWith("a_") ?? false;
}

export const avatarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show single avatar or merged avatars")
    .addUserOption((option) =>
      option.setName("user").setDescription("Primary user (defaults to you)")
    )
    .addUserOption((option) =>
      option.setName("user2").setDescription("Secondary user for shared avatar")
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const user1 = getTargetUser(interaction);
    const user2 = interaction.options.getUser("user2");

    if (!user2 || user1.id === user2.id) {
      const animated = isAnimated(user1);
      const ext = animated ? "gif" : "png";
      const avatarUrl = user1.displayAvatarURL({
        extension: ext,
        forceStatic: !animated,
        size: 1024
      });
      const buffer = await fetchImage(avatarUrl);
      const filename = `avatar.${ext}`;

      const embed = new EmbedBuilder()
        .setColor(C_MAIN)
        .setTitle("Avatar")
        .setDescription(`\`Nickname: ${user1.displayName}\nID: ${user1.id}\``)
        .setAuthor({ name: user1.tag, iconURL: user1.displayAvatarURL() })
        .setImage(`attachment://${filename}`);

      await interaction.editReply({
        embeds: [embed],
        files: [new AttachmentBuilder(buffer, { name: filename })]
      });
      return;
    }

    const merged = await avatarSplitFromUrls(getAvatarUrl(user1, 512), getAvatarUrl(user2, 512));
    const embed = new EmbedBuilder()
      .setColor(C_MAIN)
      .setTitle("Shared Avatar")
      .setDescription(`${user1} + ${user2}`)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setImage("attachment://shared.png");

    await interaction.editReply({
      embeds: [embed],
      files: [new AttachmentBuilder(merged, { name: "shared.png" })]
    });
  }
};
