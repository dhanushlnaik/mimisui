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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="persona-title text-3xl">Guild Selector</h1>
          <p className="mt-2 text-muted-foreground">Pick a server you manage to configure prefix and modules.</p>
        </div>
        <AuthControls />
      </div>

      <div className="mt-6">
        {guilds.length === 0 ? (
          <p className="text-muted-foreground">
            No manageable guilds found for this Discord account yet.
          </p>
        ) : (
          <GuildSelector guilds={guilds} />
        )}
      </div>
    </main>
  );
}
