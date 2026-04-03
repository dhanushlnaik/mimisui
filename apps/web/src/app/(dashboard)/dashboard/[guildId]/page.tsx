import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, SecondaryButton } from "@/components/ui";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard";
import { getGuildFamilyDashboard } from "@/lib/family-dashboard";
import { getServerSession } from "@/server/session";

export default async function GuildDetailPage({
  params
}: {
  params: Promise<{ guildId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/");

  const { guildId } = await params;
  const dashboard = await getGuildFamilyDashboard(session.user.id, guildId).catch(() => null);
  if (!dashboard) redirect("/dashboard");

  return (
    <main className="dashboard-shell mesh-layer">
      <section className="glass-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="pill">{dashboard.guild?.name ?? guildId}</span>
              <span className="pill">Season {dashboard.seasonKey}</span>
              <span className="pill">Reward {dashboard.rewardRate}x</span>
            </div>
            <h1 className="persona-title mt-3 text-3xl leading-tight md:text-5xl">Guild Control Center</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Everything in one spot: command scopes, custom automations, social progression, and safety controls. Keep it cute, keep it sharp.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/${guildId}/commands`}>
              <SecondaryButton>Open Commands</SecondaryButton>
            </Link>
            <Link href={`/dashboard/${guildId}/family`}>
              <SecondaryButton>Open Family</SecondaryButton>
            </Link>
            <Link href="/dashboard">
              <SecondaryButton>All Guilds</SecondaryButton>
            </Link>
            <Link href="/docs">
              <SecondaryButton>Docs</SecondaryButton>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Active Couples" value={dashboard.summary.activeCouples} trend="up" />
          <KpiCard title="Active Siblings" value={dashboard.summary.activeSiblings} trend="up" />
          <KpiCard title="Penalty Flags" value={dashboard.summary.activePenaltyFlags} trend="flat" />
          <KpiCard title="Season Claims" value={dashboard.summary.seasonClaims} trend="flat" />
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="glass-card p-3">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Quick Nav</p>
          <nav className="mt-2 space-y-1">
            {DASHBOARD_SECTIONS.filter((s) => s.key !== "overview").map((section) => (
              <Link
                key={`nav-${section.key}`}
                href={
                  (section.key === "family"
                    ? `/dashboard/${guildId}/family`
                    : `/dashboard/${guildId}/${section.key}`) as any
                }
                className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground transition hover:border-border hover:bg-background/60 hover:text-foreground"
              >
                <span>
                  {section.icon} {section.label}
                </span>
                <span>→</span>
              </Link>
            ))}
          </nav>
        </aside>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DASHBOARD_SECTIONS.filter((s) => s.key !== "overview").map((section) => (
            <Link
              key={section.key}
              href={
                (section.key === "family"
                  ? `/dashboard/${guildId}/family`
                  : `/dashboard/${guildId}/${section.key}`) as any
              }
              className="glass-card group block p-4 transition duration-200 hover:border-primary"
            >
              <h2 className="text-lg font-semibold">
                {section.icon} {section.label}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
              <p className="mt-3 text-xs text-primary/80 transition group-hover:translate-x-0.5">Open panel →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Top Couple</h3>
          {dashboard.topCouples[0] ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {dashboard.topCouples[0].leftName} ♡ {dashboard.topCouples[0].rightName} • Bond Lv {dashboard.topCouples[0].bondLevel} • Score {dashboard.topCouples[0].bondScore}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No active couples yet.</p>
          )}
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Season Ladder Leader</h3>
          {dashboard.ladder[0] ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {dashboard.ladder[0].leftName} ♡ {dashboard.ladder[0].rightName} • {dashboard.ladder[0].tier} • {dashboard.ladder[0].points} pts
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No ladder entries yet.</p>
          )}
        </Card>
      </section>
    </main>
  );
}
