import type { ReactNode } from "react";
import { Card } from "@/components/ui";

type DataTableCardProps = {
  title: string;
  count?: number;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DataTableCard({ title, count, toolbar, children, className }: DataTableCardProps) {
  return (
    <Card className={`p-4 sm:p-5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="dec-title text-xl">{title}</h3>
          {typeof count === "number" ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{count} entries</p>
          ) : null}
        </div>
        {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}
