import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import { getRuntimeMetricsSnapshot } from "../lib/runtime-metrics.js";

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

export const botStatsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("botstats")
    .setDescription("Runtime performance snapshot (admin).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const stats = getRuntimeMetricsSnapshot();
    const top =
      stats.topCommands.length > 0
        ? stats.topCommands
            .map(
              (r, i) =>
                `${i + 1}. \`${r.command}\` • p50 \`${r.p50}ms\` • p95 \`${r.p95}ms\` • avg \`${r.avg}ms\` • fail \`${r.failures}/${r.count}\``
            )
            .join("\n")
        : "No command telemetry yet.";

    await interaction.reply({
      content: [
        `Uptime: **${fmtDuration(stats.uptimeSec)}**`,
        `Recent samples: **${stats.recentCount}**`,
        `Global latency: p50 **${stats.p50}ms** • p95 **${stats.p95}ms** • avg **${stats.avg}ms**`,
        `Failures: **${stats.commandFailures}** • Unknown interactions(10062): **${stats.unknownInteractionCount}**`,
        "",
        "**Top command hotspots**",
        top
      ].join("\n"),
      flags: MessageFlags.Ephemeral
    });
  }
};
