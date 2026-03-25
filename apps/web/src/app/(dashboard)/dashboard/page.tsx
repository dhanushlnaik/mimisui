import { GuildSelector } from "@/components/guild-selector";
import { AuthControls } from "@/components/auth-controls";
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
    <main className="mesh-layer mx-auto max-w-6xl px-4 py-10">
      <div className="glass-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="persona-title text-3xl md:text-4xl">Guild Control Center</h1>
            <p className="mt-2 text-muted-foreground">
              Pick a server you manage to configure core settings and run family simulation admin operations.
            </p>
          </div>
          <AuthControls />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <article className="glass-card p-4">
            <h2 className="dec-title text-lg">Prefix + Modules</h2>
            <p className="mt-2 text-sm text-muted-foreground">Quick visibility of server config and toggles.</p>
          </article>
        </div>
        <article className="glass-card p-4">
          <h2 className="dec-title text-lg">Family Admin</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use slash `familysimadminpanel` in Discord or open the new web Family Console from each guild page.
          </p>
        </article>
        <article className="glass-card p-4">
          <h2 className="dec-title text-lg">Docs</h2>
          <p className="mt-2 text-sm text-muted-foreground">Detailed setup and command docs are available at `/docs`.</p>
        </article>
      </div>

      <div className="mt-6">
        {guilds.length === 0 ? (
          <p className="glass-card p-4 text-muted-foreground">
            No manageable guilds found for this Discord account yet.
          </p>
        ) : (
          <GuildSelector guilds={guilds} />
        )}
      </div>
    </main>
  );
}
