import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction
} from "discord.js";
import { commandCatalog, findCommandDoc, type CommandDoc } from "./command-catalog.js";

export type HelpSection =
  | "overview"
  | "rankings"
  | "economy"
  | "family"
  | "simulation"
  | "social"
  | "fun"
  | "actions"
  | "images"
  | "utility"
  | "admin"
  | "config";

type HelpState = {
  section: HelpSection;
  page: number;
  ownerId: string;
};

const HELP_PAGE_SIZE = 20;
const HELP_LINKS = {
  invite: "https://discord.com/oauth2/authorize?client_id=843011966150115368&scope=bot%20applications.commands&permissions=274877975552",
  support: "https://discord.gg/eZFKMmS6vz",
  vote: "https://top.gg/"
};

const SECTION_ORDER: HelpSection[] = [
  "overview",
  "rankings",
  "economy",
  "family",
  "simulation",
  "social",
  "fun",
  "actions",
  "images",
  "utility",
  "admin",
  "config"
];

const sectionMeta: Record<HelpSection, { emoji: string; label: string; subtitle: string }> = {
  overview: { emoji: "🏠", label: "Command List", subtitle: "Organized command browser" },
  rankings: { emoji: "🏅", label: "Rankings", subtitle: "Levels, profiles, and leaderboard flow" },
  economy: { emoji: "💰", label: "Economy", subtitle: "Coins, shop, daily, quests, inventory" },
  family: { emoji: "💞", label: "Family", subtitle: "Partner, sibling, relationship progression" },
  simulation: { emoji: "🧪", label: "Simulation", subtitle: "Family sim systems, seasons, duel ladder" },
  social: { emoji: "🫂", label: "Social", subtitle: "Community and profile interaction commands" },
  fun: { emoji: "🎲", label: "Fun", subtitle: "Games, trivia, jokes, random responses" },
  actions: { emoji: "⚔️", label: "Actions", subtitle: "Action GIF and expression commands" },
  images: { emoji: "🖼️", label: "Image Generation", subtitle: "Meme, card, quote, overlay generators" },
  utility: { emoji: "🧰", label: "Utility", subtitle: "General utility and information tools" },
  admin: { emoji: "🛡️", label: "Admin", subtitle: "Owner/admin operations and moderation tools" },
  config: { emoji: "⚙️", label: "Configuration", subtitle: "Guild settings and command setup" }
};

const sectionColors: Record<HelpSection, number> = {
  overview: 0x5b8cff,
  rankings: 0x7c3aed,
  economy: 0xf59e0b,
  family: 0xf72585,
  simulation: 0x10b981,
  social: 0xec4899,
  fun: 0x8b5cf6,
  actions: 0xef4444,
  images: 0x06b6d4,
  utility: 0x3b82f6,
  admin: 0xf97316,
  config: 0x64748b
};

function getSectionForCommand(c: CommandDoc): Exclude<HelpSection, "overview"> {
  const name = c.name.toLowerCase();
  const isFamilySim = name.startsWith("familysim");
  const isFamilyCore = [
    "family",
    "marry",
    "divorce",
    "partner",
    "date",
    "anniversary",
    "anniversaryclaim",
    "familyevent",
    "familyprofile",
    "siblings",
    "siblingadd",
    "siblingremove",
    "coupleleaderboard",
    "familyleaderboard",
    "bondstatus",
    "familyquests",
    "familyachievements",
    "familyachieveclaim"
  ].includes(name);
  const isEconomy = [
    "daily",
    "quests",
    "shop",
    "leaderboard",
    "profile",
    "relationshipshop",
    "relationshipinventory",
    "relationshipbuy",
    "relationshipuse"
  ].includes(name);
  const isAction = [
    "action",
    "hug",
    "pat",
    "kiss",
    "cuddle",
    "slap",
    "highfive",
    "bonk",
    "tickle",
    "wink",
    "poke"
  ].includes(name);
  const isAdmin = [
    "botstats",
    "reloadcommands",
    "familysimseasonstart",
    "familysimseasonend",
    "familysimladderreset",
    "familysimladderrecompute",
    "familysimaudit",
    "familysimpenaltyclear",
    "familysimadminpanel"
  ].includes(name);
  const isConfig = ["prefix", "config"].includes(name);
  const isRanking = ["profile", "leaderboard"].includes(name);

  if (isAdmin) return "admin";
  if (isConfig) return "config";
  if (isFamilySim) return "simulation";
  if (isFamilyCore) return "family";
  if (isEconomy) return "economy";
  if (isAction) return "actions";
  if (c.category === "image") return "images";
  if (isRanking) return "rankings";
  if (c.category === "social") return "social";
  if (c.category === "fun") return "fun";
  return "utility";
}

