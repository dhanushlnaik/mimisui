import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { env } from "./env.js";

async function main() {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
    body: commands.map((command) => command.data.toJSON())
  });

  console.log(`Registered ${commands.length} command(s) to guild ${env.GUILD_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
