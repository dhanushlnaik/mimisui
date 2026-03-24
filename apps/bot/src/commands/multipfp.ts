import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder, type User } from "discord.js";
import sharp from "sharp";
import { C_MAIN } from "../lib/colors.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import type { SlashCommand } from "../types/command.js";

async function fetchImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function mergeUsers(users: User[]) {
  const size = 500;
  const avatars = await Promise.all(
    users.map(async (user) => {
      const input = await fetchImage(getAvatarUrl(user, 512));
      return sharp(input).resize(size, size, { fit: "cover" }).png().toBuffer();
    })
  );

  return sharp({
    create: {
      width: size * avatars.length,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(avatars.map((input, i) => ({ input, left: i * size, top: 0 })))
    .png()
    .toBuffer();
}

export const multiPfpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("multipfp")
    .setDescription("Merge multiple user avatars into one image.")
    .addUserOption((o) => o.setName("user1").setDescription("User 1"))
    .addUserOption((o) => o.setName("user2").setDescription("User 2"))
    .addUserOption((o) => o.setName("user3").setDescription("User 3"))
    .addUserOption((o) => o.setName("user4").setDescription("User 4"))
    .addUserOption((o) => o.setName("user5").setDescription("User 5"))
    .addUserOption((o) => o.setName("user6").setDescription("User 6")),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const picked = [1, 2, 3, 4, 5, 6]
        .map((i) => interaction.options.getUser(`user${i}`))
        .filter((u): u is User => Boolean(u));

      const users = picked.length > 0 ? picked : [interaction.user];
      const uniqueUsers = [...new Map(users.map((u) => [u.id, u])).values()];
      const merged = await mergeUsers(uniqueUsers);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(C_MAIN)
            .setTitle("Multiple PFP Merge")
            .setDescription(uniqueUsers.map((u) => u.toString()).join(" "))
            .setImage("attachment://multipfp.png")
        ],
        files: [new AttachmentBuilder(merged, { name: "multipfp.png" })]
      });
    } catch (error) {
      await interaction.editReply(
        `Failed to merge profile pictures. ${error instanceof Error ? error.message : ""}`
      );
    }
  }
};