function getCommandsForSection(section: Exclude<HelpSection, "overview">) {
  return commandCatalog
    .filter((c) => getSectionForCommand(c) === section)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getSectionCount(section: Exclude<HelpSection, "overview">) {
  return getCommandsForSection(section).length;
}

function getSectionPages(section: Exclude<HelpSection, "overview">) {
  const commands = getCommandsForSection(section);
  const pages: string[] = [];

  for (let i = 0; i < commands.length; i += HELP_PAGE_SIZE) {
    const chunk = commands.slice(i, i + HELP_PAGE_SIZE);
    const chips = chunk.map((c) => `\`${c.name}\``).join(" ");
    pages.push(chips.length > 0 ? chips : "No commands in this section yet.");
  }

  return pages.length > 0 ? pages : ["No commands in this section yet."];
}

function chipsForSection(section: Exclude<HelpSection, "overview">, max = 18) {
  const commands = getCommandsForSection(section);
  if (commands.length === 0) return "`-`";
  const head = commands.slice(0, max).map((c) => `\`${c.name}\``);
  const remaining = commands.length - head.length;
  if (remaining > 0) {
    head.push(`\`+${remaining} more\``);
  }
  return head.join(" ");
}

function buildOverviewEmbed() {
  const total = commandCatalog.length;
  const embed = new EmbedBuilder()
    .setColor(sectionColors.overview)
    .setTitle("Command List")
    .setDescription(
      [
        "Here is the list of commands!",
        "For more info on a specific command, use `/help command:<name>`",
        "Need more help? Join our support server.",
        "",
        `Total documented commands: **${total}**`
      ].join("\n")
    )
    .setFooter({ text: "Use the category menu and pager below." });

  for (const section of SECTION_ORDER) {
    if (section === "overview") continue;
    const meta = sectionMeta[section];
    embed.addFields({
      name: `${meta.emoji} ${meta.label}`,
      value: chipsForSection(section as Exclude<HelpSection, "overview">)
    });
  }

  return embed;
}

function buildSectionEmbed(section: Exclude<HelpSection, "overview">, page: number) {
  const pages = getSectionPages(section);
  const safePage = Math.max(0, Math.min(page, pages.length - 1));
  const meta = sectionMeta[section];
  return new EmbedBuilder()
    .setColor(sectionColors[section])
    .setTitle(`${meta.emoji} ${meta.label}`)
    .setDescription(
      [
        `**${meta.subtitle}**`,
        "",
        pages[safePage] ?? "No commands found."
      ].join("\n")
    )
    .setFooter({ text: `Page ${safePage + 1}/${pages.length} • /help command:<name> for detailed usage` });
}

function buildHelpComponents({ section, page, ownerId }: HelpState) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:select:${ownerId}`)
    .setPlaceholder("Browse command categories")
    .addOptions(
      ...SECTION_ORDER.map((key) => {
        const meta = sectionMeta[key];
        const count =
          key === "overview" ? commandCatalog.length : getSectionCount(key as Exclude<HelpSection, "overview">);
        return {
          label: `${meta.label} (${count})`,
          value: key,
          emoji: meta.emoji,
          default: section === key
        };
      })
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const pages = section === "overview" ? 1 : getSectionPages(section as Exclude<HelpSection, "overview">).length;
  const safePage = Math.max(0, Math.min(page, pages - 1));
  const isOverview = section === "overview";

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`help:nav:${ownerId}:${section}:${safePage}:first`).setLabel("⏮").setStyle(ButtonStyle.Secondary).setDisabled(isOverview || safePage <= 0),
    new ButtonBuilder().setCustomId(`help:nav:${ownerId}:${section}:${safePage}:prev`).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(isOverview || safePage <= 0),
    new ButtonBuilder().setCustomId(`help:nav:${ownerId}:${section}:${safePage}:counter`).setLabel(isOverview ? "1/1" : `${safePage + 1}/${pages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`help:nav:${ownerId}:${section}:${safePage}:next`).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(isOverview || safePage >= pages - 1),
    new ButtonBuilder().setCustomId(`help:nav:${ownerId}:${section}:${safePage}:last`).setLabel("⏭").setStyle(ButtonStyle.Secondary).setDisabled(isOverview || safePage >= pages - 1)
  );

  const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Overview").setCustomId(`help:nav:${ownerId}:${section}:${safePage}:home`).setStyle(ButtonStyle.Primary).setDisabled(section === "overview"),
    new ButtonBuilder().setLabel("Invite").setStyle(ButtonStyle.Link).setURL(HELP_LINKS.invite),
    new ButtonBuilder().setLabel("Support").setStyle(ButtonStyle.Link).setURL(HELP_LINKS.support),
    new ButtonBuilder().setLabel("Vote").setStyle(ButtonStyle.Link).setURL(HELP_LINKS.vote)
  );

  return [selectRow, linkRow, navRow];
}

