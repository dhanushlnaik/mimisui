import { NextResponse } from "next/server";
import { db } from "@cocosui/db";
import { getServerSession } from "@/server/session";
import { listManagedGuildsForAuthUser } from "@/lib/guilds";
import { WEB_GUILD_SETTINGS_DEFAULTS } from "@/lib/family-dashboard";

type AllowedBooleanKey =
  | "afk"
  | "fun"
  | "games"
  | "utility"
  | "familyEnabled"
  | "marriageEnabled"
  | "siblingsEnabled"
  | "publicFamilyAnnouncements";

const BOOLEAN_KEYS: AllowedBooleanKey[] = [
  "afk",
  "fun",
  "games",
  "utility",
  "familyEnabled",
  "marriageEnabled",
  "siblingsEnabled",
  "publicFamilyAnnouncements"
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const authUserId = session?.user?.id;
    if (!authUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      guildId?: string;
      settings?: Record<string, unknown>;
    };
    if (!body.guildId || !body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ ok: false, error: "guildId and settings are required." }, { status: 400 });
    }

    const managed = await listManagedGuildsForAuthUser(authUserId);
    const permitted = managed.some((g: { id: string }) => g.id === body.guildId);
    if (!permitted) {
      return NextResponse.json({ ok: false, error: "You do not manage this guild." }, { status: 403 });
    }

    const existing = await db.guild.findUnique({ where: { id: body.guildId } });
    const next = {
      ...WEB_GUILD_SETTINGS_DEFAULTS,
      ...((existing?.settings as Record<string, unknown> | null) ?? {})
    } as Record<string, unknown>;
    const prev = {
      ...WEB_GUILD_SETTINGS_DEFAULTS,
      ...((existing?.settings as Record<string, unknown> | null) ?? {})
    } as Record<string, unknown>;

    for (const key of BOOLEAN_KEYS) {
      if (key in body.settings && typeof body.settings[key] === "boolean") {
        next[key] = body.settings[key];
      }
    }

    if ("relationshipRewardRate" in body.settings) {
      const raw = Number(body.settings.relationshipRewardRate);
      if (!Number.isFinite(raw)) {
        return NextResponse.json({ ok: false, error: "relationshipRewardRate must be a number." }, { status: 400 });
      }
      next.relationshipRewardRate = Math.min(5, Math.max(0.1, Math.round(raw * 100) / 100));
    }

    const changed: Array<{ key: string; from: unknown; to: unknown }> = [];
    for (const [key, value] of Object.entries(next)) {
      if (prev[key] !== value) {
        changed.push({ key, from: prev[key], to: value });
      }
    }

    const updated = await db.guild.update({
      where: { id: body.guildId },
      data: { settings: next }
    });

    if (changed.length > 0) {
      const account = await db.account.findFirst({
        where: { userId: authUserId, providerId: "discord" },
        orderBy: { updatedAt: "desc" }
      });
      await db.familyModerationLog.create({
        data: {
          guildId: body.guildId,
          userId: account?.accountId ?? null,
          action: "WEB_GUILD_SETTINGS_UPDATE",
          severity: "INFO",
          details: {
            changed
          }
        }
      });
    }

    return NextResponse.json({ ok: true, settings: updated.settings });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update settings.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
