import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";
import { PrimaryButton, SecondaryButton } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <section className="rounded-2xl border border-border bg-card/70 p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">CoCo-sui Platform</p>
        <h1 className="persona-title mt-3 text-4xl md:text-5xl">Discord Bot + Web Control Center</h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Decoupled architecture: bot on Ubuntu/Railway, dashboard on Vercel, both synced through one Neon Postgres database.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard">
            <PrimaryButton>Open Dashboard</PrimaryButton>
          </Link>
          <AuthControls />
          <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
            <SecondaryButton>Discord Developer Portal</SecondaryButton>
          </a>
        </div>
      </section>
    </main>
  );
}
