import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction
} from "discord.js";
import {
  commandCatalog,
  findCommandDoc,
  helpCategoryLabels,
  type HelpCategory
} from "./command-catalog.js";

type HelpState = {
  category: HelpCategory;
  page: number;
  ownerId: string;
};

const HELP_PAGE_SIZE = 6;
const HELP_LINKS = {
  invite: "https://discord.com/oauth2/authorize?client_id=843011966150115368&scope=bot%20applications.commands&permissions=274877975552",
  support: "https://discord.gg/eZFKMmS6vz",
  vote: "https://top.gg/"
};

const categoryEmoji: Record<HelpCategory, string> = {
  overview: "🏠",
  utility: "🧰",
  fun: "🎉",
  social: "💞",
  configuration: "⚙️",
  image: "🖼️"
};

function getCategoryCommandCount(category: Exclude<HelpCategory, "overview">) {
  return commandCatalog.filter((c) => c.category === category).length;
}

function getCategoryPages(category: Exclude<HelpCategory, "overview">) {
  const commands = commandCatalog.filter((c) => c.category === category);
  const pages: string[] = [];

  for (let i = 0; i < commands.length; i += HELP_PAGE_SIZE) {
    const chunk = commands.slice(i, i + HELP_PAGE_SIZE);
    const text = chunk
      .map((c) => {
        const slash = `Slash: \`${c.slash}\``;
        const prefix = c.prefix ? `\nPrefix: \`${c.prefix}\`` : "";
        const aliases =
          c.aliases && c.aliases.length > 0
            ? `\nAliases: ${c.aliases.map((a) => `\`${a}\``).join(", ")}`
            : "";
        return `**${c.name}**\n${c.description}\n${slash}${prefix}${aliases}`;
      })
      .join("\n\n");
    pages.push(text);
  }

  return pages.length > 0 ? pages : ["No commands available in this category yet."];
}

function buildOverviewEmbed() {
  const utility = getCategoryCommandCount("utility");
  const fun = getCategoryCommandCount("fun");
  const social = getCategoryCommandCount("social");
  const config = getCategoryCommandCount("configuration");
  const image = getCategoryCommandCount("image");
  const total = commandCatalog.length;

  return new EmbedBuilder()
    .setColor(0x5b8cff)
    .setTitle("CoCo-sui Help Center")
    .setDescription(
      "Interactive command browser with categories, aliases, slash usage, and prefix usage."
    )
    .addFields(
      {
        name: "Legend",
        value: "```txt\n<> = required argument\n[] = optional argument\n```"
      },
      {
        name: "Categories",
        value:
          `Utility: **${utility}**\n` +
          `Fun: **${fun}**\n` +
          `Social: **${social}**\n` +
          `Configuration: **${config}**\n` +
          `Image: **${image}**`
      },
      {
        name: "Quick Start",
        value:
          "`/help` interactive panel\n" +
          "`help <category>` or `help <command>`\n" +
          `Total commands documented: **${total}**`
      }
    )
    .setFooter({ text: "Use the menu and pager buttons below." });
}

function buildCategoryEmbed(category: Exclude<HelpCategory, "overview">, page: number) {
  const pages = getCategoryPages(category);
  const safePage = Math.max(0, Math.min(page, pages.length - 1));

  return new EmbedBuilder()
    .setColor(0x5b8cff)
    .setTitle(`${categoryEmoji[category]} ${helpCategoryLabels[category]} Commands`)
    .setDescription(pages[safePage] ?? "No commands found.")
    .setFooter({ text: `Page ${safePage + 1}/${pages.length}` });
}

function buildHelpComponents({ category, page, ownerId }: HelpState) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:select:${ownerId}`)
    .setPlaceholder("Select any category")
    .addOptions(
      { label: `${helpCategoryLabels.overview}`, value: "overview", emoji: categoryEmoji.overview, default: category === "overview" },
      { label: `${helpCategoryLabels.utility} (${getCategoryCommandCount("utility")})`, value: "utility", emoji: categoryEmoji.utility, default: category === "utility" },
      { label: `${helpCategoryLabels.fun} (${getCategoryCommandCount("fun")})`, value: "fun", emoji: categoryEmoji.fun, default: category === "fun" },
      { label: `${helpCategoryLabels.social} (${getCategoryCommandCount("social")})`, value: "social", emoji: categoryEmoji.social, default: category === "social" },
      { label: `${helpCategoryLabels.configuration} (${getCategoryCommandCount("configuration")})`, value: "configuration", emoji: categoryEmoji.configuration, default: category === "configuration" },
      { label: `${helpCategoryLabels.image} (${getCategoryCommandCount("image")})`, value: "image", emoji: categoryEmoji.image, default: category === "image" }
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  const pages =
    category === "overview"
      ? 1
      : getCategoryPages(category as Exclude<HelpCategory, "overview">).length;

  const safePage = Math.max(0, Math.min(page, pages - 1));
  const isOverview = category === "overview";

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`help:nav:${ownerId}:${category}:${safePage}:first`)
      .setLabel("⏮")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isOverview || safePage <= 0),
    new ButtonBuilder()
      .setCustomId(`help:nav:${ownerId}:${category}:${safePage}:prev`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isOverview || safePage <= 0),
    new ButtonBuilder()
      .setCustomId(`help:nav:${ownerId}:${category}:${safePage}:counter`)
      .setLabel(isOverview ? "1/1" : `${safePage + 1}/${pages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`help:nav:${ownerId}:${category}:${safePage}:next`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isOverview || safePage >= pages - 1),
    new ButtonBuilder()
      .setCustomId(`help:nav:${ownerId}:${category}:${safePage}:last`)
      .setLabel("⏭")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isOverview || safePage >= pages - 1)
  );

  const quickLinks = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Overview")
      .setCustomId(`help:nav:${ownerId}:${category}:${safePage}:home`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(category === "overview"),
    new ButtonBuilder()
      .setLabel("Invite")
      .setStyle(ButtonStyle.Link)
      .setURL(HELP_LINKS.invite),
    new ButtonBuilder()
      .setLabel("Support")
      .setStyle(ButtonStyle.Link)
      .setURL(HELP_LINKS.support),
    new ButtonBuilder()
      .setLabel("Vote")
      .setStyle(ButtonStyle.Link)
      .setURL(HELP_LINKS.vote)
  );

  return [selectRow, quickLinks, navRow];
}

function normalizeStartCategory(input: HelpCategory) {
  return input;
}

function normalizeStartPage(category: HelpCategory, page: number) {
  if (category === "overview") return 0;
  const total = getCategoryPages(category as Exclude<HelpCategory, "overview">).length;
  return Math.max(0, Math.min(page, total - 1));
}

function renderHelpState(state: HelpState) {
  const category = normalizeStartCategory(state.category);
  const page = normalizeStartPage(category, state.page);
  const { ownerId } = state;

  const embed =
    category === "overview"
      ? buildOverviewEmbed()
      : buildCategoryEmbed(category as Exclude<HelpCategory, "overview">, page);

  return {
    embeds: [embed],
    components: buildHelpComponents({ category, page, ownerId })
  };
}

export function buildHelpMessage(category: HelpCategory, ownerId: string, page = 0) {
  return renderHelpState({ category, page, ownerId });
}

export function buildCommandHelpMessage(input: string) {
  const command = findCommandDoc(input);
  if (!command) {
    return new EmbedBuilder()
      .setColor(0xffb347)
      .setTitle("Command Not Found")
      .setDescription(`No command found for \`${input}\`. Try \`/help\` or \`help\`.`);
  }

  return new EmbedBuilder()
    .setColor(0x5b8cff)
    .setTitle(`Help: ${command.name}`)
    .setDescription(command.description)
    .addFields(
      { name: "Slash", value: `\`${command.slash}\`` },
      { name: "Prefix", value: command.prefix ? `\`${command.prefix}\`` : "N/A" },
      {
        name: "Aliases",
        value: command.aliases && command.aliases.length > 0
          ? command.aliases.map((a) => `\`${a}\``).join(", ")
          : "None"
      },
      {
        name: "Examples",
        value:
          command.examples && command.examples.length > 0
            ? command.examples.map((e) => `\`${e}\``).join("\n")
            : "Use slash or prefix syntax shown above."
      }
    );
}

