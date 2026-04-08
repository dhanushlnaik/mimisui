import { AttachmentBuilder, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
import {
  formatCancelledArray,
  formatFlamesStep,
  getFlamesProcess,
  normalizeFlamesName,
  wait
} from "../lib/flames.js";
import { avatarSplitFromUrls } from "../lib/rich-media.js";
import { getAvatarUrl } from "../lib/user-avatar.js";
import {
  eightBallAnswer,
  gayScan,
  getMommaJoke,
  getTodQuestion,
  shipResult,
  textToOwo
} from "../lib/fun-utils.js";
import { awardPartnerActionBond } from "../lib/family.js";
import { callWeebyGenerator, callWeebyGif, weebyAttachment } from "../lib/weeby.js";
import type { SlashCommand } from "../types/command.js";

const melon = 0xf88379;

async function fetchJson<T>(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

const shipRateCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("shiprate")
    .setDescription("Ship two names/users")
    .addUserOption((o) => o.setName("user1").setDescription("First user"))
    .addUserOption((o) => o.setName("user2").setDescription("Second user"))
    .addStringOption((o) => o.setName("name1").setDescription("First name/user"))
    .addStringOption((o) => o.setName("name2").setDescription("Second name/user")),
  async execute(interaction) {
    const user1 = interaction.options.getUser("user1") ?? interaction.user;
    const user2 = interaction.options.getUser("user2");
    const name1 = interaction.options.getString("name1") ?? user1.displayName;
    const name2 = interaction.options.getString("name2") ?? user2?.displayName ?? "mystery";
    const result = shipResult(name1, name2);
    const embed = new EmbedBuilder()
      .setColor(result.color)
      .setTitle("Love Test")
      .setDescription(`**${name1}** + **${name2}**`)
      .addFields(
        { name: "Result", value: `${result.score}%`, inline: true },
        { name: "Status", value: result.status, inline: false }
      );

    if (!user2) {
      embed.setImage(getAvatarUrl(user1));
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const merged = await avatarSplitFromUrls(getAvatarUrl(user1), getAvatarUrl(user2));
    const file = new AttachmentBuilder(merged, { name: "shiprate.png" });
    embed.setImage("attachment://shiprate.png");

    await interaction.reply({ embeds: [embed], files: [file] });
  }
};

const eightBallCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("eightball")
    .setDescription("Ask the magic 8-ball")
    .addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString("question", true);
    const res = eightBallAnswer();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(res.color)
          .setTitle(`Question: ${question}`)
          .setDescription(`${res.answer} 🎱`)
      ]
    });
  }
};

const gayCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("gay")
    .setDescription("Gay scanner")
    .addUserOption((o) => o.setName("user").setDescription("User to scan"))
    .addStringOption((o) => o.setName("name").setDescription("Name/user to scan")),
  async execute(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const name = interaction.options.getString("name") ?? user.displayName;
    const res = gayScan(name);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(res.color)
          .setTitle("Gay-Scanner")
          .setDescription(`Gayness for **${name}**`)
          .addFields(
            { name: "Gayness", value: `${res.score}%`, inline: true },
            { name: "Comment", value: `${res.comment} :kiss_mm:`, inline: false }
          )
          .setImage(getAvatarUrl(user))
      ]
    });
  }
};

const insultCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("insult")
    .setDescription("Yo momma joke")
    .addUserOption((o) => o.setName("user").setDescription("Target user")),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const joke = getMommaJoke();
    await interaction.reply(user ? `${user} eat this: ${joke}` : `${interaction.user} for yourself: ${joke}`);
  }
};

const sayCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make bot say something")
    .addStringOption((o) => o.setName("text").setDescription("Text to send").setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString("text", true);
    await interaction.reply({ content: text });
  }
};

const dogCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("dog").setDescription("Random dog image + fact"),
  async execute(interaction) {
    try {
      const img = await fetchJson<{ link: string }>("https://some-random-api.com/animal/dog");
      const fact = await fetchJson<{ fact: string }>("https://some-random-api.com/animal/dog");
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(C_MAIN).setTitle("Doggo!").setDescription(fact.fact).setImage(img.link)]
      });
    } catch {
      await interaction.reply("Couldn't fetch dog content right now.");
    }
  }
};

const catCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("cat").setDescription("Random cat image + fact"),
  async execute(interaction) {
    try {
      const img = await fetchJson<{ link: string }>("https://some-random-api.com/animal/cat");
      const fact = await fetchJson<{ fact: string }>("https://some-random-api.com/animal/cat");
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(C_MAIN).setTitle("Catto!").setDescription(fact.fact).setImage(img.link)]
      });
    } catch {
      await interaction.reply("Couldn't fetch cat content right now.");
    }
  }
};

const pokeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("poke")
    .setDescription("Poke a user")
    .addUserOption((o) => o.setName("user").setDescription("User to poke").setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    let gifUrl: string | null = null;
    try {
      gifUrl = await callWeebyGif("poke");
    } catch {
      gifUrl = null;
    }
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription(`${interaction.user} pokes ${user} ~ OwO`)
          .setImage(gifUrl)
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

function createActionGifCommand(config: {
  name: string;
  description: string;
  gifType: string;
  template: (author: string, target: string) => string;
  tone?: "romantic" | "positive" | "negative" | "neutral";
  partnerBondAction?: "hug" | "pat" | "kiss" | "cuddle";
}): SlashCommand {
  return {
    data: new SlashCommandBuilder()
      .setName(config.name)
      .setDescription(config.description)
      .addUserOption((o) => o.setName("user").setDescription("Target user")),
    async execute(interaction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      let gifUrl: string | null = null;
      try {
        gifUrl = await callWeebyGif(config.gifType);
      } catch {
        gifUrl = null;
      }
      let partnerBonusLine: string | null = null;
      if (config.partnerBondAction) {
        const bonus = await awardPartnerActionBond({
          userId: interaction.user.id,
          targetUserId: user.id,
          guildId: interaction.guildId,
          action: config.partnerBondAction
        });
        if (bonus?.applied) {
          partnerBonusLine = `💞 Partner Bonus: +${bonus.rewards.bondXp} bond XP • +${bonus.rewards.bondScore} UwU`;
        }
      }
      const isSelfTarget = user.id === interaction.user.id;
      const tone = config.tone ?? "neutral";
      const toneLine =
        tone === "romantic"
          ? "💘 Romantic vibes unlocked."
          : tone === "positive"
            ? "✨ Wholesome vibes only."
            : tone === "negative"
              ? "⚠️ Chaos intensity increased."
              : "🎬 Anime moment triggered.";
      const selfLine =
        tone === "negative" && isSelfTarget
          ? "You hit yourself with your own chaos."
          : tone === "romantic" && isSelfTarget
            ? "Self-love arc activated."
            : isSelfTarget
              ? "Solo move, but still stylish."
              : null;
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setDescription(
              [config.template(`${interaction.user}`, `${user}`), toneLine, selfLine, partnerBonusLine]
                .filter(Boolean)
                .join("\n")
            )
            .setImage(gifUrl)
            .setFooter({ text: "Team Tatsui ❤️" })
        ]
      });
    }
  };
}

