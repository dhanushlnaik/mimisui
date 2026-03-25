import { Client, GatewayIntentBits, MessageFlags, Partials } from "discord.js";
import { performance } from "node:perf_hooks";
import { commands, commandMap } from "./commands/index.js";
import { env } from "./env.js";
import { registerMessageCreate } from "./events/message-create.js";
import {
  handleFamilyAchievementButton,
  handleFamilySimulationPanelButton,
  handleFamilyProposalButton,
  handleFamilyQuestButton
} from "./lib/family.js";
import { handleFamilyPanelButton } from "./lib/family-ui.js";
import { handleHelpButton, handleHelpSelect } from "./lib/help-view.js";
import { logger } from "./lib/logger.js";
import { getPerfSummary, runWithPerfContext } from "./lib/perf-context.js";
import { grantCommandProgress } from "./lib/progression.js";
import { getAvatarUrl } from "./lib/user-avatar.js";
import { callWeebyCustom, weebyAttachment } from "./lib/weeby.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

function isUnknownInteractionError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 10062
  );
}

async function safeInteractionResponse(
  interaction: import("discord.js").Interaction,
  mode: "reply" | "followUp",
  payload: Parameters<import("discord.js").ChatInputCommandInteraction["reply"]>[0]
) {
  try {
    if (mode === "followUp" && "followUp" in interaction) {
      await interaction.followUp(payload);
      return;
    }
    if ("reply" in interaction) {
      await interaction.reply(payload);
    }
  } catch (error) {
    if (isUnknownInteractionError(error)) {
      logger.warn("Skipped stale interaction response (10062).");
      return;
    }
    throw error;
  }
}

client.once("clientReady", () => {
  logger.info(`Bot online as ${client.user?.tag ?? "unknown"}`);
});

client.on("warn", (msg) => logger.warn(msg));
client.on("error", (error) => logger.error("Discord client error", error));
process.on("unhandledRejection", (reason) => logger.error("Unhandled rejection", reason));
process.on("uncaughtException", (error) => logger.error("Uncaught exception", error));

