import Link from "next/link";
import { DataTableCard } from "@/components/dashboard/data-table-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { flattenDocTree } from "@/lib/docs-tree";

export default function DocsPage() {
  const flat = flattenDocTree();
  const quickStart = flat.slice(0, 10);

  return (
    <div className="space-y-4">
      <DataTableCard title="Quick Setup Flow" count={quickStart.length} toolbar={<span className="pill">Start Here</span>}>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {quickStart.map((node, idx) => (
            <li key={node.href} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
              <p className="font-medium text-foreground">
                {idx + 1}. {node.title}
              </p>
              <p className="mt-1">{node.summary}</p>
              <Link href={node.href as any} className="mt-2 inline-block text-xs text-primary hover:underline">
                Dive in →
              </Link>
            </li>
          ))}
        </ol>
      </DataTableCard>

      <EmptyState
        title="Need the tea, not just the docs?"
        description="Use the left tree to jump to exact workflows. Every node is deep-linkable so you can share help pages with your admins instantly."
      />
    </div>
  );
}
