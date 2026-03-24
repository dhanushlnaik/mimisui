import type { Client, Message } from "discord.js";

type ParsedMessageLink = {
  guildId: string;
  channelId: string;
  messageId: string;
};

export function parseDiscordMessageLink(link: string): ParsedMessageLink | null {
  const match = link
    .trim()
    .match(/^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/);

  if (!match) return null;

  return {
    guildId: match[1] ?? "",
    channelId: match[2] ?? "",
    messageId: match[3] ?? ""
  };
}

export async function fetchMessageFromLink(
  client: Client,
  link: string
): Promise<Message | null> {
  const parsed = parseDiscordMessageLink(link);
  if (!parsed) return null;

  const channel = await client.channels.fetch(parsed.channelId).catch(() => null);
  if (!channel || !("messages" in channel)) return null;

  const message = await channel.messages.fetch(parsed.messageId).catch(() => null);
  return message ?? null;
}
