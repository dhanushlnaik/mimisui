export type DashboardSectionKey =
  | "overview"
  | "commands"
  | "custom-commands"
  | "prefix-modules"
  | "family"
  | "simulation"
  | "economy"
  | "moderation-safety"
  | "audit-logs"
  | "integrations"
  | "docs";

export type DocsCommandMeta = {
  name: string;
  section: Exclude<DashboardSectionKey, "overview" | "docs">;
  usage: string;
  description: string;
};

export const DASHBOARD_SECTIONS: Array<{
  key: DashboardSectionKey;
  label: string;
  icon: string;
  description: string;
}> = [
  { key: "overview", label: "Overview", icon: "🏠", description: "Guild snapshot and health" },
  { key: "commands", label: "Commands", icon: "⚡", description: "Command controls and parity status" },
  { key: "custom-commands", label: "Custom Commands", icon: "🧠", description: "Trigger builder and simulator" },
  { key: "prefix-modules", label: "Prefix & Modules", icon: "⚙️", description: "Prefix and module switches" },
  { key: "family", label: "Family", icon: "💞", description: "Relationship progression controls" },
  { key: "simulation", label: "Simulation", icon: "🧪", description: "Season ladder and duel controls" },
  { key: "economy", label: "Economy & Progression", icon: "💰", description: "XP, coins, quests, boosters" },
  { key: "moderation-safety", label: "Moderation/Safety", icon: "🛡️", description: "Anti-abuse and safety actions" },
  { key: "audit-logs", label: "Audit Logs", icon: "🧾", description: "Admin timeline and events" },
  { key: "integrations", label: "Integrations", icon: "🔌", description: "Discord, webhooks, exports" },
  { key: "docs", label: "Docs", icon: "📚", description: "Guides and references" }
];

const SECTION_COMMANDS: Record<Exclude<DashboardSectionKey, "overview" | "docs">, string[]> = {
  commands: [
    "help",
    "ping",
    "botstats",
    "reloadcommands",
    "avatar",
    "banner",
    "serverinfo",
    "userinfo",
    "users",
    "enlarge",
    "prefix",
    "config"
  ],
  "custom-commands": [],
  "prefix-modules": ["prefix", "config"],
  family: [
    "marry",
    "divorce",
    "partner",
    "date",
    "anniversary",
    "anniversaryclaim",
    "familyprofile",
    "siblings",
    "siblingadd",
    "siblingremove",
    "bondstatus",
    "coupleleaderboard",
    "familyleaderboard",
    "familyquests",
    "familyachievements"
  ],
  simulation: [
    "familysim",
    "familysimstats",
    "familysimmilestones",
    "familysimladder",
    "familysimduel",
    "familysimduelhistory",
    "familysimseason",
    "familysimseasonclaim",
    "familysimseasonstart",
    "familysimseasonend",
    "familysimladderreset",
    "familysimladderrecompute",
    "familysimadminpanel"
  ],
  economy: ["profile", "daily", "quests", "shop", "leaderboard", "relationshipshop", "relationshipinventory", "relationshipbuy", "relationshipuse"],
  "moderation-safety": ["familysimaudit", "familysimpenaltyclear", "afk"],
  "audit-logs": [],
  integrations: ["quote", "tweet", "uk07", "spotifynp", "thisisspotify", "petpet", "triggered", "splitimg", "avsplit", "multipfp", "achievement", "bartchalkboard", "changemymind", "lisapresentation", "jimwhiteboard", "randomresponse", "action"]
};

export function getDocsCommandMeta(): DocsCommandMeta[] {
  const rows: DocsCommandMeta[] = [];
  for (const [section, names] of Object.entries(SECTION_COMMANDS)) {
    const sec = section as Exclude<DashboardSectionKey, "overview" | "docs">;
    for (const name of names) {
      rows.push({
        name,
        section: sec,
        usage: `/${name}`,
        description: `${name} command configuration and behavior`
      });
    }
  }
  return rows;
}

