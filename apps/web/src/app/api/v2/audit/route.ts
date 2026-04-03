import { db } from "@cocosui/db";
import { fail, ok } from "@/lib/api";
import { assertManagedGuild } from "@/lib/dashboard";
import { requireAuthUserId } from "@/lib/dashboard-auth";

export async function GET(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guildId");
    const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") ?? 60)));
    if (!guildId) return fail("guildId is required.", 400, "BAD_REQUEST");

    await assertManagedGuild(authUserId, guildId);
    const [logs, flags, events] = await Promise.all([
      db.familyModerationLog.findMany({
        where: { guildId },
        orderBy: { createdAt: "desc" },
        take: limit
      }),
      db.familyPenaltyFlag.findMany({
        where: { guildId },
        orderBy: { createdAt: "desc" },
        take: limit
      }),
      db.socialRelationshipEvent.findMany({
        where: {
          relationship: {
            guildOriginId: guildId
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit
      })
    ]);

    return ok({ guildId, logs, flags, events });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

