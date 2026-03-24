import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function parseEnvFile(filePath: string) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, "utf8");
  const out: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    out[key] = value;
  }

  return out;
}

const cwd = process.cwd();
const loadedEnv = {
  ...parseEnvFile(resolve(cwd, ".env")),
  ...parseEnvFile(resolve(cwd, "apps/bot/.env")),
  ...parseEnvFile(resolve(cwd, "../bot/.env"))
};

const runtimeEnv = {
  ...loadedEnv,
  ...process.env
};

export const env = createEnv({
  server: {
    DISCORD_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().url(),
    CLIENT_ID: z.string().min(1),
    GUILD_ID: z.string().min(1)
  },
  runtimeEnv,
  emptyStringAsUndefined: true
});
