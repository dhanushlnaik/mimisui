import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg as unknown as {
  PrismaClient: new (args?: unknown) => any;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: any;
};

function readDatabaseUrlFromEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.startsWith("DATABASE_URL=")) continue;
    return trimmed.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
  }

  return undefined;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, ".env"),
    resolve(cwd, "apps/bot/.env"),
    resolve(cwd, "apps/web/.env"),
    resolve(cwd, "../bot/.env"),
    resolve(cwd, "../web/.env"),
    resolve(cwd, "../../apps/bot/.env"),
    resolve(cwd, "../../apps/web/.env")
  ];

  for (const envPath of candidates) {
    const value = readDatabaseUrlFromEnvFile(envPath);
    if (value) {
      process.env.DATABASE_URL = value;
      return value;
    }
  }

  return undefined;
}

const connectionString = resolveDatabaseUrl();

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma client.");
}

const adapter = new PrismaPg({ connectionString });
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export const Prisma = (prismaPkg as any).Prisma;
