import Link from "next/link";
import { GuildSelector } from "@/components/guild-selector";
import { AuthControls } from "@/components/auth-controls";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { listManagedGuildsForAuthUser } from "@/lib/guilds";
import { getServerSession } from "@/server/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession();
  const authUserId = session?.user?.id;

  if (!authUserId) {
    redirect("/");
  }

  const guilds = await listManagedGuildsForAuthUser(authUserId);

  return (
    <main className="app-shell">
      <header className="dash-topbar">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/" className="text-sm font-semibold text-foreground">
            MiMisui • Guild Select
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthControls compact />
          </div>
        </div>
      </header>

      <div className="dashboard-shell mesh-layer">
        <section className="glass-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="pill">MiMisui Dashboard</span>
              <span className="pill">Pretty + Sassy Mode</span>
              <span className="pill">Pick your kingdom</span>
            </div>
            <h1 className="persona-title mt-3 text-4xl md:text-5xl">Select a server and slay.</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Open your server workspace to configure commands, custom automations, family progression, and moderation safety with style.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/docs" className="pill hover:border-primary hover:text-foreground">
                Open Full Docs
              </Link>
              <a href="https://discord.gg/eZFKMmS6vz" target="_blank" rel="noreferrer" className="pill hover:border-primary hover:text-foreground">
                Join Support Server
              </a>
            </div>
          </div>
        </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Guilds" value={guilds.length} delta="manageable servers" trend="flat" />
          <KpiCard title="Commands" value="Live" delta="scope + cooldown controls" trend="up" />
          <KpiCard title="Custom Commands" value="Builder" delta="simulator + history restore" trend="up" />
          <KpiCard title="Family System" value="Enabled" delta="progression + moderation safety" trend="flat" />
        </section>

        <section>
          {guilds.length === 0 ? (
            <EmptyState
              title="No Manageable Guilds Found"
              description="Invite MiMisui to your server and ensure your Discord account has Manage Server permission."
            />
          ) : (
            <GuildSelector guilds={guilds} />
          )}
        </section>
      </div>
    </main>
  );
}