function normalizeSection(input: HelpSection): HelpSection {
  return SECTION_ORDER.includes(input) ? input : "overview";
}

function normalizePage(section: HelpSection, page: number) {
  if (section === "overview") return 0;
  const total = getSectionPages(section as Exclude<HelpSection, "overview">).length;
  return Math.max(0, Math.min(page, total - 1));
}

function renderHelpState(state: HelpState) {
  const section = normalizeSection(state.section);
  const page = normalizePage(section, state.page);

  const embed =
    section === "overview"
      ? buildOverviewEmbed()
      : buildSectionEmbed(section as Exclude<HelpSection, "overview">, page);

  return {
    embeds: [embed],
    components: buildHelpComponents({ section, page, ownerId: state.ownerId })
  };
}

export function buildHelpMessage(section: HelpSection, ownerId: string, page = 0) {
  return renderHelpState({ section, page, ownerId });
}

export function buildCommandHelpMessage(input: string) {
  const command = findCommandDoc(input);
  if (!command) {
    return new EmbedBuilder()
      .setColor(sectionColors.overview)
      .setTitle("Command Not Found")
      .setDescription(`No command found for \`${input}\`. Try \`/help\`.`);
  }

  const section = getSectionForCommand(command);
  return new EmbedBuilder()
    .setColor(sectionColors[section])
    .setTitle(`Help: ${command.name}`)
    .setDescription(command.description)
    .addFields(
      { name: "Category", value: `${sectionMeta[section].emoji} ${sectionMeta[section].label}` },
      { name: "Slash", value: `\`${command.slash}\`` },
      { name: "Prefix", value: command.prefix ? `\`${command.prefix}\`` : "N/A" },
      {
        name: "Aliases",
        value: command.aliases && command.aliases.length > 0 ? command.aliases.map((a) => `\`${a}\``).join(", ") : "None"
      },
      {
        name: "Examples",
        value: command.examples && command.examples.length > 0 ? command.examples.map((e) => `\`${e}\``).join("\n") : "Use slash or prefix syntax shown above."
      }
    );
}

export async function handleHelpSelect(interaction: StringSelectMenuInteraction) {
  const [prefix, kind, ownerId] = interaction.customId.split(":");
  if (prefix !== "help" || kind !== "select" || !ownerId) return false;

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "This help panel belongs to another user. Run `/help` to open yours.",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const selected = (interaction.values[0] ?? "overview") as HelpSection;
  await interaction.update(buildHelpMessage(selected, ownerId, 0));
  return true;
}

export async function handleHelpButton(interaction: ButtonInteraction) {
  const [prefix, kind, ownerId, rawSection, rawPage, action] = interaction.customId.split(":");
  if (prefix !== "help" || kind !== "nav" || !ownerId || !rawSection || !rawPage || !action) return false;

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "This help panel belongs to another user. Run `/help` to open yours.",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (action === "counter") {
    await interaction.deferUpdate();
    return true;
  }

  const section = rawSection as HelpSection;
  const current = Number.parseInt(rawPage, 10);
  const safeCurrent = Number.isFinite(current) ? current : 0;

  if (action === "home") {
    await interaction.update(buildHelpMessage("overview", ownerId, 0));
    return true;
  }

  if (section === "overview") {
    await interaction.deferUpdate();
    return true;
  }

  const pageCount = getSectionPages(section as Exclude<HelpSection, "overview">).length;
  const target =
    action === "first"
      ? 0
      : action === "last"
        ? pageCount - 1
        : action === "next"
          ? safeCurrent + 1
          : safeCurrent - 1;
  const safePage = Math.max(0, Math.min(target, pageCount - 1));

  await interaction.update(buildHelpMessage(section, ownerId, safePage));
  return true;
}
