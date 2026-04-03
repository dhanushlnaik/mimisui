import type { ReactNode } from "react";
import Link from "next/link";
import { SecondaryButton } from "@/components/ui";
import { DocsTreeNav } from "@/components/docs-tree-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { flattenDocTree } from "@/lib/docs-tree";

export default function DocsLayout({ children }: { children: ReactNode }) {
  const flat = flattenDocTree();

  return (
    <main className="app-shell">
      <header className="dash-topbar">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-sm font-semibold text-foreground">
              MiMisui Docs
            </Link>
            <span className="pill hidden sm:inline-flex">Dynamic Help Tree</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="dashboard-shell grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-card sticky top-16 h-[calc(100vh-90px)] p-3">
          <div className="flex items-center justify-between">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Docs Tree
            </p>
            <Link href="/" className="text-xs text-primary hover:underline">Home</Link>
          </div>
          <div className="mt-1 max-h-[calc(100vh-155px)] overflow-y-auto pr-1">
            <DocsTreeNav nodes={flat} />
          </div>
          <div className="mt-3 flex gap-2">
            <Link href="/dashboard" className="w-full">
              <SecondaryButton className="w-full">Dashboard</SecondaryButton>
            </Link>
          </div>
        </aside>
        <div>{children}</div>
      </section>
    </main>
  );
}
