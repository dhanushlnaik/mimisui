import Link from "next/link";
import { SecondaryButton } from "@/components/ui";

const sections = [
  {
    title: "Setup",
    items: [
      "Monorepo install and environment setup",
      "Prisma client generation and schema push",
      "Bot command registration + startup"
    ]
  },
  {
    title: "Family System",
    items: [
      "Partner/sibling relationships",
      "Bond XP, levels, and score progression",
      "Quest and achievement flows"
    ]
  },
  {
    title: "Family Simulation",
    items: [
      "Season start/end and ladder operations",
      "Duel, streaks, milestones, and rewards",
      "Audit logs and moderation controls"
    ]
  },
  {
    title: "Operations",
    items: [
      "Ubuntu + PM2 deployment",
      "Crash protection and restart behavior",
      "Troubleshooting known runtime issues"
    ]
  }
];

export default function DocsPage() {
  return (
    <main className="mesh-layer mx-auto max-w-6xl px-4 py-12">
      <section className="glass-card p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="persona-title text-4xl md:text-5xl">CoCo-sui Docs</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Product-level docs for the bot, dashboard, family progression system, simulation ladder,
              admin controls, anti-abuse, and deployment.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <SecondaryButton>Home</SecondaryButton>
            </Link>
            <Link href="/dashboard">
              <SecondaryButton>Dashboard</SecondaryButton>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="glass-card dash-grid p-5">
            <h2 className="dec-title text-2xl">{section.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {section.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-6 glass-card p-5">
        <h2 className="dec-title text-2xl">Source Docs</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Full markdown docs are stored in the repo <code>docs/</code> directory and track current
          implementation details and commands.
        </p>
      </section>
    </main>
  );
}
