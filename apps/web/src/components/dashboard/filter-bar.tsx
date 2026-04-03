import type { ReactNode } from "react";
import { SecondaryButton } from "@/components/ui";

type FilterBarProps = {
  filters?: ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
};

export function FilterBar({ filters, onReset, resetLabel = "Reset", className }: FilterBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/50 p-2 ${className ?? ""}`}
    >
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      {onReset ? (
        <SecondaryButton type="button" className="ml-auto h-8 px-3 py-1 text-xs" onClick={onReset}>
          {resetLabel}
        </SecondaryButton>
      ) : null}
    </div>
  );
}
