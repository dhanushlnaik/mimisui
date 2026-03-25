"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton, TextInput } from "@/components/ui";

type ActionName =
  | "season_start"
  | "season_end"
  | "ladder_reset"
  | "ladder_recompute"
  | "penalty_clear"
  | "season_claim"
  | "achievement_claim";

export function FamilyAdminPanel({ guildId }: { guildId: string }) {
  const [seasonKey, setSeasonKey] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<ActionName | null>(null);
  const [result, setResult] = useState<string>("No action executed yet.");

  async function run(action: ActionName) {
    setLoading(action);
    try {
      const res = await fetch("/api/family/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          action,
          seasonKey: seasonKey.trim() || undefined,
          reason: reason.trim() || undefined,
          note: note.trim() || undefined
        })
      });
      const data = (await res.json()) as { ok: boolean; result?: unknown; error?: string };
      if (!data.ok) {
        setResult(`Failed: ${data.error ?? "Unknown error"}`);
      } else {
        setResult(`Success: ${JSON.stringify(data.result)}`);
      }
    } catch (error) {
      setResult(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="glass-card p-5">
      <h3 className="dec-title text-2xl">Web Action Panel</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Execute family simulation admin operations and self-claims directly from the dashboard.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Season Key (optional)</label>
          <TextInput
            placeholder="YYYY-MM-DD (week start)"
            value={seasonKey}
            onChange={(e) => setSeasonKey(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Penalty Clear Reason</label>
          <TextInput
            placeholder="Reason for moderation clear"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Penalty Clear Note (optional)</label>
        <TextInput
          placeholder="Audit note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-3">
        <PrimaryButton disabled={loading !== null} onClick={() => run("season_start")}>
          {loading === "season_start" ? "Starting..." : "Start Season"}
        </PrimaryButton>
        <SecondaryButton disabled={loading !== null} onClick={() => run("season_end")}>
          {loading === "season_end" ? "Ending..." : "End Season"}
        </SecondaryButton>
        <SecondaryButton disabled={loading !== null} onClick={() => run("ladder_reset")}>
          {loading === "ladder_reset" ? "Resetting..." : "Reset Ladder"}
        </SecondaryButton>
        <SecondaryButton disabled={loading !== null} onClick={() => run("ladder_recompute")}>
          {loading === "ladder_recompute" ? "Recomputing..." : "Recompute Ladder"}
        </SecondaryButton>
        <SecondaryButton disabled={loading !== null} onClick={() => run("penalty_clear")}>
          {loading === "penalty_clear" ? "Clearing..." : "Clear Penalties"}
        </SecondaryButton>
        <SecondaryButton disabled={loading !== null} onClick={() => run("season_claim")}>
          {loading === "season_claim" ? "Claiming..." : "Claim Season"}
        </SecondaryButton>
        <SecondaryButton disabled={loading !== null} onClick={() => run("achievement_claim")}>
          {loading === "achievement_claim" ? "Claiming..." : "Claim Achievements"}
        </SecondaryButton>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-lg border border-border/70 bg-card/70 p-3 text-xs text-muted-foreground">
        {result}
      </pre>
    </section>
  );
}
