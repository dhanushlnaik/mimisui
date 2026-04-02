import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ButtonInteraction,
  type User
} from "discord.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import { callWeebyGenerator, callWeebyJson, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

const RR_PREFIX = "coco:rr";

type RandomType =
  | "8ball"
  | "belikebill"
  | "dadjoke"
  | "geography"
  | "joke"
  | "roast"
  | "truthordare"
  | "compliment"
  | "fortune"
  | "chucknorris"
  | "advice"
  | "number"
  | "fact"
  | "dogfact"
  | "catfact"
  | "birdfact"
  | "question"
  | "quote";

const RANDOM_TYPES: RandomType[] = [
  "8ball",
  "belikebill",
  "dadjoke",
  "geography",
  "joke",
  "roast",
  "truthordare",
  "compliment",
  "fortune",
  "chucknorris",
  "advice",
  "number",
  "fact",
  "dogfact",
  "catfact",
  "birdfact",
  "question",
  "quote"
];

const TYPE_LABELS: Record<RandomType, string> = {
  "8ball": "🎱 8Ball",
  belikebill: "🧍 Be Like Bill",
  dadjoke: "👨 Dad Joke",
  geography: "🌍 Geography",
  joke: "😂 Joke",
  roast: "🔥 Roast",
  truthordare: "😈 Truth Or Dare",
  compliment: "🌸 Compliment",
  fortune: "🍀 Fortune",
  chucknorris: "🥋 Chuck Norris",
  advice: "🧠 Advice",
  number: "🔢 Number",
  fact: "📚 Fact",
  dogfact: "🐶 Dog Fact",
  catfact: "🐱 Cat Fact",
  birdfact: "🐦 Bird Fact",
  question: "❓ Question",
  quote: "💬 Quote"
};

function buildButtons(ownerId: string, type: RandomType, withQuoteCard: boolean) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${RR_PREFIX}:${ownerId}:${type}:text`)
      .setLabel("Next")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Primary)
  );
  if (withQuoteCard && type === "quote") {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${RR_PREFIX}:${ownerId}:${type}:card`)
        .setLabel("Next + Card")
        .setEmoji("🖼️")
        .setStyle(ButtonStyle.Secondary)
    );
  }
  return [row];
}

function extractReadableText(data: unknown): { main: string; extras: Array<{ name: string; value: string }> } {
  const extras: Array<{ name: string; value: string }> = [];
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return { main: String(data), extras };
  }
  if (!data || typeof data !== "object") {
    return { main: "No content returned.", extras };
  }

  const obj = data as Record<string, unknown>;
  const keys = [
    "response",
    "answer",
    "joke",
    "fact",
    "quote",
    "text",
    "advice",
    "question",
    "compliment",
    "fortune",
    "message",
    "value"
  ];
  let main = "";
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      main = value.trim();
      break;
    }
  }
  if (!main) {
    const first = Object.values(obj).find((v) => typeof v === "string" && v.trim().length > 0);
    if (typeof first === "string") {
      main = first.trim();
    }
  }
  if (!main) {
    main = "No text found in response.";
  }

  const possibleExtras: Array<[string, string]> = [
    ["author", "Author"],
    ["source", "Source"],
    ["category", "Category"],
    ["id", "ID"]
  ];
  for (const [k, label] of possibleExtras) {
    const value = obj[k];
    if (typeof value === "string" && value.trim().length > 0) {
      extras.push({ name: label, value: value.trim().slice(0, 256) });
    }
  }
  return { main, extras };
}

async function buildRandomResponsePayload(input: {
  type: RandomType;
  requestedNumber?: number;
  mode: "text" | "card";
  viewer: User;
}) {
  const data = await callWeebyJson(input.type, input.requestedNumber);
  const parsed = extractReadableText(data);
  const embed = new EmbedBuilder()
    .setColor(0xf88379)
    .setTitle(TYPE_LABELS[input.type])
    .setDescription(`>>> ${parsed.main.slice(0, 1600)}`)
    .setFooter({ text: "Use Next to regenerate a fresh response." });

  if (parsed.extras.length > 0) {
    embed.addFields(parsed.extras.slice(0, 3));
  }

  if (input.mode === "card" && input.type === "quote") {
    const author =
      typeof (data as Record<string, unknown>)?.author === "string"
        ? ((data as Record<string, unknown>).author as string)
        : input.viewer.username;
    const card = await callWeebyGenerator("quote", {
      image: getAvatarUrl(input.viewer, 1024),
      text: parsed.main.slice(0, 280),
      author
    });
    embed.setImage("attachment://quote.png");
    return {
      embeds: [embed],
      files: [weebyAttachment("quote", card, "png")]
    };
  }

  return {
    embeds: [embed]
  };
}

export async function handleRandomResponseButton(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith(`${RR_PREFIX}:`)) return false;

  const [, ownerId, typeRaw, modeRaw] = interaction.customId.split(":");
  const type = RANDOM_TYPES.find((t) => t === typeRaw) ?? null;
  const mode = modeRaw === "card" ? "card" : "text";
  if (!ownerId || !type) return false;

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "Only the command user can control this response panel.",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferUpdate();
  try {
    const payload = await buildRandomResponsePayload({
      type,
      mode,
      viewer: interaction.user
    });
    await interaction.editReply({
      ...payload,
      components: buildButtons(ownerId, type, true)
    });
  } catch (error) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle("Random Response Failed")
          .setDescription(error instanceof Error ? error.message : "Could not fetch random response right now.")
      ],
      components: buildButtons(ownerId, type, true),
      files: []
    });
  }
  return true;
}

export const randomResponseCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("randomresponse")
    .setDescription("Get random responses (jokes, facts, advice, quote, and more).")
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Response type")
        .setRequired(true)
        .addChoices(...RANDOM_TYPES.map((t) => ({ name: TYPE_LABELS[t], value: t })))
    )
    .addIntegerOption((o) =>
      o
        .setName("number")
        .setDescription("Optional specific number for APIs that support it")
        .setMinValue(0)
    )
    .addBooleanOption((o) =>
      o
        .setName("quote_card")
        .setDescription("If type is quote, attach generated quote card too.")
    ),
  async execute(interaction) {
    const type = interaction.options.getString("type", true) as RandomType;
    const requestedNumber = interaction.options.getInteger("number") ?? undefined;
    const withQuoteCard = interaction.options.getBoolean("quote_card") ?? true;
    await interaction.deferReply();

    try {
      const payload = await buildRandomResponsePayload({
        type,
        requestedNumber,
        mode: withQuoteCard && type === "quote" ? "card" : "text",
        viewer: interaction.user
      });
      await interaction.editReply({
        ...payload,
        components: buildButtons(interaction.user.id, type, true)
      });
    } catch (error) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle("Random Response Failed")
            .setDescription(error instanceof Error ? error.message : "Could not fetch random response right now.")
        ],
        components: buildButtons(interaction.user.id, type, true)
      });
    }
  }
};

