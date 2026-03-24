import { DEFAULT_GUILD_SETTINGS } from "@cocosui/config";
import { getGuildById, listManagedGuildsForAuthUser } from "@/lib/guilds";
import { Card } from "@/components/ui";
import { getServerSession } from "@/server/session";
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
  if (!manageableGuilds.some((guild) => guild.id === guildId)) {
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="persona-title text-3xl">{guild.name ?? guild.id}</h1>
      <p className="mt-2 text-muted-foreground">Guild configuration snapshot</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="dec-title text-xl">Prefix</h2>
          <p className="mt-2 text-muted-foreground">Current: <span className="font-medium text-foreground">{guild.prefix}</span></p>
        </Card>

        <Card>
          <h2 className="dec-title text-xl">Modules</h2>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {Object.entries(settings).map(([key, enabled]) => (
              <li key={key}>
                {key}: <span className="font-medium text-foreground">{enabled ? "Enabled" : "Disabled"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