const CORE_ACTION_COMMANDS: Array<{
  name: string;
  description: string;
  gifType: string;
  tone: "romantic" | "positive" | "negative" | "neutral";
  template: (author: string, target: string) => string;
  partnerBondAction?: "hug" | "pat" | "kiss" | "cuddle";
}> = [
  { name: "hug", description: "Hug a user", gifType: "hug", tone: "positive", template: (a, b) => `${a} hugs ${b} ~~ awiee!`, partnerBondAction: "hug" },
  { name: "pat", description: "Pat a user", gifType: "pat", tone: "positive", template: (a, b) => `${a} pats ${b} ~~ awiee!`, partnerBondAction: "pat" },
  { name: "kiss", description: "Kiss a user", gifType: "kiss", tone: "romantic", template: (a, b) => `${a} kisses ${b} ~ cute`, partnerBondAction: "kiss" },
  { name: "cuddle", description: "Cuddle a user", gifType: "cuddle", tone: "romantic", template: (a, b) => `${a} cuddles ${b} ~ kyaaa!`, partnerBondAction: "cuddle" },
  { name: "slap", description: "Slap a user", gifType: "slap", tone: "negative", template: (a, b) => `${a} slaps ${b} ~ baakaah` },
  { name: "highfive", description: "Give a high-five", gifType: "highfive", tone: "positive", template: (a, b) => `${a} high fives ${b} ~ yoshh!` },
  { name: "bonk", description: "Bonk a user", gifType: "bonk", tone: "negative", template: (a, b) => `${a} bonks ${b} ~ >.<` },
  { name: "tickle", description: "Tickle a user", gifType: "tickle", tone: "positive", template: (a, b) => `${a} tickles ${b} ~_~` },
  { name: "wink", description: "Wink at a user", gifType: "wink", tone: "romantic", template: (a, b) => `${a} winks at ${b} ~ uwu` }
];

const actionGifCommands: SlashCommand[] = CORE_ACTION_COMMANDS.map((cmd) =>
  createActionGifCommand({
    name: cmd.name,
    description: cmd.description,
    gifType: cmd.gifType,
    tone: cmd.tone,
    template: cmd.template,
    partnerBondAction: cmd.partnerBondAction
  })
);

const ACTION_TYPE_CONFIG: Record<
  string,
  {
    gifType: string;
    tone: "romantic" | "positive" | "negative" | "neutral";
    template: (author: string, target: string) => string;
    partnerBondAction?: "hug" | "pat" | "kiss" | "cuddle";
  }