async function applyInteractionProgress(
  interaction: import("discord.js").ChatInputCommandInteraction | import("discord.js").MessageContextMenuCommandInteraction,
  commandName: string
) {
  const progressStart = performance.now();
  try {
    const res = await grantCommandProgress({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      username: interaction.user.username,
      commandName
    });

    const notices: string[] = [];
    if (res.gainedXp > 0 || res.gainedCoins > 0) {
      notices.push(`+${res.gainedXp} XP`, `+${res.gainedCoins} coins`);
    }
    if (res.completedQuests.length > 0) {
      notices.push(`Quest complete: ${res.completedQuests.join(", ")}`);
    }

    if (res.levelUp) {
      notices.push(`Level up: **${res.levelUp.from} → ${res.levelUp.to}** (${res.levelUp.title})`);
      try {
        const card = await callWeebyCustom("levelup", {
          avatar: getAvatarUrl(interaction.user, 1024),
          bgColor: "1F2937",
          newlevel: String(res.levelUp.to),
          status: "22C55E",
          font: "nexa"
        });
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: notices.join("\n"),
            files: [weebyAttachment("levelup", card, "png")],
            flags: MessageFlags.Ephemeral
          });
          return;
        }
      } catch {
        // card is optional
      }
    }

    if (notices.length > 0 && (interaction.deferred || interaction.replied)) {
      await safeInteractionResponse(interaction, "followUp", {
        content: notices.join("\n"),
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    logger.error("Progression update failed", error);
  } finally {
    const progressMs = Math.round(performance.now() - progressStart);
    if (progressMs >= 300) {
      logger.warn(`Slow progression update: ${interaction.commandName} took ${progressMs}ms`);
    } else {
      logger.info(`Progression update: ${interaction.commandName} took ${progressMs}ms`);
    }
  }
}

client.on("interactionCreate", async (interaction) => {
  const interactionKey = `${interaction.id}:${interaction.user.id}`;
  if (interaction.isStringSelectMenu()) {
    const handled = await handleHelpSelect(interaction);
    if (handled) return;
  }
  if (interaction.isButton()) {
    const handledFamily = await handleFamilyProposalButton(interaction);
    if (handledFamily) return;
    const handledFamilyQuest = await handleFamilyQuestButton(interaction);
    if (handledFamilyQuest) return;
    const handledFamilyAchievement = await handleFamilyAchievementButton(interaction);
    if (handledFamilyAchievement) return;
    const handledFamilySimulationPanel = await handleFamilySimulationPanelButton(interaction);
    if (handledFamilySimulationPanel) return;
    const handledFamilyPanel = await handleFamilyPanelButton(interaction, client);
    if (handledFamilyPanel) return;
    const handled = await handleHelpButton(interaction);
    if (handled) return;
  }

  if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    await safeInteractionResponse(interaction, "reply", {
      content: "Unknown command.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    if (interaction.isChatInputCommand()) {
      await runWithPerfContext(interactionKey, async () => {
      const execStart = performance.now();
      if (command.type && command.type !== interaction.commandType) {
        await safeInteractionResponse(interaction, "reply", {
          content: "Wrong command type.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      await command.execute(interaction);
      const execMs = Math.round(performance.now() - execStart);
      if (execMs >= 1500) {
        logger.warn(
          `Slow command execute: /${interaction.commandName} ${execMs}ms (guild=${interaction.guildId ?? "dm"} user=${interaction.user.id})`
        );
      } else {
        logger.info(
          `Command execute: /${interaction.commandName} ${execMs}ms (guild=${interaction.guildId ?? "dm"} user=${interaction.user.id})`
        );
      }
      const progStart = performance.now();
      await applyInteractionProgress(interaction, interaction.commandName);
      const progMs = Math.round(performance.now() - progStart);
      const totalMs = Math.round(performance.now() - execStart);
      const perf = getPerfSummary();
      logger.info(
        `Command done: /${interaction.commandName} total=${totalMs}ms execute=${execMs}ms progression=${progMs}ms` +
          (perf
            ? ` dbMs=${perf.dbTotalMs} dbOps=${perf.dbOps}` +
              (perf.topDb.length > 0 ? ` topDb=[${perf.topDb.join(", ")}]` : "")
            : "")
      );
      return;
      });
      return;
    }

    if (interaction.isMessageContextMenuCommand()) {
      await runWithPerfContext(interactionKey, async () => {
      const execStart = performance.now();
      if (command.type !== interaction.commandType) {
        await safeInteractionResponse(interaction, "reply", {
          content: "Wrong command type.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      await command.execute(interaction);
      const execMs = Math.round(performance.now() - execStart);
      if (execMs >= 1500) {
        logger.warn(
          `Slow command execute: ${interaction.commandName} ${execMs}ms (guild=${interaction.guildId ?? "dm"} user=${interaction.user.id})`
        );
      } else {
        logger.info(
          `Command execute: ${interaction.commandName} ${execMs}ms (guild=${interaction.guildId ?? "dm"} user=${interaction.user.id})`
        );
      }
      const progStart = performance.now();
      await applyInteractionProgress(interaction, interaction.commandName);
      const progMs = Math.round(performance.now() - progStart);
      const totalMs = Math.round(performance.now() - execStart);
      const perf = getPerfSummary();
      logger.info(
        `Command done: ${interaction.commandName} total=${totalMs}ms execute=${execMs}ms progression=${progMs}ms` +
          (perf
            ? ` dbMs=${perf.dbTotalMs} dbOps=${perf.dbOps}` +
              (perf.topDb.length > 0 ? ` topDb=[${perf.topDb.join(", ")}]` : "")
            : "")
      );
      return;
      });
      return;
    }
  } catch (error) {
    logger.error(`Command failed: ${interaction.commandName}`, error);
    if (interaction.deferred || interaction.replied) {
      await safeInteractionResponse(interaction, "followUp", {
        content: "Something went wrong.",
        flags: MessageFlags.Ephemeral
      });
    } else {
      await safeInteractionResponse(interaction, "reply", {
        content: "Something went wrong.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
});

registerMessageCreate(client);

void client.login(env.DISCORD_TOKEN);

void commands;
