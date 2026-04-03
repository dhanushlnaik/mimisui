import Link from "next/link";

type Guild = {
  id: string;
  name: string | null;
  prefix: string;
};

export function GuildSelector({ guilds }: { guilds: Guild[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {guilds.map((guild, idx) => (
        <article key={guild.id} className="guild-tile">
          <div
            className="relative h-28 rounded-xl border border-border/70 bg-surface-2"
            style={{
              backgroundImage:
                idx % 2 === 0
                  ? "linear-gradient(130deg, hsl(330 86% 54% / .34), hsl(14 92% 56% / .24), transparent)"
                  : "linear-gradient(130deg, hsl(155 76% 52% / .32), hsl(102 74% 48% / .2), transparent)"
            }}
          >
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 bg-background/90 text-center text-xl font-bold leading-[62px] text-foreground">
              {(guild.name ?? "G").slice(0, 1).toUpperCase()}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{guild.name ?? `Guild ${guild.id}`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Prefix {guild.prefix} • Server boss</p>
            </div>
            <Link href={`/dashboard/${guild.id}`} className="rounded-xl border border-primary/55 bg-primary/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/35">
              Go
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
