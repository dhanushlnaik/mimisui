"use client";

import { useEffect, useMemo, useState } from "react";
import { PrimaryButton, TextInput } from "./ui";

type CommandItem = {
  name: string;
  section: string;
  usage: string;
  description: string;
  control: {
    enabled: boolean;
    visible: boolean;
    cooldownSec: number;
    roles: string[];
    channels: string[];
  };
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

function RoleScopePicker(props: {
  placeholder: string;
  options: GuildRole[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.options.slice(0, 80);
    return props.options.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 60);
  }, [props.options, query]);

  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-2">
      <p className="text-xs font-medium">Allowed Roles</p>
      <TextInput
        className="mt-2 h-8"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={props.placeholder}
      />
      <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches.</p>
        ) : (
          visible.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={props.selectedIds.includes(item.id)}
                onChange={() => props.onToggle(item.id)}
              />
              {roleColorHex(item.color) ? (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: roleColorHex(item.color) as string }}
                />
              ) : null}
              <span className="truncate">{item.name}</span>
              {item.managed ? <span className="pill">Managed</span> : null}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function channelTypeLabel(type: number) {
  if (type === 0) return "Text";
  if (type === 2) return "Voice";
  if (type === 4) return "Category";
  if (type === 5) return "Announcements";
  if (type === 13) return "Stage";
  if (type === 15) return "Forum";
  return "Other";
}

function ChannelScopePicker(props: {
  options: GuildChannel[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const categories = useMemo(
    () => new Map(props.options.filter((c) => c.type === 4).map((c) => [c.id, c.name] as const)),
    [props.options]
  );
  const visible = useMemo(() => {
    const base = props.options.filter((c) => c.type !== 4);
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? base
      : base.filter((channel) => {
          const parent = channel.parentId ? categories.get(channel.parentId) ?? "" : "";
          return `${channel.name} ${parent}`.toLowerCase().includes(q);
        });
    const grouped: Record<string, GuildChannel[]> = {};
    for (const channel of filtered.slice(0, 120)) {
      const key = channel.parentId ? categories.get(channel.parentId) ?? "No Category" : "No Category";
      if (!grouped[key]) grouped[key] = [];
      grouped[key]!.push(channel);
    }
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [props.options, query, categories]);

  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-2">
      <p className="text-xs font-medium">Allowed Channels</p>
      <TextInput
        className="mt-2 h-8"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search channels"
      />
      <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches.</p>
        ) : (
          visible.map(([group, channels]) => (
            <div key={group} className="rounded border border-border/50 bg-card/60 p-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">{group}</p>
              <div className="mt-1 space-y-1">
                {channels.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={props.selectedIds.includes(item.id)}
                      onChange={() => props.onToggle(item.id)}
                    />
                    <span className="truncate">#{item.name}</span>
                    <span className="pill">{channelTypeLabel(item.type)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CommandCenter({ guildId }: { guildId: string }) {
  const [items, setItems] = useState<CommandItem[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [scopeWarning, setScopeWarning] = useState<string>("");
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string>("");
  const [status, setStatus] = useState("Loading commands...");
  const itemKey = (item: CommandItem) => `${item.section}::${item.name}`;

  async function load() {
    setStatus("Loading commands...");
    const res = await fetch(`/api/commands?guildId=${encodeURIComponent(guildId)}`);
    const data = (await res.json()) as { ok: boolean; data?: { catalog: CommandItem[] }; error?: string };
    if (!data.ok || !data.data) {
      setStatus(`Failed: ${data.error ?? "Unknown error"}`);
      return;
    }
    setItems(data.data.catalog);
    setStatus(`Loaded ${data.data.catalog.length} commands.`);
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

  useEffect(() => {
    void load();
    void loadScopeMeta();
  }, [guildId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q) || item.section.toLowerCase().includes(q));
  }, [items, query]);

  async function saveCommand(item: CommandItem) {
    const key = itemKey(item);
    setSavingKey(key);
    try {
      const res = await fetch("/api/commands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          command: item.name,
          control: item.control
        })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setStatus(data.ok ? `Saved ${item.name}.` : `Save failed: ${data.error ?? "Unknown error"}`);
    } finally {
      setSavingKey("");
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="dec-title text-2xl">Command Center</h2>
        <TextInput
          className="w-72"
          placeholder="Search command or section"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Per-command manageability with visibility, enablement, cooldown, and scope fields.
      </p>

      <div className="mt-4 space-y-3">
        {filtered.map((item) => (
          <article key={itemKey(item)} className="rounded-xl border border-border/70 bg-card/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.usage}</p>
              </div>
              <span className="pill">{item.section}</span>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-2 py-1 text-xs">
                Enabled
                <input
                  type="checkbox"
                  checked={item.control.enabled}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) =>
                        itemKey(p) === itemKey(item)
                          ? { ...p, control: { ...p.control, enabled: e.target.checked } }
                          : p
                      )
                    )
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-2 py-1 text-xs">
                Visible
                <input
                  type="checkbox"
                  checked={item.control.visible}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) =>
                        itemKey(p) === itemKey(item)
                          ? { ...p, control: { ...p.control, visible: e.target.checked } }
                          : p
                      )
                    )
                  }
                />
              </label>
              <label className="rounded-lg border border-border/70 bg-background/60 px-2 py-1 text-xs">
                Cooldown (sec)
                <input
                  className="mt-1 h-8 w-full rounded border border-border bg-card px-2 text-xs"
                  type="number"
                  value={item.control.cooldownSec}
                  min={0}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) =>
                        itemKey(p) === itemKey(item)
                          ? {
                              ...p,
                              control: {
                                ...p.control,
                                cooldownSec: Math.max(0, Number(e.target.value || 0))
                              }
                            }
                          : p
                      )
                    )
                  }
                />
              </label>
              <div className="flex items-end">
                <PrimaryButton
                  className="w-full"
                  onClick={() => void saveCommand(item)}
                  disabled={savingKey === itemKey(item)}
                >
                  {savingKey === itemKey(item) ? "Saving..." : "Save"}
                </PrimaryButton>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <RoleScopePicker
                placeholder="Search roles"
                options={roles}
                selectedIds={item.control.roles}
                onToggle={(id) =>
                  setItems((prev) =>
                    prev.map((p) =>
                      itemKey(p) === itemKey(item)
                        ? {
                            ...p,
                            control: {
                              ...p.control,
                              roles: p.control.roles.includes(id)
                                ? p.control.roles.filter((x) => x !== id)
                                : [...p.control.roles, id]
                            }
                          }
                        : p
                    )
                  )
                }
              />
              <ChannelScopePicker
                options={channels}
                selectedIds={item.control.channels}
                onToggle={(id) =>
                  setItems((prev) =>
                    prev.map((p) =>
                      itemKey(p) === itemKey(item)
                        ? {
                            ...p,
                            control: {
                              ...p.control,
                              channels: p.control.channels.includes(id)
                                ? p.control.channels.filter((x) => x !== id)
                                : [...p.control.channels, id]
                            }
                          }
                        : p
                    )
                  )
                }
              />
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{status}</p>
      {scopeWarning ? <p className="mt-1 text-xs text-amber-500">{scopeWarning}</p> : null}
    </section>
  );
}
