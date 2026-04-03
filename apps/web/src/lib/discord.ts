const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
};

function hasManagePermission(permissions: string) {
  const bits = BigInt(permissions);
  return (bits & ADMINISTRATOR) !== 0n || (bits & MANAGE_GUILD) !== 0n;
}

export async function listManageableGuilds(accessToken: string) {
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Discord guild request failed: ${response.status}`);
  }

  const guilds = (await response.json()) as DiscordGuild[];
  return guilds.filter((guild) => hasManagePermission(guild.permissions));
}

export type DiscordRole = {
  id: string;
  name: string;
  position: number;
  color: number;
  managed?: boolean;
};

export type DiscordGuildChannel = {
  id: string;
  name: string;
  type: number;
  position?: number;
  parent_id?: string | null;
};

function sortRoles(roles: DiscordRole[]) {
  return [...roles]
    .filter((role) => role.name !== "@everyone")
    .sort((a, b) => b.position - a.position);
}

function sortChannels(channels: DiscordGuildChannel[]) {
  return [...channels].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export async function getGuildRolesAndChannels(guildId: string, botToken: string) {
  const headers = {
    Authorization: `Bot ${botToken}`
  };
  const [rolesRes, channelsRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers, cache: "no-store" })
  ]);

  if (!rolesRes.ok) {
    throw new Error(`Discord roles request failed: ${rolesRes.status}`);
  }
  if (!channelsRes.ok) {
    throw new Error(`Discord channels request failed: ${channelsRes.status}`);
  }

  const roles = sortRoles((await rolesRes.json()) as DiscordRole[]);
  const channels = sortChannels((await channelsRes.json()) as DiscordGuildChannel[]).filter((c) =>
    // text, voice, forum, thread-like and stage channels relevant for command scope targeting
    [0, 2, 4, 5, 10, 11, 12, 13, 14, 15].includes(c.type)
  );

  return { roles, channels };
}
