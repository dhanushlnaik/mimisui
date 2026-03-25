import { NextResponse } from "next/server";
import { getServerSession } from "@/server/session";
import { runGuildFamilyAdminAction } from "@/lib/family-dashboard";

type ActionName =
  | "season_start"
  | "season_end"
  | "ladder_reset"
  | "ladder_recompute"
  | "penalty_clear"
  | "season_claim"
  | "achievement_claim";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const authUserId = session?.user?.id;
    if (!authUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      guildId?: string;
      action?: ActionName;
      seasonKey?: string;
      reason?: string;
      note?: string;
      achievementKey?: string;
    };

    if (!body.guildId || !body.action) {
      return NextResponse.json({ ok: false, error: "guildId and action are required." }, { status: 400 });
    }

    const result = await runGuildFamilyAdminAction({
      authUserId,
      guildId: body.guildId,
      action: body.action,
      seasonKey: body.seasonKey,
      reason: body.reason,
      note: body.note,
      achievementKey: body.achievementKey
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Action failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
