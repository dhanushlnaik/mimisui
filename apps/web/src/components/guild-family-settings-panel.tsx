"use client";

import { useState } from "react";
import { PrimaryButton, TextInput } from "@/components/ui";

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
};

const LABELS: Array<{ key: keyof SettingsState; label: string }> = [
  { key: "afk", label: "AFK Module" },
  { key: "fun", label: "Fun Module" },
  { key: "games", label: "Games Module" },
  { key: "utility", label: "Utility Module" },
  { key: "familyEnabled", label: "Family System" },
  { key: "marriageEnabled", label: "Marriage Actions" },
  { key: "siblingsEnabled", label: "Sibling Actions" },
  { key: "publicFamilyAnnouncements", label: "Family Announcements" }
];

export function GuildFamilySettingsPanel({
  guildId,
  initialSettings
}: {
  guildId: string;
  initialSettings: SettingsState;
}) {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [status, setStatus] = useState("No changes saved yet.");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/guild/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, settings })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setStatus(`Save failed: ${data.error ?? "Unknown error"}`);
      } else {
        setStatus("Settings saved.");
      }
    } catch (error) {
      setStatus(`Save failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-card p-5">
      <h3 className="dec-title text-2xl">Guild Settings</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Toggle modules and family controls from web. This mirrors `/config` behavior.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key])}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  [key]: e.target.checked
                }))
              }
            />
          </label>
        ))}
      </div>

      <div className="mt-4 max-w-xs">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Relationship Reward Rate</label>
        <TextInput
          type="number"
          min={0.1}
          max={5}
          step={0.1}
          value={settings.relationshipRewardRate}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              relationshipRewardRate: Number(e.target.value || 1)
            }))
          }
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </PrimaryButton>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
    </section>
  );
}
