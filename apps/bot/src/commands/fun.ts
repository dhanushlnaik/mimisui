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
    await interaction.reply(`${user}, ${interaction.user.displayName} poked you!!!!`);
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
  rpsCommand
];
