import { fail, ok } from "@/lib/api";
import { requireAuthUserId } from "@/lib/dashboard-auth";
import { assertManagedGuild } from "@/lib/dashboard";
import { getGuildRolesAndChannels } from "@/lib/discord";
import { env } from "@/env";

export async function GET(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const guildId = new URL(req.url).searchParams.get("guildId");
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");
    await assertManagedGuild(authUserId, guildId);

    if (!env.DISCORD_BOT_TOKEN) {
      return ok({
        guildId,
        roles: [],
        channels: [],
        warning: "DISCORD_BOT_TOKEN is not configured. Falling back to manual ID scopes."
      });
    }

    let meta: Awaited<ReturnType<typeof getGuildRolesAndChannels>> | null = null;
    let warning: string | undefined;
    try {
      meta = await getGuildRolesAndChannels(guildId, env.DISCORD_BOT_TOKEN);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load guild metadata.";
      warning = `Could not load roles/channels from Discord API (${msg}). Using manual ID fallback.`;
    }

    if (!meta) {
      return ok({
        guildId,
        roles: [],
        channels: [],
        warning
      });
    }

    return ok({
      guildId,
      warning,
      roles: meta.roles.map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        managed: Boolean(role.managed)
      })),
      channels: meta.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parent_id ?? null,
        position: channel.position ?? 0
      }))
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}
