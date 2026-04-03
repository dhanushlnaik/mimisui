"use client";

import { useEffect, useMemo, useState } from "react";
import { PrimaryButton, SecondaryButton, TextInput } from "./ui";

type Item = {
  id: string;
  name: string;
  trigger: string;
  matchMode: "exact" | "contains" | "starts_with" | "regex_safe";
  responseType: "text" | "embed";
  responseText: string;
  status: "draft" | "published";
  priority: number;
  version: number;
  conditions?: {
    roles: string[];
    channels: string[];
    cooldownSec: number;
    requireModule?: string | null;
  };
};

type HistoryItem = {
  id: string;
  version: number;
  createdAt: string;
  reason?: string;
  snapshot: Item;
};

type GuildRole = { id: string; name: string; color?: number; position?: number; managed?: boolean };
type GuildChannel = {
  id: string;
  name: string;
  type: number;
  parentId?: string | null;
  position?: number;
};

function roleColorHex(color?: number) {
  if (!color) return null;
  return `#${color.toString(16).padStart(6, "0")}`;
}

function sortedList(values: string[] | undefined) {
  return [...(values ?? [])].sort((a, b) => a.localeCompare(b));
}

function normalizeForDiff(item: Item) {
  return {
    name: item.name,
    trigger: item.trigger,
    matchMode: item.matchMode,
    responseType: item.responseType,
    responseText: item.responseText,
    status: item.status,
    priority: item.priority,
    conditions: {
      roles: sortedList(item.conditions?.roles),
      channels: sortedList(item.conditions?.channels),
      cooldownSec: item.conditions?.cooldownSec ?? 0,
      requireModule: item.conditions?.requireModule ?? null
    }
  };
}

function diffForRestore(current: Item, snapshot: Item) {
  const diffs: string[] = [];
  if (current.name !== snapshot.name) diffs.push(`Name: "${current.name}" -> "${snapshot.name}"`);
  if (current.trigger !== snapshot.trigger) diffs.push(`Trigger: "${current.trigger}" -> "${snapshot.trigger}"`);
  if (current.matchMode !== snapshot.matchMode) diffs.push(`Match mode: ${current.matchMode} -> ${snapshot.matchMode}`);
  if (current.responseType !== snapshot.responseType) diffs.push(`Response type: ${current.responseType} -> ${snapshot.responseType}`);
  if (current.status !== snapshot.status) diffs.push(`Status: ${current.status} -> ${snapshot.status}`);
  if (current.priority !== snapshot.priority) diffs.push(`Priority: ${current.priority} -> ${snapshot.priority}`);
  if ((current.responseText ?? "") !== (snapshot.responseText ?? "")) {
    diffs.push("Response text will be replaced.");
  }

  const rolesNow = sortedList(current.conditions?.roles);
  const rolesThen = sortedList(snapshot.conditions?.roles);
  if (rolesNow.join(",") !== rolesThen.join(",")) {
    diffs.push(`Role scope count: ${rolesNow.length} -> ${rolesThen.length}`);
  }
  const channelsNow = sortedList(current.conditions?.channels);
  const channelsThen = sortedList(snapshot.conditions?.channels);
  if (channelsNow.join(",") !== channelsThen.join(",")) {
    diffs.push(`Channel scope count: ${channelsNow.length} -> ${channelsThen.length}`);
  }
  const cdNow = current.conditions?.cooldownSec ?? 0;
  const cdThen = snapshot.conditions?.cooldownSec ?? 0;
  if (cdNow !== cdThen) diffs.push(`Condition cooldown: ${cdNow}s -> ${cdThen}s`);
  return diffs.length > 0 ? diffs : ["No field difference detected, but version metadata will update."];
}

