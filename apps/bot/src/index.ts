import { Client, GatewayIntentBits, Partials } from "discord.js";
import { commands, commandMap } from "./commands";
import { env } from "./env";
import { registerMessageCreate } from "./events/message-create";
import { logger } from "./lib/logger";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  logger.info(`Bot online as ${client.user?.tag ?? "unknown"}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ content: "Unknown command.", ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Command failed: ${interaction.commandName}`, error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "Something went wrong.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Something went wrong.", ephemeral: true });
    }
  }
});

registerMessageCreate(client);

void client.login(env.DISCORD_TOKEN);

void commands;
