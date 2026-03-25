import Link from "next/link";
import { redirect } from "next/navigation";
import { SecondaryButton, Card } from "@/components/ui";
import { getServerSession } from "@/server/session";
import { getGuildFamilyDashboard } from "@/lib/family-dashboard";
import { FamilyAdminPanel } from "@/components/family-admin-panel";
import { GuildFamilySettingsPanel } from "@/components/guild-family-settings-panel";

export default async function GuildFamilyPage({
  params
}: {
  params: Promise<{ guildId: string }>;
}) {
  const session = await getServerSession();
  const authUserId = session?.user?.id;
  if (!authUserId) {
    redirect("/");
  }

  const { guildId } = await params;
  const dashboard = await getGuildFamilyDashboard(authUserId, guildId).catch(() => null);
  if (!dashboard) {
    redirect("/dashboard");
  }

  return (
    <main className="mesh-layer mx-auto max-w-6xl px-4 py-10">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="persona-title text-3xl md:text-4xl">
              Family Progression Console
            </h1>
            <p className="mt-2 text-muted-foreground">
              Guild: {dashboard.guild?.name ?? guildId} • Active season: {dashboard.seasonKey}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="pill">Reward Rate: {dashboard.rewardRate}x</span>
              <span className="pill">Couples: {dashboard.summary.activeCouples}</span>
              <span className="pill">Siblings: {dashboard.summary.activeSiblings}</span>
              <span className="pill">Active Flags: {dashboard.summary.activePenaltyFlags}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/${guildId}`}>
              <SecondaryButton>Guild Overview</SecondaryButton>
            </Link>
            <Link href="/docs">
              <SecondaryButton>Documentation</SecondaryButton>
            </Link>
          </div>
        </div>
      </section>

      {dashboard.viewer ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="glass-card">
            <h2 className="dec-title text-xl">Your Family Snapshot</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Partner: <span className="font-medium text-foreground">{dashboard.viewer.partnerName ?? "None"}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bond Level: <span className="font-medium text-foreground">{dashboard.viewer.bondLevel}</span> • Bond Score:{" "}
              <span className="font-medium text-foreground">{dashboard.viewer.bondScore}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Total Dates: <span className="font-medium text-foreground">{dashboard.viewer.totalDates}</span> • Siblings:{" "}
              <span className="font-medium text-foreground">{dashboard.viewer.siblingCount}</span>
            </p>
          </Card>
          <Card className="glass-card dash-grid">
            <h2 className="dec-title text-xl">Parity Notes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This page now includes read parity (profiles, ladder, logs) and action parity (season/ladder ops, penalties, and user claims).
            </p>
          </Card>
        </section>
      ) : null}

      <section className="mt-6">
        <GuildFamilySettingsPanel
          guildId={guildId}
          initialSettings={{
            afk: Boolean(dashboard.settings.afk),
            fun: Boolean(dashboard.settings.fun),
            games: Boolean(dashboard.settings.games),
            utility: Boolean(dashboard.settings.utility),
            familyEnabled: Boolean(dashboard.settings.familyEnabled),
            marriageEnabled: Boolean(dashboard.settings.marriageEnabled),
            siblingsEnabled: Boolean(dashboard.settings.siblingsEnabled),
            publicFamilyAnnouncements: Boolean(dashboard.settings.publicFamilyAnnouncements),
            relationshipRewardRate: Number(dashboard.settings.relationshipRewardRate ?? 1)
          }}
        />
      </section>

      <section className="mt-6">
        <FamilyAdminPanel guildId={guildId} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <h3 className="dec-title text-xl">Top Couples (Bond)</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.topCouples.length === 0 ? (
              <p className="text-muted-foreground">No active couples yet.</p>
            ) : (
              dashboard.topCouples.map((row: any, idx: number) => (
                <div key={row.id} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                  <div className="font-medium text-foreground">
                    {idx + 1}. {row.leftName} ♡ {row.rightName}
                  </div>
                  <div className="text-muted-foreground">
                    Bond Lv {row.bondLevel} • Score {row.bondScore} • Dates {row.totalDates} • Best Streak {row.bestStreak}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="glass-card">
          <h3 className="dec-title text-xl">Season Ladder</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.ladder.length === 0 ? (
              <p className="text-muted-foreground">No ladder entries yet.</p>
            ) : (
              dashboard.ladder.map((row: any, idx: number) => (
                <div key={row.id} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                  <div className="font-medium text-foreground">
                    {idx + 1}. {row.leftName} ♡ {row.rightName}
                  </div>
                  <div className="text-muted-foreground">
                    {row.tier} • {row.points} pts • Best Sim WS {row.bestWinStreak}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <h3 className="dec-title text-xl">Active Penalty Flags</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.flags.length === 0 ? (
              <p className="text-muted-foreground">No active flags.</p>
            ) : (
              dashboard.flags.map((row: any) => (
                <div key={row.id} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                  <div className="font-medium text-foreground">{row.flagType}</div>
                  <div className="text-muted-foreground">{row.reason}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="glass-card">
          <h3 className="dec-title text-xl">Moderation Logs</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.logs.length === 0 ? (
              <p className="text-muted-foreground">No moderation logs for this guild yet.</p>
            ) : (
              dashboard.logs.map((row: any) => (
                <div key={row.id} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                  <div className="font-medium text-foreground">
                    {row.action} • {row.severity}
                  </div>
                  <div className="text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="glass-card">
          <h3 className="dec-title text-xl">Settings History</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.logs.filter((row: any) => row.action === "WEB_GUILD_SETTINGS_UPDATE").length === 0 ? (
              <p className="text-muted-foreground">No web settings changes logged yet.</p>
            ) : (
              dashboard.logs
                .filter((row: any) => row.action === "WEB_GUILD_SETTINGS_UPDATE")
                .map((row: any) => {
                  const changed = Array.isArray((row.details as any)?.changed)
                    ? ((row.details as any).changed as Array<{ key: string; from: unknown; to: unknown }>)
                    : [];
                  return (
                    <div key={row.id} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                      <div className="font-medium text-foreground">
                        Settings updated • {new Date(row.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {changed.length === 0 ? (
                          <p>No key-level diff captured.</p>
                        ) : (
                          changed.map((entry, idx) => (
                            <p key={`${row.id}-${entry.key}-${idx}`}>
                              {entry.key}: <span className="text-foreground">{String(entry.from)}</span> →{" "}
                              <span className="text-foreground">{String(entry.to)}</span>
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
