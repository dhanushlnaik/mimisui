import { randomUUID } from "node:crypto";
import { db } from "@cocosui/db";
import { fail, ok } from "@/lib/api";
import { assertManagedGuild, readCustomCommands, withDefaults, type CustomCommand } from "@/lib/dashboard";
import { requireAuthUserId } from "@/lib/dashboard-auth";

function nowIso() {
  return new Date().toISOString();
}

function normalizeCustomCommand(input: Partial<CustomCommand>, existing?: CustomCommand): CustomCommand {
  const base = existing ?? {
    id: randomUUID(),
    name: "New Command",
    trigger: "!hello",
    matchMode: "exact",
    responseType: "text",
    responseText: "Hello!",
    conditions: { roles: [], channels: [], cooldownSec: 0, requireModule: null },
    priority: 100,
    status: "draft",
    blockedPatterns: [],
    riskReviewRequired: false,
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  return {
    ...base,
    ...input,
    id: base.id,
    conditions: {
      roles: Array.isArray(input.conditions?.roles) ? input.conditions.roles.map(String) : base.conditions.roles,
      channels: Array.isArray(input.conditions?.channels)
        ? input.conditions.channels.map(String)
        : base.conditions.channels,
      cooldownSec:
        typeof input.conditions?.cooldownSec === "number"
          ? Math.max(0, Math.floor(input.conditions.cooldownSec))
          : base.conditions.cooldownSec,
      requireModule:
        typeof input.conditions?.requireModule === "string"
          ? input.conditions.requireModule
          : (base.conditions.requireModule ?? null)
    },
    priority: typeof input.priority === "number" ? Math.max(0, Math.floor(input.priority)) : base.priority,
    status: input.status === "published" ? "published" : input.status === "draft" ? "draft" : base.status,
    responseType: input.responseType === "embed" ? "embed" : "text",
    responseText: String(input.responseText ?? base.responseText).slice(0, 2000),
    blockedPatterns: Array.isArray(input.blockedPatterns) ? input.blockedPatterns.map(String).slice(0, 20) : base.blockedPatterns,
    version: existing ? existing.version + 1 : 1,
    createdAt: existing ? existing.createdAt : base.createdAt,
    updatedAt: nowIso()
  };
}

export async function GET(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const guildId = new URL(req.url).searchParams.get("guildId");
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");
    const guild = await assertManagedGuild(authUserId, guildId);
    return ok({
      guildId,
      items: readCustomCommands(guild.settings)
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

export async function POST(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const body = (await req.json()) as { guildId?: string; item?: Partial<CustomCommand> };
    if (!body.guildId || !body.item) return fail("guildId and item are required.", 400, "BAD_REQUEST");
    const guild = await assertManagedGuild(authUserId, body.guildId);
    const settings = withDefaults(guild.settings) as Record<string, unknown>;
    const list = readCustomCommands(guild.settings);
    const created = normalizeCustomCommand(body.item);
    list.unshift(created);
    await db.guild.update({
      where: { id: body.guildId },
      data: {
        settings: {
          ...settings,
          customCommands: list
        }
      }
    });
    return ok({ item: created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

