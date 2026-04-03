import { DASHBOARD_SECTIONS, getDocsCommandMeta } from "@/lib/dashboard-catalog";

export type DocNode = {
  slug: string;
  title: string;
  summary: string;
  content: string[];
  children?: DocNode[];
};

const COMMANDS_BY_SECTION = (() => {
  const rows = getDocsCommandMeta();
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    if (!grouped.has(row.section)) grouped.set(row.section, []);
    grouped.get(row.section)!.push(row.name);
  }
  for (const [key, list] of grouped) {
    grouped.set(key, [...new Set(list)].sort((a, b) => a.localeCompare(b)));
  }
  return grouped;
})();

const commandSectionNodes: DocNode[] = DASHBOARD_SECTIONS
  .filter((section) => section.key !== "overview" && section.key !== "docs")
  .map((section) => {
    const commands = COMMANDS_BY_SECTION.get(section.key) ?? [];
    return {
      slug: section.key,
      title: section.label,
      summary: section.description,
      content: [
        `Module intent: ${section.description}.`,
        `Web control: Manage this module from /dashboard/[guild]/${section.key}.`,
        commands.length > 0
          ? `Commands: ${commands.map((name) => `/${name}`).join(", ")}`
          : "Commands: No direct command list exposed for this module yet."
      ]
    };
  });

export const DOC_TREE: DocNode[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    summary: "Setup flow for MiMisui bot + dashboard deployment.",
    content: [
      "Invite MiMisui and log in with Discord OAuth.",
      "Configure DATABASE_URL, DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET.",
      "Run web with pnpm --filter @cocosui/web dev and bot with pnpm --filter @cocosui/bot start.",
      "For Ubuntu production, use PM2 for bot process persistence and run migrations before restart."
    ]
  },
  {
    slug: "dashboard-workflow",
    title: "Dashboard Workflow",
    summary: "Tree workflow for day-to-day operations.",
    content: [
      "1) Choose guild from /dashboard.",
      "2) Configure Prefix & Modules first.",
      "3) Set command scopes and cooldowns in Commands.",
      "4) Build/Publish automations in Custom Commands.",
      "5) Operate Family/Simulation and monitor Audit Logs."
    ]
  },
  {
    slug: "command-reference",
    title: "Command Reference",
    summary: "Dynamic command map by dashboard module.",
    content: [
      "Commands are grouped from the live dashboard catalog.",
      "Each command entry should map to slash + prefix behavior parity where supported.",
      "Use this tree to audit what is configurable from web versus runtime-only behavior."
    ],
    children: commandSectionNodes
  },
  {
    slug: "custom-commands",
    title: "Custom Commands Guide",
    summary: "Builder workflow, versioning, and simulation.",
    content: [
      "Create draft commands with trigger modes: exact, contains, starts_with, regex_safe.",
      "Scope execution with role/channel allow-lists and per-command cooldown.",
      "Publish once simulator output matches expected response behavior.",
      "Use version history restore for safe rollback."
    ]
  },
  {
    slug: "family-simulation",
    title: "Family + Simulation Ops",
    summary: "Social progression controls, ladder, season, and moderation hooks.",
    content: [
      "Configure family toggles and reward rates in guild settings.",
      "Use admin action panel for season start/end/reset/recompute operations.",
      "Track anti-abuse flags and moderation logs before issuing penalty clear actions."
    ]
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    summary: "Runbook for common runtime and API failures.",
    content: [
      "If interactions fail with unknown interaction (10062), defer/reply timing needs adjustment.",
      "If Prisma reports missing tables or DB not found, verify DATABASE_URL and apply schema.",
      "If slash register fails, validate command name/description lengths and guild permissions.",
      "If web is slow, move app + DB to same region and cache guild metadata responses."
    ]
  }
];

export type FlatDocNode = {
  path: string[];
  href: string;
  depth: number;
  title: string;
  summary: string;
};

export function flattenDocTree(nodes: DocNode[] = DOC_TREE, basePath: string[] = [], depth = 0): FlatDocNode[] {
  const out: FlatDocNode[] = [];
  for (const node of nodes) {
    const path = [...basePath, node.slug];
    out.push({
      path,
      href: `/docs/${path.join("/")}`,
      depth,
      title: node.title,
      summary: node.summary
    });
    if (node.children?.length) {
      out.push(...flattenDocTree(node.children, path, depth + 1));
    }
  }
  return out;
}

export function findDocNode(path: string[]): DocNode | null {
  if (path.length === 0) return null;

  let level = DOC_TREE;
  let found: DocNode | undefined;

  for (const segment of path) {
    found = level.find((node) => node.slug === segment);
    if (!found) return null;
    level = found.children ?? [];
  }

  return found ?? null;
}
