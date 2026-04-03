import { db } from "@cocosui/db";
import { fail, ok } from "@/lib/api";
import {
  assertManagedGuild,
  createDefaultCommandControl,
  readCommandControls,
  withDefaults,
  type CommandControl
} from "@/lib/dashboard";
import { getDocsCommandMeta } from "@/lib/dashboard-catalog";
import { requireAuthUserId } from "@/lib/dashboard-auth";

export async function GET(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const guildId = new URL(req.url).searchParams.get("guildId");
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");

    const guild = await assertManagedGuild(authUserId, guildId);
    const controls = readCommandControls(guild.settings);
    const uniqueByName = new Map<string, ReturnType<typeof getDocsCommandMeta>[number]>();
    for (const command of getDocsCommandMeta()) {
      if (!uniqueByName.has(command.name)) uniqueByName.set(command.name, command);
    }
    const catalog = [...uniqueByName.values()].map((command) => ({
      ...command,
      control: controls[command.name] ?? createDefaultCommandControl()
    }));

    return ok({
      guildId,
      catalog
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

export async function PATCH(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const body = (await req.json()) as {
      guildId?: string;
      command?: string;
      control?: Partial<CommandControl>;
    };
    if (!body.guildId || !body.command || !body.control) {
      return fail("guildId, command and control are required.", 400, "BAD_REQUEST");
    }

    const guild = await assertManagedGuild(authUserId, body.guildId);
    const settings = withDefaults(guild.settings) as Record<string, unknown>;
    const controls = readCommandControls(guild.settings);
    const current = controls[body.command] ?? createDefaultCommandControl();
    const nextControl: CommandControl = {
      enabled: typeof body.control.enabled === "boolean" ? body.control.enabled : current.enabled,
      visible: typeof body.control.visible === "boolean" ? body.control.visible : current.visible,
      cooldownSec:
        typeof body.control.cooldownSec === "number" && Number.isFinite(body.control.cooldownSec)
          ? Math.max(0, Math.floor(body.control.cooldownSec))
          : current.cooldownSec,
      roles: Array.isArray(body.control.roles) ? body.control.roles.map(String) : current.roles,
      channels: Array.isArray(body.control.channels)
        ? body.control.channels.map(String)
        : current.channels
    };
    controls[body.command] = nextControl;

    const updated = await db.guild.update({
      where: { id: body.guildId },
      data: {
        settings: {
          ...settings,
          commandControls: controls
        }
      }
    });

    return ok({
      guildId: body.guildId,
      command: body.command,
      control: (readCommandControls(updated.settings) as Record<string, CommandControl>)[body.command]
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}
