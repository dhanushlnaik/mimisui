import type { ReactNode } from "react";
import { Card } from "@/components/ui";

type KpiCardProps = {
  title: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  loading?: boolean;
};

export function KpiCard({ title, value, delta, trend = "flat", icon, loading = false }: KpiCardProps) {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="bg-surface-1/85 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        {icon ? <span aria-hidden className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold sm:text-3xl">{loading ? "..." : value}</p>
      {delta ? (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs ${trendColor}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          {delta}
        </p>
      ) : null}
    </Card>
  );
}
