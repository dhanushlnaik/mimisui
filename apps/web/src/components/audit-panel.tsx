"use client";

import { useEffect, useState } from "react";
import { PrimaryButton } from "./ui";

type AuditData = {
  logs: Array<{ id: string; action: string; severity: string; createdAt: string }>;
  flags: Array<{ id: string; flagType: string; reason: string; active: boolean; createdAt: string }>;
  events: Array<{ id: string; eventType: string; createdAt: string }>;
};

export function AuditPanel({ guildId }: { guildId: string }) {
  const [data, setData] = useState<AuditData>({ logs: [], flags: [], events: [] });
  const [status, setStatus] = useState("Loading audit stream...");

  async function load() {
    setStatus("Loading audit stream...");
    const res = await fetch(`/api/audit?guildId=${encodeURIComponent(guildId)}&limit=80`);
    const json = (await res.json()) as { ok: boolean; data?: AuditData; error?: string };
    if (!json.ok || !json.data) {
      setStatus(`Failed: ${json.error ?? "Unknown error"}`);
      return;
    }
    setData(json.data);
    setStatus("Audit stream updated.");
  }

  useEffect(() => {
    void load();
  }, [guildId]);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="glass-card p-4">
        <h3 className="dec-title text-xl">Moderation Logs</h3>
        <div className="mt-3 space-y-2 text-sm">
          {data.logs.slice(0, 20).map((log) => (
            <div key={log.id} className="rounded-lg border border-border/70 bg-card/70 px-2 py-2">
              <p className="font-medium">{log.action}</p>
              <p className="text-xs text-muted-foreground">{log.severity} • {new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="glass-card p-4">
        <h3 className="dec-title text-xl">Penalty Flags</h3>
        <div className="mt-3 space-y-2 text-sm">
          {data.flags.slice(0, 20).map((flag) => (
            <div key={flag.id} className="rounded-lg border border-border/70 bg-card/70 px-2 py-2">
              <p className="font-medium">{flag.flagType}</p>
              <p className="text-xs text-muted-foreground">{flag.reason}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="glass-card p-4">
        <h3 className="dec-title text-xl">Relationship Events</h3>
        <div className="mt-3 space-y-2 text-sm">
          {data.events.slice(0, 20).map((event) => (
            <div key={event.id} className="rounded-lg border border-border/70 bg-card/70 px-2 py-2">
              <p className="font-medium">{event.eventType}</p>
              <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </article>
      <div className="lg:col-span-3 flex items-center gap-3">
        <PrimaryButton onClick={() => void load()}>Refresh Stream</PrimaryButton>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
    </section>
  );
}