export async function handleHelpSelect(interaction: StringSelectMenuInteraction) {
  const [prefix, kind, ownerId] = interaction.customId.split(":");
  if (prefix !== "help" || kind !== "select" || !ownerId) {
    return false;
  }

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "This help panel belongs to another user. Run `/help` to open yours.",
      ephemeral: true
    });
    return true;
  }

  const selected = interaction.values[0] as HelpCategory;
  await interaction.update(buildHelpMessage(selected, ownerId, 0));
  return true;
}

export async function handleHelpButton(interaction: ButtonInteraction) {
  const [prefix, kind, ownerId, rawCategory, rawPage, action] = interaction.customId.split(":");
  if (prefix !== "help" || kind !== "nav" || !ownerId || !rawCategory || !rawPage || !action) {
    return false;
  }

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "This help panel belongs to another user. Run `/help` to open yours.",
      ephemeral: true
    });
    return true;
  }

  if (action === "counter") {
    await interaction.deferUpdate();
    return true;
  }

  const category = rawCategory as HelpCategory;
  const currentPage = Number.parseInt(rawPage, 10);
  const safeCurrentPage = Number.isFinite(currentPage) ? currentPage : 0;

  if (action === "home") {
    await interaction.update(buildHelpMessage("overview", ownerId, 0));
    return true;
  }

  if (category === "overview") {
    await interaction.deferUpdate();
    return true;
  }

  const pageCount = getCategoryPages(category as Exclude<HelpCategory, "overview">).length;

  const targetPage =
    action === "first"
      ? 0
      : action === "last"
        ? pageCount - 1
        : action === "next"
          ? safeCurrentPage + 1
          : safeCurrentPage - 1;

  const safePage = Math.max(0, Math.min(targetPage, pageCount - 1));

  await interaction.update(buildHelpMessage(category, ownerId, safePage));
  return true;
}
