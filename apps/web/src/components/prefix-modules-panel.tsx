"use client";

import { useState } from "react";
import { PrimaryButton, TextInput } from "./ui";

type SettingsState = {
  afk: boolean;
  fun: boolean;
  games: boolean;
  utility: boolean;
  familyEnabled: boolean;
  marriageEnabled: boolean;
  siblingsEnabled: boolean;
  publicFamilyAnnouncements: boolean;
  relationshipRewardRate: number;
  prefix: string;
};

const BOOL_KEYS: Array<{ key: keyof SettingsState; label: string }> = [
  { key: "afk", label: "AFK Module" },
  { key: "fun", label: "Fun Module" },
  { key: "games", label: "Games Module" },
  { key: "utility", label: "Utility Module" },
  { key: "familyEnabled", label: "Family System" },
  { key: "marriageEnabled", label: "Marriage Actions" },
  { key: "siblingsEnabled", label: "Sibling Actions" },
  { key: "publicFamilyAnnouncements", label: "Family Announcements" }
];

export function PrefixModulesPanel({
  guildId,
  initial
}: {
  guildId: string;
  initial: SettingsState;
}) {
  const [state, setState] = useState(initial);
  const [status, setStatus] = useState("No changes saved yet.");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/guild/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          prefix: state.prefix,
          moduleToggles: {
            afk: state.afk,
            fun: state.fun,
            games: state.games,
            utility: state.utility
          },
          familyToggles: {
            familyEnabled: state.familyEnabled,
            marriageEnabled: state.marriageEnabled,
            siblingsEnabled: state.siblingsEnabled,
            publicFamilyAnnouncements: state.publicFamilyAnnouncements
          },
          relationshipRewardRate: state.relationshipRewardRate
        })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setStatus(data.ok ? "Saved successfully." : `Save failed: ${data.error ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-card p-5">
      <h2 className="dec-title text-2xl">Prefix & Modules</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure prefix, module toggles, and family reward policies.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs">
          Prefix
          <TextInput
            value={state.prefix}
            maxLength={8}
            onChange={(e) => setState((p) => ({ ...p, prefix: e.target.value }))}
          />
        </label>
        <label className="text-xs">
          Relationship Reward Rate
          <TextInput
            type="number"
            min={0.1}
            max={5}
            step={0.1}
            value={state.relationshipRewardRate}
            onChange={(e) => setState((p) => ({ ...p, relationshipRewardRate: Number(e.target.value || 1) }))}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {BOOL_KEYS.map((item) => (
          <label key={item.key} className="flex items-center justify-between rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm">
            <span>{item.label}</span>
            <input
              type="checkbox"
              checked={Boolean(state[item.key])}
              onChange={(e) => setState((p) => ({ ...p, [item.key]: e.target.checked }))}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <PrimaryButton onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </PrimaryButton>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
    </section>
  );
}
