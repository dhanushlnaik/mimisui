import { MessageFlags, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import { env } from "../env.js";

export const reloadCommandsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reloadcommands")
    .setDescription("Re-register slash commands (guild/global).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("scope")
        .setDescription("Where to register commands")
        .setRequired(true)
        .addChoices(
          { name: "Guild (fast)", value: "guild" },
          { name: "Global (all servers, slower propagation)", value: "global" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("guild_id")
        .setDescription("Optional guild id override for guild scope")
        .setRequired(false)
    ),
  async execute(interaction) {
    const { commands } = await import("./index.js");
    const scope = interaction.options.getString("scope", true);
    const guildIdOverride = interaction.options.getString("guild_id");
    const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
    const body = commands.map((command) => command.data.toJSON());

    if (scope === "global") {
      if (!env.BOT_OWNER_ID || interaction.user.id !== env.BOT_OWNER_ID) {
        await interaction.reply({
          content: "Global registration is restricted to BOT_OWNER_ID.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body });
      await interaction.editReply(
        `Registered ${commands.length} global command(s). Global propagation can take some time.`
      );
      return;
    }

    const guildId = guildIdOverride ?? interaction.guildId ?? env.GUILD_ID;
    if (!guildId) {
      await interaction.reply({
        content: "Guild scope requires a guild context or guild_id/GUILD_ID.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, guildId), { body });
    await interaction.editReply(`Registered ${commands.length} guild command(s) for guild ${guildId}.`);
  }
};
