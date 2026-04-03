import { DEFAULT_GUILD_SETTINGS, DEFAULT_PREFIX } from "@cocosui/config";
import { db } from "@cocosui/db";
import { listManagedGuildsForAuthUser } from "./guilds";
import type { DashboardSectionKey, DocsCommandMeta } from "./dashboard-catalog";
import { DASHBOARD_SECTIONS, getDocsCommandMeta } from "./dashboard-catalog";


export type CommandControl = {
  enabled: boolean;
  visible: boolean;
  cooldownSec: number;
  roles: string[];
  channels: string[];
};

export type CustomCommand = {
  id: string;
  name: string;
  trigger: string;
  matchMode: "exact" | "contains" | "starts_with" | "regex_safe";
  responseType: "text" | "embed";
  responseText: string;
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: string;
  buttons?: Array<{ label: string; url: string }>;
  conditions: {
    roles: string[];
    channels: string[];
    cooldownSec: number;
    requireModule?: string | null;
  };
  priority: number;
  status: "draft" | "published";
  blockedPatterns?: string[];
  riskReviewRequired?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomCommandVersion = {
  id: string;
  commandId: string;
  version: number;
  snapshot: CustomCommand;
  createdAt: string;
  actorUserId?: string;
  reason?: string;
};

export type { DashboardSectionKey, DocsCommandMeta };
export { DASHBOARD_SECTIONS, getDocsCommandMeta };

export function withDefaults(settings: unknown) {
  return {
    ...DEFAULT_GUILD_SETTINGS,
    familyEnabled: true,
    marriageEnabled: true,
    siblingsEnabled: true,
    publicFamilyAnnouncements: true,
    relationshipRewardRate: 1,
    commandControls: {},
    customCommands: [],
    customCommandHistory: {},
    ...(settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {})
  };
}

export function readCommandControls(settings: unknown): Record<string, CommandControl> {
  const merged = withDefaults(settings) as Record<string, unknown>;
  const raw = merged.commandControls;
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, CommandControl>;
}

export function readCustomCommands(settings: unknown): CustomCommand[] {
  const merged = withDefaults(settings) as Record<string, unknown>;
  const raw = merged.customCommands;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => Boolean(r && typeof r === "object")) as CustomCommand[];
}

export function readCustomCommandHistory(settings: unknown): Record<string, CustomCommandVersion[]> {
  const merged = withDefaults(settings) as Record<string, unknown>;
  const raw = merged.customCommandHistory;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, CustomCommandVersion[]> = {};
  for (const [commandId, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    out[commandId] = value.filter((item) => Boolean(item && typeof item === "object")) as CustomCommandVersion[];
  }
  return out;
}

export function createDefaultCommandControl(): CommandControl {
  return {
    enabled: true,
    visible: true,
    cooldownSec: 0,
    roles: [],
    channels: []
  };
}

export async function assertManagedGuild(authUserId: string, guildId: string) {
  const managed = await listManagedGuildsForAuthUser(authUserId);
  const matched = managed.find((g: { id: string }) => g.id === guildId) ?? null;
  if (!matched) {
    throw new Error("You do not manage this guild.");
  }
  const guild = await db.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    throw new Error("Guild not found.");
  }
  return guild;
}

export function mergeGuildUpdate(
  currentSettings: unknown,
  input: {
    prefix?: string;
    moduleToggles?: Partial<Record<"afk" | "fun" | "games" | "utility", boolean>>;
    familyToggles?: Partial<
      Record<
        "familyEnabled" | "marriageEnabled" | "siblingsEnabled" | "publicFamilyAnnouncements",
        boolean
      >
    >;
    relationshipRewardRate?: number;
  }
) {
  const merged = withDefaults(currentSettings) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...merged };

  if (input.prefix) {
    next.prefix = input.prefix.trim().slice(0, 8) || DEFAULT_PREFIX;
  }
  if (input.moduleToggles) {
    for (const [key, value] of Object.entries(input.moduleToggles)) {
      if (typeof value === "boolean") next[key] = value;
    }
  }
  if (input.familyToggles) {
    for (const [key, value] of Object.entries(input.familyToggles)) {
      if (typeof value === "boolean") next[key] = value;
    }
  }
  if (typeof input.relationshipRewardRate === "number" && Number.isFinite(input.relationshipRewardRate)) {
    next.relationshipRewardRate = Math.min(5, Math.max(0.1, Number(input.relationshipRewardRate.toFixed(2))));
  }
  return next;
}
