import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";
import { PrimaryButton, SecondaryButton } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mesh-layer mx-auto max-w-6xl px-4 py-14">
      <section className="glass-card p-8 md:p-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">CoCo-sui Platform</span>
          <span className="pill">Bot + Dashboard</span>
          <span className="pill">Neon Postgres</span>
        </div>
        <h1 className="persona-title mt-4 text-4xl leading-tight md:text-6xl">
          Discord Automation With
          <br />
          Social Progression Built In
        </h1>
        <p className="mt-5 max-w-3xl text-base text-muted-foreground md:text-lg">
          Decoupled architecture: bot on Ubuntu/Railway, dashboard on Vercel, both synced through one Neon
          Postgres database. Family simulation, anti-abuse controls, and progression are all production-ready.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard">
            <PrimaryButton>Open Dashboard</PrimaryButton>
          </Link>
          <Link href="/docs">
            <SecondaryButton>View Docs</SecondaryButton>
          </Link>
          <AuthControls />
          <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
            <SecondaryButton>Discord Developer Portal</SecondaryButton>
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="glass-card dash-grid p-5">
          <h2 className="dec-title text-xl">Family Simulation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Weekly ladder, duel system, milestones, seasonal claims, and relationship growth loops.
          </p>
        </article>
        <article className="glass-card dash-grid p-5">
          <h2 className="dec-title text-xl">Admin Safety</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Force season ops, anti-abuse audit trails, penalty escalation, lockouts, and manual clear with reason.
          </p>
        </article>
        <article className="glass-card dash-grid p-5">
          <h2 className="dec-title text-xl">Deployment Ready</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            PM2-friendly runtime, Neon-backed storage, and command parity across slash and prefix.
          </p>
        </article>
      </section>
    </main>
  );
}
