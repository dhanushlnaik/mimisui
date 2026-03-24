import { DEFAULT_GUILD_SETTINGS, DEFAULT_PREFIX } from "@cocosui/config";
import { Prisma, db } from "@cocosui/db";

export async function ensureGuild(guildId: string, name?: string | null) {
  try {
    return await db.guild.upsert({
      where: { id: guildId },
      update: {
        ...(name ? { name } : {})
      },
      create: {
        id: guildId,
        name: name ?? null,
        prefix: DEFAULT_PREFIX,
        settings: DEFAULT_GUILD_SETTINGS
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Concurrent upserts can race; fallback to update/read.
      return db.guild.update({
        where: { id: guildId },
        data: {
          ...(name ? { name } : {})
        }
      });
    }

    throw error;
  }
}

export async function getGuildPrefix(guildId: string) {
  const guild = await ensureGuild(guildId);
  return guild.prefix;
}

export async function setGuildPrefix(guildId: string, prefix: string) {
  return db.guild.update({
    where: { id: guildId },
    data: { prefix }
  });
}
