import { db } from "@cocosui/db";
import { EmbedBuilder, type Client } from "discord.js";
import { getGuildPrefix } from "../lib/guild-config.js";
import { findCommandDoc, prefixAliasMap } from "../lib/command-catalog.js";
import { handlePrefixCommand } from "../lib/prefix-commands.js";
import { grantCommandProgress } from "../lib/progression.js";

async function resolvePrefixCommand(message: import("discord.js").Message) {
  if (!message.guildId) return null;
  const prefix = await getGuildPrefix(message.guildId);
  const botId = message.client.user?.id;
  const mentionPrefixes = botId ? [`<@${botId}>`, `<@!${botId}>`] : [];

  let raw = "";
  if (message.content.startsWith(prefix)) {
    raw = message.content.slice(prefix.length).trim();
  } else {
    const mention = mentionPrefixes.find((m) => message.content.startsWith(m));
    if (!mention) return null;
    raw = message.content.slice(mention.length).trim();
  }

  if (!raw) return null;
  const [commandRaw] = raw.split(/\s+/);
  const parsed = (commandRaw ?? "").toLowerCase();
  const canonical = prefixAliasMap[parsed] ?? parsed;
  return findCommandDoc(canonical) ? canonical : null;
}

export function registerMessageCreate(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;

      const currentAfk = await db.aFK.findUnique({ where: { userId: message.author.id } });
      if (currentAfk) {
        await db.aFK.delete({ where: { userId: message.author.id } });
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x4caf50)
              .setTitle("Welcome Back")
              .setDescription(
                `AFK removed.\nYou were pinged **${currentAfk.mentionCount}** time(s) while away.`
              )
          ]
        });
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

        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffc107)
              .setTitle("User Is AFK")
              .setDescription(`${user} is AFK.\n**Reason:** ${mentionedAfk.reason}`)
          ]
        });
      }

      const resolved = await resolvePrefixCommand(message);
      await handlePrefixCommand(message);

      if (resolved) {
        const result = await grantCommandProgress({
          userId: message.author.id,
          guildId: message.guildId,
          username: message.author.username,
          commandName: resolved
        });

        if (result.levelUp || result.completedQuests.length > 0) {
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x15ff00)
                .setTitle(result.levelUp ? "Level Up!" : "Quest Complete!")
                .setDescription(
                  [
                    result.levelUp
                      ? `You reached **Level ${result.levelUp.to}** (${result.levelUp.title})`
                      : null,
                    result.completedQuests.length > 0
                      ? `Completed: ${result.completedQuests.join(", ")}`
                      : null,
                    result.gainedXp > 0 || result.gainedCoins > 0
                      ? `+${result.gainedXp} XP • +${result.gainedCoins} coins`
                      : null
                  ]
                    .filter(Boolean)
                    .join("\n")
                )
            ]
          });
        }
      }
    } catch (error) {
      console.error("[messageCreate] handler failed", error);
    }
  });
}
