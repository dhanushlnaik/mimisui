import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const EIGHT_BALL = {
  affirmative: [
    "It is certain",
    "Without a doubt",
    "You may rely on it",
    "As I see it, yes",
    "Outlook good"
  ],
  neutral: [
    "Reply hazy, try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now"
  ],
  negative: ["Don't count on it", "My reply is no", "My sources say no", "Very doubtful"]
};

const GAY_COMMENTS = {
  low: ["No homo", "Wearing socks", "Straight-ish"],
  mid: ["Possible homo", "Gay-ish", "In between for now"],
  high: ["HOMO ALERT", "BIG GAY", "THE SOCKS ARE OFF"]
};

const DEFAULT_JOKES = [
  "Yo momma so old, her social security number is 1.",
  "Yo momma so bright, she outshines your monitor.",
  "Yo momma so strong, gravity asks her for permission."
];

function rand<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("rand() called with empty array");
  }
  return items[Math.floor(Math.random() * items.length)] as T;
}

function findDataFile(file: string) {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "apps/bot/src/data", file),
    resolve(cwd, "src/data", file),
    resolve(cwd, "../src/data", file)
  ];
  return candidates.find((path) => existsSync(path));
}

function readJson(file: string) {
  const path = findDataFile(file);
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function shipResult(name1: string, name2: string) {
  const score = Math.floor(Math.random() * 101);
  let status = "Moderate";
  let color = 0xff6600;
  if (score <= 33) {
    status = rand(["Friendzone", "Little to no love", "Just friends"]);
    color = 0xe80303;
  } else if (score >= 66) {
    status = rand(["It's a match", "Love is in the air", "True love potential"]);
    color = 0x3be801;
  } else {
    status = rand(["There is potential", "Some romance in the air", "Getting there"]);
  }
  return { score, status, color, name1, name2 };
}

export function eightBallAnswer() {
  const type: keyof typeof EIGHT_BALL = rand(["affirmative", "neutral", "negative"] as const);
  const color = type === "affirmative" ? 0x3be801 : type === "neutral" ? 0xff6600 : 0xe80303;
  return { type, answer: rand(EIGHT_BALL[type]), color };
}

export function gayScan(name: string) {
  const score = Math.floor(Math.random() * 101);
  const tier: keyof typeof GAY_COMMENTS = score <= 33 ? "low" : score < 66 ? "mid" : "high";
  const color = tier === "low" ? 0xffc0cb : tier === "mid" ? 0xff69b4 : 0xff00ff;
  return { name, score, comment: rand(GAY_COMMENTS[tier]), color };
}

export function getMommaJoke() {
  const data = readJson("jokes.json") as Record<string, string[]> | null;
  if (!data || Object.keys(data).length === 0) return rand(DEFAULT_JOKES);
  const category = rand(Object.keys(data));
  if (!category) return rand(DEFAULT_JOKES);
  const list = data[category] ?? DEFAULT_JOKES;
  return rand(list);
}

export async function getTodQuestion(type: "truth" | "dare" | "wyr" | "nhie", rating = "pg13") {
  const endpointMap: Record<typeof type, string> = {
    truth: "truth",
    dare: "dare",
    wyr: "wyr",
    nhie: "nhie"
  };

  const endpoint = endpointMap[type];
  const urls = [
    `https://api.truthordarebot.xyz/v1/${endpoint}?rating=${rating}`,
    `https://api.truthordarebot.xyz/api/${endpoint}?rating=${rating}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as { question?: string };
      if (json.question) return json.question;
    } catch {
      // fallback below
    }
  }

  const local = readJson("tord.json") as Record<string, string[]> | null;
  const list = local?.[type];
  if (Array.isArray(list) && list.length > 0) return rand(list);

  return "No question available right now.";
}

export function textToOwo(text: string) {
  const smileys = [";;w;;", "^w^", ">w<", "UwU", "(・`ω´・)", "(´・ω・`)"];
  const vowels = ["a", "e", "i", "o", "u", "A", "E", "I", "O", "U"];

  let out = text.replace(/l/g, "w").replace(/r/g, "w").replace(/L/g, "W").replace(/R/g, "W");
  out = out.replace(/!$/, `! ${rand(smileys)}`).replace(/\?$/, "? owo").replace(/\.$/, `. ${rand(smileys)}`);

  for (const v of vowels) {
    out = out.replaceAll(`n${v}`, `ny${v}`).replaceAll(`N${v}`, `N${v === v.toUpperCase() ? "Y" : "y"}${v}`);
  }
  return out;
}
