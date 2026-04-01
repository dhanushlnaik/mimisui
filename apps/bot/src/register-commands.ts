import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { env } from "./env.js";

function parseArgValue(flag: string) {
  const idx = process.argv.findIndex((a) => a === flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const body = commands.map((command) => command.data.toJSON());
  const forceGlobal = process.argv.includes("--global");
  const forceGuild = process.argv.includes("--guild");
  const cliGuildId = parseArgValue("--guild-id") ?? parseArgValue("--guild");
  const mode: "global" | "guild" = forceGlobal ? "global" : "guild";
  if (forceGlobal && forceGuild) {
    throw new Error("Use either --global or --guild, not both.");
  }

  if (mode === "global") {
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body });
    console.log(`Registered ${commands.length} global command(s) for application ${env.CLIENT_ID}`);
    return;
  }

  const guildId = cliGuildId ?? env.GUILD_ID;
  if (!guildId) {
    throw new Error("Guild registration requires GUILD_ID in env or --guild-id <id>.");
  }

  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, guildId), { body });
  console.log(`Registered ${commands.length} guild command(s) to guild ${guildId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
