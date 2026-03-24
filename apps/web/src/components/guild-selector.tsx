import Link from "next/link";
import { Card } from "./ui";

type Guild = {
  id: string;
  name: string | null;
  prefix: string;
};

export function GuildSelector({ guilds }: { guilds: Guild[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {guilds.map((guild) => (
        <Link key={guild.id} href={`/dashboard/${guild.id}`}>
          <Card>
            <h3 className="dec-title text-lg">{guild.name ?? `Guild ${guild.id}`}</h3>
            <p className="text-sm text-muted-foreground">Prefix: {guild.prefix}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
