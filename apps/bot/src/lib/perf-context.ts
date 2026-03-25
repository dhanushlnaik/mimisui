import { AsyncLocalStorage } from "node:async_hooks";

type DbSample = {
  label: string;
  ms: number;
};

type PerfContext = {
  key: string;
  dbTotalMs: number;
  dbOps: number;
  dbSamples: DbSample[];
};

const perfStore = new AsyncLocalStorage<PerfContext>();

export async function runWithPerfContext<T>(key: string, fn: () => Promise<T>) {
  const ctx: PerfContext = { key, dbTotalMs: 0, dbOps: 0, dbSamples: [] };
  return perfStore.run(ctx, fn);
}

export function recordDbTiming(label: string, ms: number) {
  const ctx = perfStore.getStore();
  if (!ctx) return;
  ctx.dbTotalMs += ms;
  ctx.dbOps += 1;
  ctx.dbSamples.push({ label, ms });
}

export function getPerfSummary() {
  const ctx = perfStore.getStore();
  if (!ctx) return null;
  const top = [...ctx.dbSamples].sort((a, b) => b.ms - a.ms).slice(0, 3);
  return {
    key: ctx.key,
    dbTotalMs: Math.round(ctx.dbTotalMs),
    dbOps: ctx.dbOps,
    topDb: top.map((x) => `${x.label}:${Math.round(x.ms)}ms`)
  };
}

