import petPetGif from "pet-pet-gif";
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

async function fetchBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function petPetFromAvatarUrl(avatarUrl: string) {
  return petPetGif(avatarUrl, {
    resolution: 128,
    delay: 20
  });
}

export async function avatarSplitFromUrls(firstUrl: string, secondUrl: string) {
  const [avatar1, avatar2] = await Promise.all([fetchBuffer(firstUrl), fetchBuffer(secondUrl)]);

  const [left, right] = await Promise.all([
    sharp(avatar1).resize(512, 512, { fit: "cover" }).png().toBuffer(),
    sharp(avatar2).resize(512, 512, { fit: "cover" }).png().toBuffer()
  ]);

  return sharp({
    create: {
      width: 1024,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: 512, top: 0 }
    ])
    .png()
    .toBuffer();
}

function escapeXml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clampLabel(input: string, max = 24) {
  const trimmed = input.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function getSimpTemplatePath() {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "src/images/simpcard.png"),
    resolve(cwd, "apps/bot/src/images/simpcard.png")
  ];

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error("simpcard template not found at src/images/simpcard.png");
  }
  return found;
}

function getUk07TemplatePath() {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "src/images/uk07.png"),
    resolve(cwd, "apps/bot/src/images/uk07.png")
  ];

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error("uk07 template not found at src/images/uk07.png");
  }
  return found;
}

function wrapText(input: string, maxCharsPerLine: number, maxLines: number) {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["No text provided."];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (
    words.join(" ").length >
    lines.join(" ").length
  ) {
    const last = lines[Math.max(0, lines.length - 1)] ?? "";
    lines[Math.max(0, lines.length - 1)] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
  }

  return lines;
}

export async function buildSimpCardFromAvatar(
  avatarUrl: string,
  belongsTo: string,
  simpsFor: string
) {
  const template = readFileSync(getSimpTemplatePath());
  const avatarRaw = await fetchBuffer(avatarUrl);

  const avatar = await sharp(avatarRaw)
    .resize(418, 418, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg width="418" height="418" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="418" height="418" rx="36" ry="36" fill="white"/>
          </svg>`
        ),
        blend: "dest-in"
      }
    ])
    .png()
    .toBuffer();

  const name1 = escapeXml(clampLabel(belongsTo));
  const name2 = escapeXml(clampLabel(simpsFor));

  const textLayer = Buffer.from(
    `<svg width="1358" height="1000" xmlns="http://www.w3.org/2000/svg">
      <style>
        .n1 { fill: #000000; font: 700 58px "Arial"; }
        .n2 { fill: #000000; font: 700 62px "Arial"; }
      </style>
      <text class="n1" x="675" y="386">${name1}</text>
      <text class="n2" x="668" y="574">${name2}</text>
    </svg>`
  );

  return sharp(template)
    .composite([
      { input: avatar, left: 130, top: 272 },
      { input: textLayer, left: 0, top: 0 }
    ])
    .png()
    .toBuffer();
}

export async function buildUk07Card(text: string) {
  const template = readFileSync(getUk07TemplatePath());
  const clean = text.replace(/\s+/g, " ").trim() || "No text provided.";

  const long = clean.length > 42;
  const fontSize = long ? 48 : 64;
  const maxChars = long ? 40 : 28;
  const lines = wrapText(clean, maxChars, 2).map((line) => escapeXml(line));
  const line1 = lines[0] ?? "";
  const line2 = lines[1] ?? "";

  const textLayer = Buffer.from(
    `<svg width="1069" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="1069" height="100" fill="#0a0a0a"/>
      <style>
        .t { fill: #ffffff; font: 800 ${fontSize}px "Arial"; }
      </style>
      ${
        line2
          ? `<text class="t" x="18" y="44">${line1}</text><text class="t" x="18" y="92">${line2}</text>`
          : `<text class="t" x="18" y="72">${line1}</text>`
      }
    </svg>`
  );

  return sharp(template)
    .composite([{ input: textLayer, left: 19, top: 882 }])
    .png()
    .toBuffer();
}
