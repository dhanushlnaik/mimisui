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
