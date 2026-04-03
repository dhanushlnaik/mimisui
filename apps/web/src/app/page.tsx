import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="dash-topbar">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/" className="text-sm font-semibold text-foreground">
            MiMisui
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthControls compact />
          </div>
        </div>
      </header>

      <div className="mesh-layer mx-auto max-w-7xl px-4 py-10 md:py-14">
        <section className="glass-card fade-in-blur overflow-hidden p-7 md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-foreground/85">
                <span className="inline-block h-2 w-2 rounded-full bg-success" />
                MiMisui • Pretty Ops
              </div>
              <h1 className="persona-title mt-4 text-4xl leading-tight md:text-6xl">Run your server like a boss.</h1>
              <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
                A premium dark dashboard for commands, custom automations, family progression, simulations, and moderation safety.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <PrimaryButton>Open Dashboard</PrimaryButton>
                </Link>
                <Link href="/docs">
                  <SecondaryButton>Read Docs</SecondaryButton>
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-surface-1/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Control Preview</p>
              <div className="mt-3 space-y-2">
                {[
                  ["Overview", "Live guild health and snapshots"],
                  ["Commands", "Permission scope + cooldown controls"],
                  ["Custom Commands", "Builder, simulator, restore"],
                  ["Family + Simulation", "Progression, ladder, season controls"],
                  ["Audit Logs", "Flags, moderation, event timeline"]
                ].map(([title, sub]) => (
                  <div key={title} className="rounded-xl border border-border/70 bg-card/70 px-3 py-2">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Modules", "12", "production sections"],
              ["Stories", "18", "across commands + social"],
              ["Timeline", "8w", "delivery roadmap"],
              ["Sprints", "4", "2 weeks each"]
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-xl border border-border bg-surface-1/75 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-5">
          {[
            ["🎯 Overview", "Guild health, key stats, quick actions."],
            ["⚡ Commands", "Manage every command and runtime scope."],
            ["🧠 Custom Commands", "Builder, simulator, history, restore."],
            ["💞 Family + Sim", "Relationship progression and season controls."],
            ["🧾 Audit + Safety", "Penalty flags, moderation logs, risk tooling."]
          ].map(([title, desc]) => (
            <article key={title} className="glass-card dash-grid p-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="glass-card p-5">
            <h3 className="dec-title text-2xl">Design Philosophy</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dark-first, high-density, and expressive. Cute where it can be, crisp where it must be.
            </p>
          </article>
          <article className="glass-card p-5">
            <h3 className="dec-title text-2xl">Operational Scope</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Full bot management from web: prefix/modules, command controls, custom commands, family systems,
              progression, moderation, and docs.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
