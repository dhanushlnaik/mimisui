"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FlatDocNode } from "@/lib/docs-tree";

export function DocsTreeNav({ nodes }: { nodes: FlatDocNode[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <Link
        href="/docs"
        className={`block rounded-lg px-3 py-2 text-sm transition ${
          pathname === "/docs"
            ? "bg-primary/15 text-foreground border border-primary/40"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        }`}
      >
        Overview
      </Link>
      {nodes.map((node) => {
        const active = pathname === node.href;
        return (
          <Link
            key={node.href}
            href={node.href as any}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-primary/15 text-foreground border border-primary/40"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
            style={{ paddingLeft: `${12 + node.depth * 14}px` }}
          >
            {node.title}
          </Link>
        );
      })}
    </nav>
  );
}
