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

function pushHistory(
  history: Record<string, CustomCommandVersion[]>,
  commandId: string,
  snapshot: CustomCommand,
  actorUserId: string,
  reason: string
) {
  const existing = history[commandId] ?? [];
  history[commandId] = [
    {
      id: randomUUID(),
      commandId,
      version: snapshot.version,
      snapshot,
      createdAt: new Date().toISOString(),
      actorUserId,
      reason
    },
    ...existing
  ].slice(0, 30);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUserId = await requireAuthUserId();
    const { id } = await params;
    const body = (await req.json()) as { guildId?: string; historyId?: string };
    if (!body.guildId || !body.historyId) return fail("guildId and historyId are required.", 400, "BAD_REQUEST");

    const guild = await assertManagedGuild(authUserId, body.guildId);
    const settings = withDefaults(guild.settings) as Record<string, unknown>;
    const items = readCustomCommands(guild.settings);
    const history = readCustomCommandHistory(guild.settings);
    const versions = history[id] ?? [];
    const idx = items.findIndex((item) => item.id === id);
    if (idx < 0) return fail("Custom command not found.", 404, "NOT_FOUND");
    const target = versions.find((entry) => entry.id === body.historyId);
    if (!target) return fail("History entry not found.", 404, "NOT_FOUND");

    const current = items[idx]!;
    pushHistory(history, id, current, authUserId, "restore_checkpoint");
    items[idx] = {
      ...target.snapshot,
      version: current.version + 1,
      updatedAt: new Date().toISOString()
    };

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
