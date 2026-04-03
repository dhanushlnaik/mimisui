"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-catalog";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthControls } from "@/components/auth-controls";

type Props = {
  guildId: string;
  children: ReactNode;
};

export function DashboardChrome({ guildId, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(
    () => DASHBOARD_SECTIONS.filter((s) => s.key !== "overview").map((section) => {
      const href = section.key === "family" ? `/dashboard/${guildId}/family` : `/dashboard/${guildId}/${section.key}`;
      const active = pathname === href;
      return { ...section, href, active };
    }),
    [guildId, pathname]
  );

  return (
    <div className="app-shell">
      <header className="dash-topbar">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-muted-foreground lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              Menu
            </button>
            <Link href={`/dashboard/${guildId}`} className="text-sm font-semibold text-foreground">
              MiMisui • Control Hub
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/docs" className="pill hidden sm:inline-flex">Help Docs</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[auto_minmax(0,1fr)]">
        <aside
          className={`${mobileOpen ? "block" : "hidden"} sidebar-panel fixed inset-y-14 left-0 z-50 w-72 lg:static lg:block ${collapsed ? "lg:w-[88px]" : "lg:w-[280px]"}`}
        >
          <div className="flex h-full flex-col p-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-2/80 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">Guild {guildId.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">Boss mode enabled</p>
              </div>
              <button
                type="button"
                className="hidden rounded-md border border-border bg-surface-3 px-2 py-1 text-[11px] text-muted-foreground lg:inline-flex"
                onClick={() => setCollapsed((v) => !v)}
              >
                {collapsed ? ">>" : "<<"}
              </button>
            </div>

            <nav className="mt-3 space-y-1 overflow-y-auto">
              {nav.map((section) => (
                <Link
                  key={section.key}
                  href={section.href as any}
                  className={`sidebar-link ${section.active ? "sidebar-link-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="text-base">{section.icon}</span>
                  {!collapsed ? <span>{section.label}</span> : null}
                </Link>
              ))}
            </nav>

            <div className="mt-auto rounded-xl border border-border/70 bg-surface-2/75 p-3">
              {!collapsed ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signed In</p>
                  <div className="mt-2">
                    <AuthControls compact />
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-muted-foreground">:)</div>
              )}
            </div>
          </div>
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
        ) : null}

        <div className="min-h-[calc(100vh-56px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
