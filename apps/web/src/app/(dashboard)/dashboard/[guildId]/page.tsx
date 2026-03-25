import { DEFAULT_GUILD_SETTINGS } from "@cocosui/config";
import { getGuildById, listManagedGuildsForAuthUser } from "@/lib/guilds";
import { Card, SecondaryButton } from "@/components/ui";
import { getServerSession } from "@/server/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GuildDetailPage({
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
  const manageableGuilds = await listManagedGuildsForAuthUser(authUserId);
  if (!manageableGuilds.some((managedGuild: { id: string }) => managedGuild.id === guildId)) {
    redirect("/dashboard");
  }
  const guild = await getGuildById(guildId);

  if (!guild) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="dec-title text-2xl">Guild not found</h1>
      </main>
    );
  }

  const settings = {
    ...DEFAULT_GUILD_SETTINGS,
    ...(guild.settings as Record<string, boolean>)
  };
  const enabledCount = Object.values(settings).filter(Boolean).length;
  const disabledCount = Object.values(settings).length - enabledCount;

  return (
    <main className="mesh-layer mx-auto max-w-6xl px-4 py-10">
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="persona-title text-3xl md:text-4xl">{guild.name ?? guild.id}</h1>
            <p className="mt-2 text-muted-foreground">
              Configuration snapshot for this server, plus family simulation admin operations.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="pill">Guild ID: {guild.id}</span>
              <span className="pill">Prefix: {guild.prefix}</span>
              <span className="pill">Modules: {enabledCount} enabled / {disabledCount} disabled</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard">
              <SecondaryButton>Back to Guilds</SecondaryButton>
            </Link>
            <Link href={`/dashboard/${guildId}/family`}>
              <SecondaryButton>Open Family Console</SecondaryButton>
            </Link>
            <Link href="/docs">
              <SecondaryButton>Open Docs</SecondaryButton>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="glass-card dash-grid">
          <h2 className="dec-title text-xl">Prefix</h2>
          <p className="mt-2 text-muted-foreground">
            Current: <span className="font-medium text-foreground">{guild.prefix}</span>
          </p>
        </Card>

        <Card className="glass-card dash-grid">
          <h2 className="dec-title text-xl">Family Admin Panel</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run <span className="font-medium text-foreground">/familysimadminpanel</span> in Discord to control:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>start/end season</li>
            <li>reset/recompute ladder</li>
            <li>audit and clear penalty flags</li>
          </ul>
        </Card>

        <Card className="glass-card dash-grid">
          <h2 className="dec-title text-xl">Safety</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Anti-abuse checks are active for collusion patterns, repeated duel farming, and escalation lockouts.
          </p>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="glass-card">
          <h2 className="dec-title text-xl">Modules</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {Object.entries(settings).map(([key, enabled]) => (
              <li key={key} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                <span className="font-medium text-foreground">{key}</span>
                <span className="ml-2 text-muted-foreground">
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}
