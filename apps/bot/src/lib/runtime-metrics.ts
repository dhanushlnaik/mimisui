type CommandMetric = {
  command: string;
  durationMs: number;
  success: boolean;
  at: number;
};

const MAX_RECENT = 500;
const MAX_PER_COMMAND = 200;

const startedAt = Date.now();
const recent: CommandMetric[] = [];
const byCommand = new Map<string, CommandMetric[]>();
let unknownInteractionCount = 0;
let commandFailures = 0;

function percentile(nums: number[], p: number) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function pushMetric(metric: CommandMetric) {
  recent.push(metric);
  while (recent.length > MAX_RECENT) recent.shift();

  const bucket = byCommand.get(metric.command) ?? [];
  bucket.push(metric);
  while (bucket.length > MAX_PER_COMMAND) bucket.shift();
  byCommand.set(metric.command, bucket);
}

export function markUnknownInteraction() {
  unknownInteractionCount += 1;
}

export function recordCommandMetric(input: {
  command: string;
  durationMs: number;
  success: boolean;
}) {
  if (!input.success) commandFailures += 1;
  pushMetric({
    command: input.command,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    success: input.success,
    at: Date.now()
  });
}

export function getRuntimeMetricsSnapshot() {
  const durations = recent.map((m) => m.durationMs);
  const perCommand = [...byCommand.entries()]
    .map(([command, rows]) => {
      const ds = rows.map((r) => r.durationMs);
      const fail = rows.filter((r) => !r.success).length;
      return {
        command,
        count: rows.length,
        failures: fail,
        p50: percentile(ds, 50),
        p95: percentile(ds, 95),
        avg: ds.length > 0 ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0
      };
    })
    .sort((a, b) => b.p95 - a.p95 || b.failures - a.failures || b.count - a.count);

  return {
    uptimeSec: Math.max(1, Math.floor((Date.now() - startedAt) / 1000)),
    recentCount: recent.length,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    avg: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    commandFailures,
    unknownInteractionCount,
    topCommands: perCommand.slice(0, 8)
  };
}