> = {
  angry: { gifType: "angry", tone: "negative", template: (a, b) => `${a} is angry at ${b}!` },
  baka: { gifType: "baka", tone: "negative", template: (a, b) => `${a} calls ${b} baka!` },
  bath: { gifType: "bath", tone: "neutral", template: (a, b) => `${a} splashes bath vibes at ${b}.` },
  blow: { gifType: "blow", tone: "neutral", template: (a, b) => `${a} blows at ${b} ~ whoosh!` },
  blowkiss: { gifType: "blowkiss", tone: "romantic", template: (a, b) => `${a} blows a kiss to ${b} 💋` },
  boom: { gifType: "boom", tone: "negative", template: (a, b) => `${a} causes a boom near ${b}!` },
  beg: { gifType: "beg", tone: "neutral", template: (a, b) => `${a} begs ${b} dramatically.` },
  beer: { gifType: "beer", tone: "positive", template: (a, b) => `${a} offers a beer to ${b}.` },
  bite: { gifType: "bite", tone: "negative", template: (a, b) => `${a} bites ${b} ~ nom.` },
  blush: { gifType: "blush", tone: "romantic", template: (a, b) => `${a} blushes at ${b} ~ >.<` },
  bonk: { gifType: "bonk", tone: "negative", template: (a, b) => `${a} bonks ${b} ~ >.<` },
  cheer: { gifType: "cheer", tone: "positive", template: (a, b) => `${a} cheers for ${b}!` },
  chase: { gifType: "chase", tone: "neutral", template: (a, b) => `${a} chases ${b} at full speed!` },
  clap: { gifType: "clap", tone: "positive", template: (a, b) => `${a} claps for ${b}.` },
  coffee: { gifType: "coffee", tone: "positive", template: (a, b) => `${a} shares coffee vibes with ${b}.` },
  cookie: { gifType: "cookie", tone: "positive", template: (a, b) => `${a} gives ${b} a cookie.` },
  cringe: { gifType: "cringe", tone: "negative", template: (a, b) => `${a} cringes at ${b}.` },
  cry: { gifType: "cry", tone: "neutral", template: (a, b) => `${a} cries in front of ${b}.` },
  cuddle: { gifType: "cuddle", tone: "romantic", template: (a, b) => `${a} cuddles ${b} ~ kyaaa!`, partnerBondAction: "cuddle" },
  cute: { gifType: "cute", tone: "positive", template: (a, b) => `${a} acts cute around ${b}.` },
  dab: { gifType: "dab", tone: "neutral", template: (a, b) => `${a} dabs on ${b}.` },
  dance: { gifType: "dance", tone: "positive", template: (a, b) => `${a} dances with ${b}!` },
  facepalm: { gifType: "facepalm", tone: "negative", template: (a, b) => `${a} facepalms at ${b}.` },
  feed: { gifType: "feed", tone: "positive", template: (a, b) => `${a} feeds ${b} ~ uwu` },
  flower: { gifType: "flower", tone: "romantic", template: (a, b) => `${a} gives ${b} a flower 🌸` },
  fly: { gifType: "fly", tone: "neutral", template: (a, b) => `${a} flies around ${b}.` },
  grumpy: { gifType: "grumpy", tone: "negative", template: (a, b) => `${a} gets grumpy at ${b}.` },
  happy: { gifType: "happy", tone: "positive", template: (a, b) => `${a} is happy with ${b}!` },
  hate: { gifType: "hate", tone: "negative", template: (a, b) => `${a} hates this moment with ${b}.` },
  hug: { gifType: "hug", tone: "positive", template: (a, b) => `${a} hugs ${b} ~~ awiee!`, partnerBondAction: "hug" },
  icecream: { gifType: "icecream", tone: "positive", template: (a, b) => `${a} shares ice cream with ${b}.` },
  kick: { gifType: "kick", tone: "negative", template: (a, b) => `${a} kicks ${b}!` },
  kiss: { gifType: "kiss", tone: "romantic", template: (a, b) => `${a} kisses ${b} ~ cute`, partnerBondAction: "kiss" },
  lick: { gifType: "lick", tone: "romantic", template: (a, b) => `${a} licks ${b} ~ sus!` },
  love: { gifType: "love", tone: "romantic", template: (a, b) => `${a} sends love to ${b} ❤️` },
  lurk: { gifType: "lurk", tone: "neutral", template: (a, b) => `${a} lurks around ${b}.` },
  nom: { gifType: "nom", tone: "neutral", template: (a, b) => `${a} noms ${b} ~ nyaa!` },
  nuzzle: { gifType: "nuzzle", tone: "romantic", template: (a, b) => `${a} nuzzles ${b}.` },
  pat: { gifType: "pat", tone: "positive", template: (a, b) => `${a} pats ${b} ~~ awiee!`, partnerBondAction: "pat" },
  pout: { gifType: "pout", tone: "negative", template: (a, b) => `${a} pouts at ${b} ~ hmph` },
  protect: { gifType: "protect", tone: "positive", template: (a, b) => `${a} protects ${b}.` },
  punch: { gifType: "punch", tone: "negative", template: (a, b) => `${a} punches ${b} ~ OwO` },
  rawr: { gifType: "rawr", tone: "neutral", template: (a, b) => `${a} goes rawr at ${b}!` },
  run: { gifType: "run", tone: "neutral", template: (a, b) => `${a} runs around ${b}.` },
  shh: { gifType: "shh", tone: "neutral", template: (a, b) => `${a} tells ${b} to shh.` },
  shrug: { gifType: "shrug", tone: "neutral", template: (a, b) => `${a} shrugs at ${b}.` },
  sip: { gifType: "sip", tone: "neutral", template: (a, b) => `${a} sips tea while looking at ${b}.` },
  slap: { gifType: "slap", tone: "negative", template: (a, b) => `${a} slaps ${b} ~ baakaah` },
  stare: { gifType: "stare", tone: "neutral", template: (a, b) => `${a} stares at ${b}.` },
  sword: { gifType: "sword", tone: "negative", template: (a, b) => `${a} challenges ${b} with a sword!` },
  tease: { gifType: "tease", tone: "neutral", template: (a, b) => `${a} teases ${b}.` },
  teleport: { gifType: "teleport", tone: "neutral", template: (a, b) => `${a} teleports near ${b}.` },
  think: { gifType: "think", tone: "neutral", template: (a, b) => `${a} thinks about ${b}.` },
  throw: { gifType: "throw", tone: "negative", template: (a, b) => `${a} throws at ${b}!` },
  tickle: { gifType: "tickle", tone: "positive", template: (a, b) => `${a} tickles ${b} ~_~` },
  triggered: { gifType: "triggered", tone: "negative", template: (a, b) => `${a} gets triggered by ${b}.` },
  wag: { gifType: "wag", tone: "positive", template: (a, b) => `${a} wags at ${b}.` },
  wasted: { gifType: "wasted", tone: "negative", template: (a, b) => `${a} is wasted around ${b}.` },
  wave: { gifType: "wave", tone: "positive", template: (a, b) => `${a} waves at ${b}.` },
  wedding: { gifType: "wedding", tone: "romantic", template: (a, b) => `${a} shares wedding vibes with ${b}.` },
  whisper: { gifType: "whisper", tone: "romantic", template: (a, b) => `${a} whispers to ${b}.` },
  wiggle: { gifType: "wiggle", tone: "positive", template: (a, b) => `${a} wiggles at ${b}.` },
  wink: { gifType: "wink", tone: "romantic", template: (a, b) => `${a} winks at ${b} ~ uwu` }
};

const actionCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("action")
    .setDescription("Run any Weeby action GIF by type.")
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Action type like angry, blowkiss, wave, wedding, etc.")
        .setRequired(true)
    )
    .addUserOption((o) => o.setName("user").setDescription("Target user")),
  async execute(interaction) {
    const type = interaction.options.getString("type", true).trim().toLowerCase();
    const config = ACTION_TYPE_CONFIG[type];
    if (!config) {
      const examples = Object.keys(ACTION_TYPE_CONFIG).slice(0, 20).join(", ");
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf72585)
            .setTitle("Unknown Action Type")
            .setDescription(
              [
                `Use one of the supported types (example set):`,
                `\`${examples}\``,
                "",
                "Tip: check `/help action` for usage."
              ].join("\n")
            )
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const user = interaction.options.getUser("user") ?? interaction.user;
    let gifUrl: string | null = null;
    try {
      gifUrl = await callWeebyGif(config.gifType);
    } catch {
      gifUrl = null;
    }
    let partnerBonusLine: string | null = null;
    if (config.partnerBondAction) {
      const bonus = await awardPartnerActionBond({
        userId: interaction.user.id,
        targetUserId: user.id,
        guildId: interaction.guildId,
        action: config.partnerBondAction
      });
      if (bonus?.applied) {
        partnerBonusLine = `💞 Partner Bonus: +${bonus.rewards.bondXp} bond XP • +${bonus.rewards.bondScore} UwU`;
      }
    }

    const toneLine =
      config.tone === "romantic"
        ? "💘 Romantic vibes unlocked."
        : config.tone === "positive"
          ? "✨ Wholesome vibes only."
          : config.tone === "negative"
            ? "⚠️ Chaos intensity increased."
            : "🎬 Anime moment triggered.";

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setDescription([config.template(`${interaction.user}`, `${user}`), toneLine, partnerBonusLine].filter(Boolean).join("\n"))
          .setImage(gifUrl)
          .setFooter({ text: "Team Tatsui ❤️" })
      ]
    });
  }
};

const owoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("owo")
    .setDescription("Owoify text")
    .addStringOption((o) => o.setName("text").setDescription("Text to owoify").setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString("text", true);
    await interaction.reply(textToOwo(text));
  }
};

function createTodCommand(name: "truth" | "dare" | "wyr" | "nhie", title: string): SlashCommand {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(`Get a random ${name} question`),
    async execute(interaction) {
      const q = await getTodQuestion(name);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(melon).setAuthor({ name: `${title}: ${q}` })]
      });
    }
  };
}

const urbanCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("urban")
    .setDescription("Urban Dictionary lookup")
    .addStringOption((o) => o.setName("term").setDescription("Term to define").setRequired(true)),
  async execute(interaction) {
    const term = interaction.options.getString("term", true);
    try {
      const data = await fetchJson<{ list: { definition: string; example: string }[] }>(
        `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`
      );
      const first = data.list[0];
      if (!first) {
        await interaction.reply(`No Urban Dictionary result for **${term}**.`);
        return;
      }
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(melon)
            .setTitle(term)
            .setDescription(`Meaning: ${first.definition.slice(0, 1500)}`)
            .addFields({ name: "Example", value: first.example.slice(0, 1000) || "N/A" })
        ]
      });
    } catch {
      await interaction.reply("Urban lookup failed right now.");
    }
  }
};

const rpsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Rock Paper Scissors")
    .addStringOption((o) =>
      o
        .setName("choice")
        .setDescription("Your choice")
        .setRequired(true)
        .addChoices(
          { name: "Rock", value: "Rock" },
          { name: "Paper", value: "Paper" },
          { name: "Scissors", value: "Scissors" }
        )
    ),
  async execute(interaction) {
    const user = interaction.options.getString("choice", true);
    const bot = ["Rock", "Paper", "Scissors"][Math.floor(Math.random() * 3)] ?? "Rock";
    const win =
      (user === "Rock" && bot === "Scissors") ||
      (user === "Paper" && bot === "Rock") ||
      (user === "Scissors" && bot === "Paper");
    const draw = user === bot;
    const result = draw ? "It's a draw." : win ? "You win!" : "I win!";
    await interaction.reply(`You: **${user}** | Me: **${bot}**\n${result}`);
  }
};

const flamesCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("flames")
    .setDescription("Reveal FLAMES result with step-by-step animation")
    .addUserOption((o) => o.setName("user1").setDescription("First user"))
    .addUserOption((o) => o.setName("user2").setDescription("Second user"))
    .addStringOption((o) => o.setName("name1").setDescription("First name (optional)"))
    .addStringOption((o) => o.setName("name2").setDescription("Second name (optional)")),
  async execute(interaction) {
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2");
    const argName1 = interaction.options.getString("name1");
    const argName2 = interaction.options.getString("name2");

    const firstName = argName1 ?? user1?.displayName ?? interaction.user.displayName;
    const secondName = argName2 ?? user2?.displayName ?? user1?.displayName ?? "mystery";
    const leftLabel = user2 ? firstName : `${interaction.user.displayName}`;
    const rightLabel = secondName;
    const leftDisplay = user2 ? firstName : interaction.user.displayName;
    const rightDisplay = user2 ? secondName : secondName;
    const firstVisualUser = user2 ? (user1 ?? interaction.user) : user1 ? interaction.user : null;
    const secondVisualUser = user2 ? user2 : user1 ?? null;

    const clean1 = normalizeFlamesName(leftDisplay);
    const clean2 = normalizeFlamesName(rightDisplay);
    if (!clean1 || !clean2) {
      await interaction.reply({
        content: "Both names need valid alphabet letters.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const process = getFlamesProcess(leftDisplay, rightDisplay);
    const makeEmbed = (title: string, description: string) =>
      new EmbedBuilder().setColor(0xf72585).setTitle(title).setDescription(description);

    await interaction.reply({
      embeds: [
        makeEmbed(
          "FLAMES Calculator",
          `Starting FLAMES for **${leftLabel}** × **${rightLabel}**...\n\nPreparing names...`
        )
      ]
    });

    await wait(900);

    await interaction.editReply({
      embeds: [
        makeEmbed(
          "FLAMES Calculator",
          `**Original Names**\n**${leftLabel}**\n**${rightLabel}**\n\n**Normalized**\n\`${process.normalized1}\`\n\`${process.normalized2}\``
        )
      ]
    });

    await wait(1000);

    const cancelSteps = process.cancelSteps.slice(0, 8);
    for (let i = 0; i < cancelSteps.length; i++) {
      const step = cancelSteps[i]!;
      await interaction.editReply({
        embeds: [
          makeEmbed(
            `Cancelling Letters (${i + 1}/${process.cancelSteps.length})`,
            `Removing common letter: **${step.matched}**\n\n**${leftLabel}**\n${formatCancelledArray(step.name1After)}\n\n**${rightLabel}**\n${formatCancelledArray(step.name2After)}`
          )
        ]
      });
      await wait(850);
    }

    if (process.cancelSteps.length > cancelSteps.length) {
      await interaction.editReply({
        embeds: [
          makeEmbed(
            "Cancelling Letters",
            `Processed first **${cancelSteps.length}** live steps.\nRemaining cancellations were summarized to keep this smooth.`
          )
        ]
      });
      await wait(800);
    }

    await interaction.editReply({
      embeds: [
        makeEmbed(
          "Remaining Letters",
          `**${leftLabel}** → \`${process.remaining1 || "none"}\`\n**${rightLabel}** → \`${process.remaining2 || "none"}\`\n\nTotal remaining count = **${process.count}**`
        )
      ]
    });

    await wait(1000);

    for (let i = 0; i < process.flamesSteps.length; i++) {
      const step = process.flamesSteps[i]!;
      await interaction.editReply({
        embeds: [
          makeEmbed(
            `FLAMES Round ${i + 1}`,
            `Count = **${process.count}**\n\n${formatFlamesStep(step.before, step.removed)}\n\nRemoved: **${step.removed}**\nRemaining: **${step.after.join(" ")}**`
          )
        ]
      });
      await wait(900);
    }

    const reactionMap: Record<string, string> = {
      Friends: "bestie zone unlocked",
      Love: "ok this one has lore",
      Affection: "soft vibes only",
      Marriage: "bro skipped to endgame",
      Enemies: "nah this turned toxic",
      Siblings: "most painful result possible"
    };

    const finalEmbed = makeEmbed(
      "FLAMES Result",
      `**${leftLabel} × ${rightLabel}**\n\nFinal Letter: **${process.finalLetter}**\nResult: **${process.finalResult}**\n\n_${reactionMap[process.finalResult] ?? "fate has spoken"}_`
    );

    if (firstVisualUser && secondVisualUser) {
      const generatorMap: Record<string, string[]> = {
        Friends: ["samepicture", "friendship"],
        Love: ["simpleship", "ship", "crush", "friendship"],
        Affection: ["cuddle", "friendship"],
        Marriage: ["ship", "simpleship", "friendship"],
        Enemies: ["batslap", "whowouldwin", "friendship"],
        Siblings: ["samepicture", "friendship"]
      };

      const candidates = generatorMap[process.finalResult] ?? ["friendship"];
      for (const generator of candidates) {
        try {
          const result =
            generator === "friendship"
              ? await callWeebyGenerator("friendship", {
                  firstimage: getAvatarUrl(firstVisualUser),
                  secondimage: getAvatarUrl(secondVisualUser),
                  firsttext: firstVisualUser.displayName,
                  secondtext: secondVisualUser.displayName
                })
              : await callWeebyGenerator(generator, {
                  firstimage: getAvatarUrl(firstVisualUser),
                  secondimage: getAvatarUrl(secondVisualUser)
                });

          finalEmbed.setImage(`attachment://${generator}.png`);
          await interaction.editReply({
            embeds: [finalEmbed],
            files: [weebyAttachment(generator, result, "png")]
          });
          return;
        } catch {
          // try next candidate
        }
      }
    }

    try {
      const gifMap: Record<string, string> = {
        Friends: "highfive",
        Love: "kiss",
        Affection: "cuddle",
        Marriage: "wedding",
        Enemies: "slap",
        Siblings: "handhold"
      };
      const gif = await callWeebyGif(gifMap[process.finalResult] ?? "wink");
      finalEmbed.setImage(gif);
    } catch {
      // keep embed without image if provider fails
    }

    await interaction.editReply({ embeds: [finalEmbed] });
  }
};

export const funCommands: SlashCommand[] = [
  shipRateCommand,
  flamesCommand,
  eightBallCommand,
  gayCommand,
  insultCommand,
  sayCommand,
  dogCommand,
  catCommand,
  pokeCommand,
  owoCommand,
  createTodCommand("dare", "DARE"),
  createTodCommand("truth", "TRUTH"),
  createTodCommand("wyr", "WYR"),
  createTodCommand("nhie", "NHIE"),
  urbanCommand,
  rpsCommand,
  actionCommand,
  ...actionGifCommands
];
