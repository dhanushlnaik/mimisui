import Link from "next/link";
import { redirect } from "next/navigation";
import { SecondaryButton } from "@/components/ui";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTableCard } from "@/components/dashboard/data-table-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
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
    <main className="dashboard-shell mesh-layer">
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
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Partner" value={dashboard.viewer.partnerName ?? "None"} trend="flat" />
          <KpiCard title="Bond Level" value={dashboard.viewer.bondLevel} trend="up" />
          <KpiCard title="Bond Score" value={dashboard.viewer.bondScore} trend="up" />
          <KpiCard title="Total Dates" value={dashboard.viewer.totalDates} delta={`Siblings ${dashboard.viewer.siblingCount}`} trend="flat" />
        </section>
      ) : null}

      <section>
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

      <section>
        <FamilyAdminPanel guildId={guildId} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DataTableCard title="Top Couples (Bond)" count={dashboard.topCouples.length}>
          <div className="space-y-2 text-sm">
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
        </DataTableCard>

        <DataTableCard title="Season Ladder" count={dashboard.ladder.length}>
          <div className="space-y-2 text-sm">
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
        </DataTableCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DataTableCard title="Active Penalty Flags" count={dashboard.flags.length}>
          <div className="space-y-2 text-sm">
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
        </DataTableCard>

        <DataTableCard title="Moderation Logs" count={dashboard.logs.length}>
          <div className="space-y-2 text-sm">
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
        </DataTableCard>
      </section>

      <section>
        <ChartCard
          title="Settings History"
          description="Latest dashboard-side configuration changes with key-level diffs."
          actions={<span className="pill">WEB_GUILD_SETTINGS_UPDATE</span>}
        >
          <div className="space-y-2 text-sm">
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
        </ChartCard>
      </section>
    </main>
  );
}
