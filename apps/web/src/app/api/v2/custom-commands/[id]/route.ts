import { randomUUID } from "node:crypto";
import { db } from "@cocosui/db";
import { fail, ok } from "@/lib/api";
import {
  assertManagedGuild,
  readCustomCommandHistory,
  readCustomCommands,
  withDefaults,
  type CustomCommand,
  type CustomCommandVersion
} from "@/lib/dashboard";
import { requireAuthUserId } from "@/lib/dashboard-auth";

function patchItem(existing: CustomCommand, patch: Partial<CustomCommand>): CustomCommand {
  return {
    ...existing,
    ...patch,
    id: existing.id,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
    conditions: {
      roles: Array.isArray(patch.conditions?.roles) ? patch.conditions.roles.map(String) : existing.conditions.roles,
      channels: Array.isArray(patch.conditions?.channels)
        ? patch.conditions.channels.map(String)
        : existing.conditions.channels,
      cooldownSec:
        typeof patch.conditions?.cooldownSec === "number"
          ? Math.max(0, Math.floor(patch.conditions.cooldownSec))
          : existing.conditions.cooldownSec,
      requireModule:
        typeof patch.conditions?.requireModule === "string"
          ? patch.conditions.requireModule
          : existing.conditions.requireModule
    }
  };
}

function appendHistory(
  history: Record<string, CustomCommandVersion[]>,
  input: {
    commandId: string;
    snapshot: CustomCommand;
    actorUserId: string;
    reason: string;
  }
) {
  const list = history[input.commandId] ?? [];
  const entry: CustomCommandVersion = {
    id: randomUUID(),
    commandId: input.commandId,
    version: input.snapshot.version,
    snapshot: input.snapshot,
    createdAt: new Date().toISOString(),
    actorUserId: input.actorUserId,
    reason: input.reason
  };
  history[input.commandId] = [entry, ...list].slice(0, 30);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUserId = await requireAuthUserId();
    const { id } = await params;
    const guildId = new URL(req.url).searchParams.get("guildId");
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");
    const guild = await assertManagedGuild(authUserId, guildId);
    const command = readCustomCommands(guild.settings).find((item) => item.id === id);
    if (!command) return fail("Custom command not found.", 404, "NOT_FOUND");
    const history = readCustomCommandHistory(guild.settings)[id] ?? [];
    return ok({
      command,
      history
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUserId = await requireAuthUserId();
    const { id } = await params;
    const body = (await req.json()) as { guildId?: string; patch?: Partial<CustomCommand> };
    if (!body.guildId || !body.patch) return fail("guildId and patch are required.", 400, "BAD_REQUEST");
    const guild = await assertManagedGuild(authUserId, body.guildId);
    const settings = withDefaults(guild.settings) as Record<string, unknown>;
    const items = readCustomCommands(guild.settings);
    const history = readCustomCommandHistory(guild.settings);
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return fail("Custom command not found.", 404, "NOT_FOUND");
    const previous = items[idx]!;
    appendHistory(history, {
      commandId: id,
      snapshot: previous,
      actorUserId: authUserId,
      reason: "manual_edit"
    });
    items[idx] = patchItem(items[idx]!, body.patch);
    await db.guild.update({
      where: { id: body.guildId },
      data: { settings: { ...settings, customCommands: items, customCommandHistory: history } }
    });
    return ok({ item: items[idx] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUserId = await requireAuthUserId();
    const { id } = await params;
    const guildId = new URL(req.url).searchParams.get("guildId");
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");
    const guild = await assertManagedGuild(authUserId, guildId);
    const settings = withDefaults(guild.settings) as Record<string, unknown>;
    const existingItems = readCustomCommands(guild.settings);
    const history = readCustomCommandHistory(guild.settings);
    const existing = existingItems.find((i) => i.id === id);
    if (existing) {
      appendHistory(history, {
        commandId: id,
        snapshot: existing,
        actorUserId: authUserId,
        reason: "delete"
      });
    }
    const items = existingItems.filter((i) => i.id !== id);
    await db.guild.update({
      where: { id: guildId },
      data: { settings: { ...settings, customCommands: items, customCommandHistory: history } }
    });
    return ok({ removedId: id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}
