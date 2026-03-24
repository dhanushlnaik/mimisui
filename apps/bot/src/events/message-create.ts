import { db } from "@cocosui/db";
import type { Client } from "discord.js";
import { handlePrefixCommand } from "../lib/prefix-commands";

export function registerMessageCreate(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;

      const currentAfk = await db.aFK.findUnique({ where: { userId: message.author.id } });
      if (currentAfk) {
        await db.aFK.delete({ where: { userId: message.author.id } });
        await message.reply(`Welcome back! You were AFK and got ${currentAfk.mentionCount} ping(s).`);
      }

      if (!message.guild) return;

      for (const user of message.mentions.users.values()) {
        if (user.bot) continue;

        const mentionedAfk = await db.aFK.findUnique({ where: { userId: user.id } });
        if (!mentionedAfk || mentionedAfk.guildId !== message.guild.id) continue;

        await db.aFK.update({
          where: { userId: user.id },
          data: { mentionCount: { increment: 1 } }
        });

        await message.reply(`${user} is AFK: ${mentionedAfk.reason}`);
      }

      await handlePrefixCommand(message);
    } catch (error) {
      console.error("[messageCreate] handler failed", error);
    }
  });
}