export function CustomCommands({ guildId }: { guildId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pendingRestore, setPendingRestore] = useState<HistoryItem | null>(null);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [scopeWarning, setScopeWarning] = useState("");
  const [simInput, setSimInput] = useState("");
  const [simResult, setSimResult] = useState<string>("No simulation run yet.");
  const [status, setStatus] = useState("Loading custom commands...");

  async function load() {
    setStatus("Loading custom commands...");
    const res = await fetch(`/api/custom-commands?guildId=${encodeURIComponent(guildId)}`);
    const data = (await res.json()) as { ok: boolean; data?: { items: Item[] }; error?: string };
    if (!data.ok || !data.data) {
      setStatus(`Failed: ${data.error ?? "Unknown error"}`);
      return;
    }
    setItems(data.data.items);
    setSelectedId(data.data.items[0]?.id ?? "");
    setStatus(`Loaded ${data.data.items.length} custom commands.`);
  }

  async function loadScopeMeta() {
    const res = await fetch(`/api/guild/discord-meta?guildId=${encodeURIComponent(guildId)}`);
    const data = (await res.json()) as {
      ok: boolean;
      data?: { roles: GuildRole[]; channels: GuildChannel[]; warning?: string };
      error?: string;
    };
    if (!data.ok || !data.data) {
      setScopeWarning(data.error ?? "Failed to load role/channel selectors.");
      return;
    }
    setRoles(data.data.roles);
    setChannels(data.data.channels);
    setScopeWarning(data.data.warning ?? "");
  }

  async function loadHistory(id: string) {
    const res = await fetch(`/api/custom-commands/${id}?guildId=${encodeURIComponent(guildId)}`);
    const data = (await res.json()) as {
      ok: boolean;
      data?: { history?: HistoryItem[] };
      error?: string;
    };
    if (!data.ok) {
      setHistory([]);
      setStatus(`History load failed: ${data.error ?? "Unknown error"}`);
      return;
    }
    setHistory(data.data?.history ?? []);
  }

  useEffect(() => {
    void load();
    void loadScopeMeta();
  }, [guildId]);

  useEffect(() => {
    if (!selectedId) {
      setHistory([]);
      setPendingRestore(null);
      return;
    }
    setPendingRestore(null);
    void loadHistory(selectedId);
  }, [selectedId, guildId]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const channelGroups = useMemo(() => {
    const categories = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name] as const));
    const grouped = new Map<string, GuildChannel[]>();
    for (const channel of channels.filter((c) => c.type !== 4)) {
      const key = channel.parentId ? categories.get(channel.parentId) ?? "No Category" : "No Category";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(channel);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [channels]);

  async function createItem() {
    const res = await fetch("/api/custom-commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guildId,
        item: {
          name: "New Custom Command",
          trigger: "!hello",
          matchMode: "exact",
          responseType: "text",
          responseText: "Hello from MiMisui!",
          status: "draft",
          priority: 100
        }
      })
    });
    const data = (await res.json()) as { ok: boolean; data?: { item: Item }; error?: string };
    if (!data.ok || !data.data?.item) {
      setStatus(`Create failed: ${data.error ?? "Unknown error"}`);
      return;
    }
    setItems((prev) => [data.data!.item, ...prev]);
    setSelectedId(data.data.item.id);
    setStatus("Custom command created.");
    await loadHistory(data.data.item.id);
  }

  async function saveSelected() {
    if (!selected) return;
    const res = await fetch(`/api/custom-commands/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId, patch: selected })
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setStatus(data.ok ? "Custom command saved." : `Save failed: ${data.error ?? "Unknown error"}`);
    if (data.ok) await loadHistory(selected.id);
  }

  async function deleteSelected() {
    if (!selected) return;
    const res = await fetch(`/api/custom-commands/${selected.id}?guildId=${encodeURIComponent(guildId)}`, {
      method: "DELETE"
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setStatus(`Delete failed: ${data.error ?? "Unknown error"}`);
      return;
    }
    const next = items.filter((item) => item.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id ?? "");
    setStatus("Custom command deleted.");
  }

  async function restoreFromHistory(historyId: string) {
    if (!selected) return;
    const res = await fetch(`/api/custom-commands/${selected.id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId, historyId })
    });
    const data = (await res.json()) as { ok: boolean; data?: { item?: Item }; error?: string };
    if (!data.ok || !data.data?.item) {
      setStatus(`Restore failed: ${data.error ?? "Unknown error"}`);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === selected.id ? data.data!.item! : item)));
    setStatus(`Restored version ${data.data.item.version}.`);
    await loadHistory(selected.id);
  }

  async function simulate() {
    const res = await fetch("/api/custom-commands/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId, input: simInput })
    });
    const data = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
    setSimResult(data.ok ? JSON.stringify(data.data, null, 2) : `Failed: ${data.error ?? "Unknown error"}`);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <article className="glass-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="dec-title text-xl">Custom Commands</h2>
          <PrimaryButton onClick={() => void createItem()}>New</PrimaryButton>
        </div>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                item.id === selectedId
                  ? "border-primary bg-primary/10"
                  : "border-border/70 bg-card/70 hover:bg-primary/5"
              }`}
              onClick={() => setSelectedId(item.id)}
            >
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.trigger}</p>
            </button>
          ))}
        </div>
      </article>

      <article className="glass-card p-5">
        <h2 className="dec-title text-2xl">Builder + Simulator</h2>
        {!selected ? (
          <p className="mt-3 text-sm text-muted-foreground">Create or select a custom command to start editing.</p>
        ) : (
          <>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs">
                Name
                <TextInput
                  value={selected.name}
                  onChange={(e) =>
                    setItems((prev) => prev.map((i) => (i.id === selected.id ? { ...i, name: e.target.value } : i)))
                  }
                />
              </label>
              <label className="text-xs">
                Trigger
                <TextInput
                  value={selected.trigger}
                  onChange={(e) =>
                    setItems((prev) => prev.map((i) => (i.id === selected.id ? { ...i, trigger: e.target.value } : i)))
                  }
                />
              </label>
              <label className="text-xs">
                Match Mode
                <select
                  className="mt-1 h-9 w-full rounded border border-border bg-card px-2 text-sm"
                  value={selected.matchMode}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === selected.id
                          ? { ...i, matchMode: e.target.value as Item["matchMode"] }
                          : i
                      )
                    )
                  }
                >
                  <option value="exact">exact</option>
                  <option value="contains">contains</option>
                  <option value="starts_with">starts_with</option>
                  <option value="regex_safe">regex_safe</option>
                </select>
              </label>
              <label className="text-xs">
                Status
                <select
                  className="mt-1 h-9 w-full rounded border border-border bg-card px-2 text-sm"
                  value={selected.status}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === selected.id
                          ? { ...i, status: e.target.value as Item["status"] }
                          : i
                      )
                    )
                  }
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block text-xs">
              Response Text
              <textarea
                className="mt-1 min-h-28 w-full rounded border border-border bg-card px-2 py-2 text-sm"
                value={selected.responseText}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((i) => (i.id === selected.id ? { ...i, responseText: e.target.value } : i))
                  )
                }
              />
            </label>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="text-xs">
                Conditions: Role IDs
                <select
                  className="mt-1 h-9 w-full rounded border border-border bg-card px-2 text-sm"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === selected.id
                          ? {
                              ...i,
                              conditions: {
                                roles: i.conditions?.roles?.includes(id)
                                  ? i.conditions.roles
                                  : [...(i.conditions?.roles ?? []), id],
                                channels: i.conditions?.channels ?? [],
                                cooldownSec: i.conditions?.cooldownSec ?? 0,
                                requireModule: i.conditions?.requireModule ?? null
                              }
                            }
                          : i
                      )
                    );
                  }}
                >
                  <option value="">Add role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.managed ? "[Managed] " : ""}
                      {role.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(selected.conditions?.roles ?? []).map((roleId) => (
                    <button
                      key={roleId}
                      className="pill"
                      type="button"
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === selected.id
                              ? {
                                  ...i,
                                  conditions: {
                                    roles: (i.conditions?.roles ?? []).filter((id) => id !== roleId),
                                    channels: i.conditions?.channels ?? [],
                                    cooldownSec: i.conditions?.cooldownSec ?? 0,
                                    requireModule: i.conditions?.requireModule ?? null
                                  }
                                }
                              : i
                          )
                        )
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {roleColorHex(roles.find((r) => r.id === roleId)?.color) ? (
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: roleColorHex(roles.find((r) => r.id === roleId)?.color) as string
                            }}
                          />
                        ) : null}
                        {(roles.find((r) => r.id === roleId)?.name ?? roleId).slice(0, 22)}
                      </span>
                    </button>
                  ))}
                </div>
              </label>
              <label className="text-xs">
                Conditions: Channel IDs
                <select
                  className="mt-1 h-9 w-full rounded border border-border bg-card px-2 text-sm"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === selected.id
                          ? {
                              ...i,
                              conditions: {
                                roles: i.conditions?.roles ?? [],
                                channels: i.conditions?.channels?.includes(id)
                                  ? i.conditions.channels
                                  : [...(i.conditions?.channels ?? []), id],
                                cooldownSec: i.conditions?.cooldownSec ?? 0,
                                requireModule: i.conditions?.requireModule ?? null
                              }
                            }
                          : i
                      )
                    );
                  }}
                >
                  <option value="">Add channel...</option>
                  {channelGroups.map(([group, groupChannels]) => (
                    <optgroup key={group} label={group}>
                      {groupChannels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(selected.conditions?.channels ?? []).map((channelId) => (
                    <button
                      key={channelId}
                      className="pill"
                      type="button"
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === selected.id
                              ? {
                                  ...i,
                                  conditions: {
                                    roles: i.conditions?.roles ?? [],
                                    channels: (i.conditions?.channels ?? []).filter((id) => id !== channelId),
                                    cooldownSec: i.conditions?.cooldownSec ?? 0,
                                    requireModule: i.conditions?.requireModule ?? null
                                  }
                                }
                              : i
                          )
                        )
                      }
                    >
                      {(channels.find((c) => c.id === channelId)?.name ?? channelId).slice(0, 22)}
                    </button>
                  ))}
                </div>
              </label>
              <label className="text-xs">
                Conditions: Cooldown (sec)
                <TextInput
                  type="number"
                  min={0}
                  value={String(selected.conditions?.cooldownSec ?? 0)}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === selected.id
                          ? {
                              ...i,
                              conditions: {
                                roles: i.conditions?.roles ?? [],
                                channels: i.conditions?.channels ?? [],
                                cooldownSec: Math.max(0, Number(e.target.value || 0)),
                                requireModule: i.conditions?.requireModule ?? null
                              }
                            }
                          : i
                      )
                    )
                  }
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void saveSelected()}>Save</PrimaryButton>
              <SecondaryButton onClick={() => void deleteSelected()}>Delete</SecondaryButton>
              <span className="pill">Version {selected.version}</span>
            </div>

            <div className="mt-4 rounded-xl border border-border/70 bg-card/70 p-3">
              <h3 className="font-semibold">Version History</h3>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No snapshots yet.</p>
                ) : (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-2 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium">
                          v{entry.version} {entry.reason ? `• ${entry.reason}` : ""}
                        </p>
                        <p className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <SecondaryButton onClick={() => setPendingRestore(entry)}>Preview Restore</SecondaryButton>
                    </div>
                  ))
                )}
              </div>
            </div>
            {selected && pendingRestore ? (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                Restore preview is open. Compare left/right snapshots before confirming.
              </div>
            ) : null}
          </>
        )}

        <div className="mt-6 rounded-xl border border-border/70 bg-card/70 p-3">
          <h3 className="font-semibold">Simulator</h3>
          <div className="mt-2 flex gap-2">
            <TextInput
              placeholder="Type sample user input..."
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
            />
            <PrimaryButton onClick={() => void simulate()}>Run</PrimaryButton>
          </div>
          <pre className="mt-3 overflow-x-auto rounded border border-border bg-background/70 p-2 text-xs text-muted-foreground">
            {simResult}
          </pre>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">{status}</p>
        {scopeWarning ? <p className="mt-1 text-xs text-amber-500">{scopeWarning}</p> : null}
      </article>
      {selected && pendingRestore ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-8 max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-semibold">Restore Diff Preview • v{pendingRestore.version}</h3>
                <p className="text-xs text-muted-foreground">
                  Side-by-side command snapshot compare before rollback.
                </p>
              </div>
              <SecondaryButton onClick={() => setPendingRestore(null)}>Close</SecondaryButton>
            </div>
            <div className="grid max-h-[60vh] gap-3 overflow-auto p-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Current (live)</p>
                <pre className="overflow-x-auto rounded border border-border bg-card/80 p-3 text-[11px]">
                  {JSON.stringify(normalizeForDiff(selected), null, 2)}
                </pre>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Selected Snapshot (v{pendingRestore.version})
                </p>
                <pre className="overflow-x-auto rounded border border-border bg-card/80 p-3 text-[11px]">
                  {JSON.stringify(normalizeForDiff(pendingRestore.snapshot), null, 2)}
                </pre>
              </div>
            </div>
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Summary: {diffForRestore(selected, pendingRestore.snapshot).join(" • ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PrimaryButton onClick={() => void restoreFromHistory(pendingRestore.id)}>
                  Confirm Restore
                </PrimaryButton>
                <SecondaryButton onClick={() => setPendingRestore(null)}>Cancel</SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
