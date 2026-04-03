import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTableCard } from "@/components/dashboard/data-table-card";
import { findDocNode, flattenDocTree } from "@/lib/docs-tree";

export default async function DocDynamicPage({
  params
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = findDocNode(slug ?? []);
  if (!doc) return notFound();

  const all = flattenDocTree();
  const currentHref = `/docs/${(slug ?? []).join("/")}`;
  const idx = all.findIndex((row) => row.href === currentHref);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Docs</span>
        <span>/</span>
        <span>{doc.title}</span>
        <span className="pill ml-1">Medium Sass Mode</span>
      </div>

      <ChartCard title={doc.title} description={doc.summary} actions={<span className="pill">/{(slug ?? []).join("/")}</span>}>
        <div className="space-y-2 text-sm text-muted-foreground">
          {doc.content.map((line) => (
            <p key={line}>- {line}</p>
          ))}
        </div>
      </ChartCard>

      {doc.children?.length ? (
        <DataTableCard title="Subtopics" count={doc.children.length}>
          <div className="grid gap-2 md:grid-cols-2">
            {doc.children.map((child) => {
              const href = `${currentHref}/${child.slug}`;
              return (
                <Link key={href} href={href as any} className="rounded-lg border border-border/70 bg-card/70 px-3 py-2 transition hover:border-primary/40">
                  <p className="font-medium text-foreground">{child.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{child.summary}</p>
                </Link>
              );
            })}
          </div>
        </DataTableCard>
      ) : null}

      <DataTableCard title="Workflow Navigation">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous</p>
            {prev ? <Link className="mt-1 inline-block text-sm text-primary hover:underline" href={prev.href as any}>{prev.title}</Link> : <p className="mt-1 text-sm text-muted-foreground">Start of tree</p>}
          </div>
          <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next</p>
            {next ? <Link className="mt-1 inline-block text-sm text-primary hover:underline" href={next.href as any}>{next.title}</Link> : <p className="mt-1 text-sm text-muted-foreground">End of tree</p>}
          </div>
        </div>
      </DataTableCard>
    </div>
  );
}
