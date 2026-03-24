import { MODULE_KEYS } from "@cocosui/config";
import { db } from "@cocosui/db";
import { PermissionFlagsBits, type Message } from "discord.js";
import { ensureGuild, getGuildPrefix, setGuildPrefix } from "./guild-config";

type PrefixContext = {
  message: Message;
  command: string;
  args: string[];
};

function isManageGuild(message: Message) {
  return message.member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;
}

async function runPing({ message }: PrefixContext) {
  await message.reply("Pong!");
}

async function runAfk({ message, args }: PrefixContext) {
  const reason = args.join(" ").trim() || "Away";

  await db.discordUser.upsert({
    where: { id: message.author.id },
    update: {
      username: message.author.username,
      avatar: message.author.avatarURL() ?? undefined
    },
    create: {
      id: message.author.id,
      username: message.author.username,
      avatar: message.author.avatarURL() ?? undefined
    }
  });

  await db.aFK.upsert({
    where: { userId: message.author.id },
    update: {
      guildId: message.guildId ?? "dm",
      reason,
      mentionCount: 0
    },
    create: {
      userId: message.author.id,
      guildId: message.guildId ?? "dm",
      reason
    }
  });

  await message.reply(`You're AFK now: ${reason}`);
}

async function runPrefix({ message, args }: PrefixContext) {
  if (!message.guildId) {
    await message.reply("This command works in a server only.");
    return;
  }

  const sub = (args[0] ?? "").toLowerCase();
  if (!sub || sub === "get") {
    const prefix = await getGuildPrefix(message.guildId);
    await message.reply(`Current prefix: \`${prefix}\``);
    return;
  }

  if (sub !== "set") {
    await message.reply("Usage: prefix get | prefix set <value>");
    return;
  }

  if (!isManageGuild(message)) {
    await message.reply("You need Manage Server permission to change prefix.");
    return;
  }

  const newPrefix = (args[1] ?? "").trim();
  if (!newPrefix) {
    await message.reply("Usage: prefix set <value>");
    return;
  }

  if (newPrefix.length > 5) {
    await message.reply("Prefix must be 5 chars or fewer.");
    return;
  }

  await setGuildPrefix(message.guildId, newPrefix);
  await message.reply(`Prefix updated to \`${newPrefix}\``);
}

async function runConfig({ message, args }: PrefixContext) {
  if (!message.guildId) {
    await message.reply("This command works in a server only.");
    return;
  }

  if (!isManageGuild(message)) {
    await message.reply("You need Manage Server permission to change config.");
    return;
  }

  const moduleName = (args[0] ?? "").toLowerCase();
  const enabledRaw = (args[1] ?? "").toLowerCase();

  if (!Object.values(MODULE_KEYS).includes(moduleName as (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS])) {
    await message.reply("Usage: config <afk|fun|games|utility> <on|off>");
    return;
  }

  const enabled = enabledRaw === "on" || enabledRaw === "true" || enabledRaw === "enable";
  const disabled = enabledRaw === "off" || enabledRaw === "false" || enabledRaw === "disable";

  if (!enabled && !disabled) {
    await message.reply("Usage: config <afk|fun|games|utility> <on|off>");
    return;
  }

  const guild = await ensureGuild(message.guildId, message.guild?.name);
  const settings = {
    ...(guild.settings as Record<string, boolean>),
    [moduleName]: enabled
  };

  await db.guild.update({
    where: { id: message.guildId },
    data: { settings }
  });

  await message.reply(`${moduleName} module is now ${enabled ? "enabled" : "disabled"}.`);
}

export async function handlePrefixCommand(message: Message) {
  if (!message.guildId || message.author.bot) {
    return;
  }

  const prefix = await getGuildPrefix(message.guildId);
  if (!message.content.startsWith(prefix)) {
    return;
  }

  const withoutPrefix = message.content.slice(prefix.length).trim();
  if (!withoutPrefix) {
    return;
  }

  const [commandRaw, ...args] = withoutPrefix.split(/\s+/);
  const command = (commandRaw ?? "").toLowerCase();

  const ctx: PrefixContext = { message, command, args };

  switch (ctx.command) {
    case "ping":
      await runPing(ctx);
      return;
    case "afk":
      await runAfk(ctx);
      return;
    case "prefix":
      await runPrefix(ctx);
      return;
    case "config":
      await runConfig(ctx);
      return;
    default:
      return;
  }
}
