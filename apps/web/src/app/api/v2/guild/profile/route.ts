import { db } from "@cocosui/db";
import { fail, ok } from "@/lib/api";
import { assertManagedGuild, mergeGuildUpdate, readCustomCommands, withDefaults } from "@/lib/dashboard";
import { requireAuthUserId } from "@/lib/dashboard-auth";

export async function GET(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const guildId = new URL(req.url).searchParams.get("guildId");
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");

    const guild = await assertManagedGuild(authUserId, guildId);
    const settings = withDefaults(guild.settings);
    return ok({
      guild: {
        id: guild.id,
        name: guild.name,
        prefix: guild.prefix
      },
      settings,
      customCommandCount: readCustomCommands(guild.settings).length
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
      prefix?: string;
      moduleToggles?: Partial<Record<"afk" | "fun" | "games" | "utility", boolean>>;
      familyToggles?: Partial<
        Record<
          "familyEnabled" | "marriageEnabled" | "siblingsEnabled" | "publicFamilyAnnouncements",
          boolean
        >
      >;
      relationshipRewardRate?: number;
    };
    if (!body.guildId) return fail("guildId is required.", 400, "BAD_REQUEST");

    const guild = await assertManagedGuild(authUserId, body.guildId);
    const mergedSettings = mergeGuildUpdate(guild.settings, {
      prefix: body.prefix,
      moduleToggles: body.moduleToggles,
      familyToggles: body.familyToggles,
      relationshipRewardRate: body.relationshipRewardRate
    });

    const updated = await db.guild.update({
      where: { id: body.guildId },
      data: {
        prefix:
          typeof mergedSettings.prefix === "string" && mergedSettings.prefix.length > 0
            ? (mergedSettings.prefix as string)
            : guild.prefix,
        settings: mergedSettings
      }
    });

    return ok({
      guild: {
        id: updated.id,
        name: updated.name,
        prefix: updated.prefix
      },
      settings: withDefaults(updated.settings)
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

