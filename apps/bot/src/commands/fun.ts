import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { C_MAIN } from "../lib/colors.js";
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
import { callWeebyGif } from "../lib/weeby.js";
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

const actionGifCommands: SlashCommand[] = [
  createActionGifCommand({
    name: "angry",
    description: "Get angry at a user",
    gifType: "angry",
    tone: "negative",
    template: (a, b) => `${a} is angry at ${b}!`
  }),
  createActionGifCommand({
    name: "baka",
    description: "Call a user baka",
    gifType: "baka",
    tone: "negative",
    template: (a, b) => `${a} calls ${b} baka!`
  }),
  createActionGifCommand({
    name: "bath",
    description: "Bath anime reaction",
    gifType: "bath",
    tone: "neutral",
    template: (a, b) => `${a} splashes bath vibes at ${b}.`
  }),
  createActionGifCommand({
    name: "blow",
    description: "Blow at a user",
    gifType: "blow",
    tone: "neutral",
    template: (a, b) => `${a} blows at ${b} ~ whoosh!`
  }),
  createActionGifCommand({
    name: "blowkiss",
    description: "Blow a kiss",
    gifType: "blowkiss",
    tone: "romantic",
    template: (a, b) => `${a} blows a kiss to ${b} 💋`
  }),
  createActionGifCommand({
    name: "boom",
    description: "Boom reaction",
    gifType: "boom",
    tone: "negative",
    template: (a, b) => `${a} causes a boom near ${b}!`
  }),
  createActionGifCommand({
    name: "beg",
    description: "Beg dramatically",
    gifType: "beg",
    tone: "neutral",
    template: (a, b) => `${a} begs ${b} dramatically.`
  }),
  createActionGifCommand({
    name: "beer",
    description: "Share a beer vibe",
    gifType: "beer",
    tone: "positive",
    template: (a, b) => `${a} offers a beer to ${b}.`
  }),
  createActionGifCommand({
    name: "bite",
    description: "Bite a user",
    gifType: "bite",
    tone: "negative",
    template: (a, b) => `${a} bites ${b} ~ nom.`
  }),
  createActionGifCommand({
    name: "blush",
    description: "Blush at a user",
    gifType: "blush",
    tone: "romantic",
    template: (a, b) => `${a} blushes at ${b} ~ >.<`
  }),
  createActionGifCommand({
    name: "hug",
    description: "Hug a user",
    gifType: "hug",
    tone: "positive",
    template: (a, b) => `${a} hugs ${b} ~~ awiee!`,
    partnerBondAction: "hug"
  }),
  createActionGifCommand({
    name: "cheer",
    description: "Cheer for a user",
    gifType: "cheer",
    tone: "positive",
    template: (a, b) => `${a} cheers for ${b}!`
  }),
  createActionGifCommand({
    name: "chase",
    description: "Chase a user",
    gifType: "chase",
    tone: "neutral",
    template: (a, b) => `${a} chases ${b} at full speed!`
  }),
  createActionGifCommand({
    name: "clap",
    description: "Clap for a user",
    gifType: "clap",
    tone: "positive",
    template: (a, b) => `${a} claps for ${b}.`
  }),
  createActionGifCommand({
    name: "coffee",
    description: "Coffee vibes",
    gifType: "coffee",
    tone: "positive",
    template: (a, b) => `${a} shares coffee vibes with ${b}.`
  }),
  createActionGifCommand({
    name: "cookie",
    description: "Give a cookie",
    gifType: "cookie",
    tone: "positive",
    template: (a, b) => `${a} gives ${b} a cookie.`
  }),
  createActionGifCommand({
    name: "cringe",
    description: "Cringe reaction",
    gifType: "cringe",
    tone: "negative",
    template: (a, b) => `${a} cringes at ${b}.`
  }),
  createActionGifCommand({
    name: "cry",
    description: "Cry reaction",
    gifType: "cry",
    tone: "neutral",
    template: (a, b) => `${a} cries in front of ${b}.`
  }),
  createActionGifCommand({
    name: "pat",
    description: "Pat a user",
    gifType: "pat",
    tone: "positive",
    template: (a, b) => `${a} pats ${b} ~~ awiee!`,
    partnerBondAction: "pat"
  }),
  createActionGifCommand({
    name: "kiss",
    description: "Kiss a user",
    gifType: "kiss",
    tone: "romantic",
    template: (a, b) => `${a} kisses ${b} ~ cute`,
    partnerBondAction: "kiss"
  }),
  createActionGifCommand({
    name: "cuddle",
    description: "Cuddle a user",
    gifType: "cuddle",
    tone: "romantic",
    template: (a, b) => `${a} cuddles ${b} ~ kyaaa!`,
    partnerBondAction: "cuddle"
  }),
  createActionGifCommand({
    name: "cute",
    description: "Cute reaction",
    gifType: "cute",
    tone: "positive",
    template: (a, b) => `${a} acts cute around ${b}.`
  }),
  createActionGifCommand({
    name: "dab",
    description: "Dab on a user",
    gifType: "dab",
    tone: "neutral",
    template: (a, b) => `${a} dabs on ${b}.`
  }),
  createActionGifCommand({
    name: "dance",
    description: "Dance with vibes",
    gifType: "dance",
    tone: "positive",
    template: (a, b) => `${a} dances with ${b}!`
  }),
  createActionGifCommand({
    name: "facepalm",
    description: "Facepalm at a user",
    gifType: "facepalm",
    tone: "negative",
    template: (a, b) => `${a} facepalms at ${b}.`
  }),
  createActionGifCommand({
    name: "feed",
    description: "Feed a user",
    gifType: "feed",
    tone: "positive",
    template: (a, b) => `${a} feeds ${b} ~ uwu`
  }),
  createActionGifCommand({
    name: "flower",
    description: "Give a flower",
    gifType: "flower",
    tone: "romantic",
    template: (a, b) => `${a} gives ${b} a flower 🌸`
  }),
  createActionGifCommand({
    name: "fly",
    description: "Fly reaction",
    gifType: "fly",
    tone: "neutral",
    template: (a, b) => `${a} flies around ${b}.`
  }),
  createActionGifCommand({
    name: "grumpy",
    description: "Grumpy reaction",
    gifType: "grumpy",
    tone: "negative",
    template: (a, b) => `${a} gets grumpy at ${b}.`
  }),
  createActionGifCommand({
    name: "happy",
    description: "Happy reaction",
    gifType: "happy",
    tone: "positive",
    template: (a, b) => `${a} is happy with ${b}!`
  }),
  createActionGifCommand({
    name: "hate",
    description: "Hate reaction",
    gifType: "hate",
    tone: "negative",
    template: (a, b) => `${a} hates this moment with ${b}.`
  }),
  createActionGifCommand({
    name: "icecream",
    description: "Share ice cream vibes",
    gifType: "icecream",
    tone: "positive",
    template: (a, b) => `${a} shares ice cream with ${b}.`
  }),
  createActionGifCommand({
    name: "kick",
    description: "Kick a user",
    gifType: "kick",
    tone: "negative",
    template: (a, b) => `${a} kicks ${b}!`
  }),
  createActionGifCommand({
    name: "lick",
    description: "Lick a user",
    gifType: "lick",
    tone: "romantic",
    template: (a, b) => `${a} licks ${b} ~ sus!`
  }),
  createActionGifCommand({
    name: "love",
    description: "Show love",
    gifType: "love",
    tone: "romantic",
    template: (a, b) => `${a} sends love to ${b} ❤️`
  }),
  createActionGifCommand({
    name: "lurk",
    description: "Lurk around a user",
    gifType: "lurk",
    tone: "neutral",
    template: (a, b) => `${a} lurks around ${b}.`
  }),
  createActionGifCommand({
    name: "nom",
    description: "Nom a user",
    gifType: "nom",
    tone: "neutral",
    template: (a, b) => `${a} noms ${b} ~ nyaa!`
  }),
  createActionGifCommand({
    name: "nuzzle",
    description: "Nuzzle a user",
    gifType: "nuzzle",
    tone: "romantic",
    template: (a, b) => `${a} nuzzles ${b}.`
  }),
  createActionGifCommand({
    name: "protect",
    description: "Protect a user",
    gifType: "protect",
    tone: "positive",
    template: (a, b) => `${a} protects ${b}.`
  }),
  createActionGifCommand({
    name: "slap",
    description: "Slap a user",
    gifType: "slap",
    tone: "negative",
    template: (a, b) => `${a} slaps ${b} ~ baakaah`
  }),
  createActionGifCommand({
    name: "punch",
    description: "Punch a user",
    gifType: "punch",
    tone: "negative",
    template: (a, b) => `${a} punches ${b} ~ OwO`
  }),
  createActionGifCommand({
    name: "pout",
    description: "Pout at a user",
    gifType: "pout",
    tone: "negative",
    template: (a, b) => `${a} pouts at ${b} ~ hmph`
  }),
  createActionGifCommand({
    name: "highfive",
    description: "Give a high-five",
    gifType: "highfive",
    tone: "positive",
    template: (a, b) => `${a} high fives ${b} ~ yoshh!`
  }),
  createActionGifCommand({
    name: "bonk",
    description: "Bonk a user",
    gifType: "bonk",
    tone: "negative",
    template: (a, b) => `${a} bonks ${b} ~ >.<`
  }),
  createActionGifCommand({
    name: "tickle",
    description: "Tickle a user",
    gifType: "tickle",
    tone: "positive",
    template: (a, b) => `${a} tickles ${b} ~_~`
  }),
  createActionGifCommand({
    name: "rawr",
    description: "Rawr at a user",
    gifType: "rawr",
    tone: "neutral",
    template: (a, b) => `${a} goes rawr at ${b}!`
  }),
  createActionGifCommand({
    name: "run",
    description: "Run reaction",
    gifType: "run",
    tone: "neutral",
    template: (a, b) => `${a} runs around ${b}.`
  }),
  createActionGifCommand({
    name: "shh",
    description: "Tell a user to shh",
    gifType: "shh",
    tone: "neutral",
    template: (a, b) => `${a} tells ${b} to shh.`
  }),
  createActionGifCommand({
    name: "shrug",
    description: "Shrug reaction",
    gifType: "shrug",
    tone: "neutral",
    template: (a, b) => `${a} shrugs at ${b}.`
  }),
  createActionGifCommand({
    name: "sip",
    description: "Sip tea reaction",
    gifType: "sip",
    tone: "neutral",
    template: (a, b) => `${a} sips tea while looking at ${b}.`
  }),
  createActionGifCommand({
    name: "stare",
    description: "Stare at a user",
    gifType: "stare",
    tone: "neutral",
    template: (a, b) => `${a} stares at ${b}.`
  }),
  createActionGifCommand({
    name: "sword",
    description: "Sword action",
    gifType: "sword",
    tone: "negative",
    template: (a, b) => `${a} challenges ${b} with a sword!`
  }),
  createActionGifCommand({
    name: "tease",
    description: "Tease a user",
    gifType: "tease",
    tone: "neutral",
    template: (a, b) => `${a} teases ${b}.`
  }),
  createActionGifCommand({
    name: "teleport",
    description: "Teleport reaction",
    gifType: "teleport",
    tone: "neutral",
    template: (a, b) => `${a} teleports near ${b}.`
  }),
  createActionGifCommand({
    name: "think",
    description: "Thinking reaction",
    gifType: "think",
    tone: "neutral",
    template: (a, b) => `${a} thinks about ${b}.`
  }),
  createActionGifCommand({
    name: "throw",
    description: "Throw at a user",
    gifType: "throw",
    tone: "negative",
    template: (a, b) => `${a} throws at ${b}!`
  }),
  createActionGifCommand({
    name: "wag",
    description: "Wag reaction",
    gifType: "wag",
    tone: "positive",
    template: (a, b) => `${a} wags at ${b}.`
  }),
  createActionGifCommand({
    name: "wasted",
    description: "Wasted reaction",
    gifType: "wasted",
    tone: "negative",
    template: (a, b) => `${a} is wasted around ${b}.`
  }),
  createActionGifCommand({
    name: "wave",
    description: "Wave at a user",
    gifType: "wave",
    tone: "positive",
    template: (a, b) => `${a} waves at ${b}.`
  }),
  createActionGifCommand({
    name: "wedding",
    description: "Wedding vibes",
    gifType: "wedding",
    tone: "romantic",
    template: (a, b) => `${a} shares wedding vibes with ${b}.`
  }),
  createActionGifCommand({
    name: "whisper",
    description: "Whisper to a user",
    gifType: "whisper",
    tone: "romantic",
    template: (a, b) => `${a} whispers to ${b}.`
  }),
  createActionGifCommand({
    name: "wiggle",
    description: "Wiggle reaction",
    gifType: "wiggle",
    tone: "positive",
    template: (a, b) => `${a} wiggles at ${b}.`
  }),
  createActionGifCommand({
    name: "wink",
    description: "Wink at a user",
    gifType: "wink",
    tone: "romantic",
    template: (a, b) => `${a} winks at ${b} ~ uwu`
  })
];

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

export const funCommands: SlashCommand[] = [
  shipRateCommand,
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
  ...actionGifCommands
];
