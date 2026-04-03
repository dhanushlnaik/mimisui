import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@cocosui/db";
import { SecondaryButton } from "@/components/ui";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTableCard } from "@/components/dashboard/data-table-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { FamilyAdminPanel } from "@/components/family-admin-panel";
import { AuditPanel } from "@/components/audit-panel";
import { CommandCenter } from "@/components/command-center";
import { CustomCommands } from "@/components/custom-commands";
import { PrefixModulesPanel } from "@/components/prefix-modules-panel";
import { DASHBOARD_SECTIONS, withDefaults } from "@/lib/dashboard";
import { getGuildFamilyDashboard } from "@/lib/family-dashboard";
import { getServerSession } from "@/server/session";

const VALID_SECTIONS = new Set(
  DASHBOARD_SECTIONS.map((s) => s.key).filter((key) => key !== "overview" && key !== "family")
);

export default async function DashboardSectionPage({
  params
}: {
  params: Promise<{ guildId: string; section: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/");

  const { guildId, section } = await params;
  if (!VALID_SECTIONS.has(section as any)) {
    redirect(`/dashboard/${guildId}`);
  }

  const meta = DASHBOARD_SECTIONS.find((s) => s.key === section)!;
  const dashboard = await getGuildFamilyDashboard(session.user.id, guildId).catch(() => null);
  if (!dashboard) redirect("/dashboard");

  if (section === "commands") {
    return (
      <main className="dashboard-shell">
        <CommandCenter guildId={guildId} />
      </main>
    );
  }

  if (section === "custom-commands") {
    return (
      <main className="dashboard-shell">
        <CustomCommands guildId={guildId} />
      </main>
    );
  }

  if (section === "prefix-modules") {
    const settings = withDefaults(dashboard.settings) as Record<string, unknown>;
    return (
      <main className="dashboard-shell">
        <PrefixModulesPanel
          guildId={guildId}
          initial={{
            afk: Boolean(settings.afk),
            fun: Boolean(settings.fun),
            games: Boolean(settings.games),
            utility: Boolean(settings.utility),
            familyEnabled: Boolean(settings.familyEnabled),
            marriageEnabled: Boolean(settings.marriageEnabled),
            siblingsEnabled: Boolean(settings.siblingsEnabled),
            publicFamilyAnnouncements: Boolean(settings.publicFamilyAnnouncements),
            relationshipRewardRate: Number(settings.relationshipRewardRate ?? 1),
            prefix: dashboard.guild?.prefix ?? "!"
          }}
        />
      </main>
    );
  }

  if (section === "simulation") {
    return (
      <main className="dashboard-shell">
        <ChartCard
          title="Simulation Operations"
          description={`Season key: ${dashboard.seasonKey} • Ladder entries: ${dashboard.ladder.length}`}
          actions={<span className="pill">Top 12</span>}
        >
          <FilterBar
            filters={
              <>
                <span className="pill">Sorted by points</span>
                <span className="pill">Includes best streak</span>
              </>
            }
          />
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {dashboard.ladder.slice(0, 12).map((row) => (
              <div key={row.id} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                <p className="font-medium text-foreground">
                  {row.leftName} ♡ {row.rightName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.tier} • {row.points} pts • Best WS {row.bestWinStreak}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
        <FamilyAdminPanel guildId={guildId} />
      </main>
    );
  }

  if (section === "economy") {
    const topProfiles = await db.userProgress.findMany({
      where: { guildId },
      orderBy: [{ level: "desc" }, { xp: "desc" }],
      take: 20
    });
    return (
      <main className="dashboard-shell">
        <DataTableCard
          title="Economy & Progression"
          count={topProfiles.length}
          toolbar={<span className="pill">Sorted by level/xp</span>}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Guild progression view by level/xp with quick monitoring for web-side operations.
          </p>
          <div className="grid gap-2 lg:grid-cols-2">
            {topProfiles.map((profile: { userId: string; level: number; xp: number; coins: number }) => (
              <div key={profile.userId} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                <p className="font-medium text-foreground">{profile.userId}</p>
                <p className="text-xs text-muted-foreground">
                  Level {profile.level} • XP {profile.xp} • Coins {profile.coins}
                </p>
              </div>
            ))}
          </div>
        </DataTableCard>
      </main>
    );
  }

  if (section === "moderation-safety") {
    return (
      <main className="dashboard-shell">
        <ChartCard
          title="Moderation & Safety"
          description="Anti-abuse logs, active penalties, and manual clear workflows."
          actions={<span className="pill">Operational panel</span>}
        >
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
              <h3 className="font-semibold">Active Flags</h3>
              <p className="text-sm text-muted-foreground">{dashboard.summary.activePenaltyFlags}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
              <h3 className="font-semibold">Recent Logs</h3>
              <p className="text-sm text-muted-foreground">{dashboard.logs.length}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
              <h3 className="font-semibold">Season Claims</h3>
              <p className="text-sm text-muted-foreground">{dashboard.summary.seasonClaims}</p>
            </div>
          </div>
        </ChartCard>
        <FamilyAdminPanel guildId={guildId} />
      </main>
    );
  }

  if (section === "audit-logs") {
    return (
      <main className="dashboard-shell">
        <AuditPanel guildId={guildId} />
      </main>
    );
  }

  if (section === "integrations") {
    return (
      <main className="dashboard-shell">
        <DataTableCard
          title="Integrations"
          count={6}
          toolbar={<span className="pill">Service health overview</span>}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Manage Discord integration state and media automation capabilities.
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Discord OAuth", "Connected via Better Auth sessions"],
              ["Slash Commands", "Managed through bot register workflow"],
              ["Image Generators", "Quote, Tweet, UK07, Simp, Overlays"],
              ["Weeby API", "GIF/custom generator provider"],
              ["Neon Postgres", "Shared state for bot and dashboard"],
              ["PM2 Runtime", "Ubuntu production bot process"]
            ].map(([title, desc]) => (
              <div key={title} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </DataTableCard>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <EmptyState
        title={`${meta.icon} ${meta.label}`}
        description="Full product docs and command references are available in the docs hub."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/docs">
              <SecondaryButton>Open Global Docs</SecondaryButton>
            </Link>
            <Link href={`/dashboard/${guildId}/commands` as any}>
              <SecondaryButton>Command Reference</SecondaryButton>
            </Link>
            <Link href={`/dashboard/${guildId}/custom-commands` as any}>
              <SecondaryButton>Custom Command Guide</SecondaryButton>
            </Link>
          </div>
        }
      />
    </main>
  );
}
