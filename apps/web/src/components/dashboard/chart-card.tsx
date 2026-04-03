import type { ReactNode } from "react";
import { Card } from "@/components/ui";

type ChartCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, description, actions, children, className }: ChartCardProps) {
  return (
    <Card className={`p-4 sm:p-5 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="dec-title text-xl">{title}</h3>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}
