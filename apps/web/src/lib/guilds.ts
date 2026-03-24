import { DEFAULT_GUILD_SETTINGS, DEFAULT_PREFIX } from "@cocosui/config";
import { db } from "@cocosui/db";
import { listManageableGuilds } from "./discord";

export async function listGuilds() {
  return db.guild.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });
}

export async function listManagedGuildsForAuthUser(authUserId: string) {
  const discordAccount = await db.account.findFirst({
    where: {
      userId: authUserId,
      providerId: "discord"
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (!discordAccount?.accessToken) {
    return [];
  }

  const discordGuilds = await listManageableGuilds(discordAccount.accessToken);

  if (discordGuilds.length === 0) {
    return [];
  }

  await Promise.all(
    discordGuilds.map((guild) =>
      db.guild.upsert({
        where: { id: guild.id },
        update: {
          name: guild.name
        },
        create: {
          id: guild.id,
          name: guild.name,
          prefix: DEFAULT_PREFIX,
          settings: DEFAULT_GUILD_SETTINGS
        }
      })
    )
  );

  return db.guild.findMany({
    where: {
      id: {
        in: discordGuilds.map((guild) => guild.id)
      }
    },
    orderBy: {
      name: "asc"
    }
  });
}

export async function getGuildById(guildId: string) {
  return db.guild.findUnique({ where: { id: guildId } });
}
