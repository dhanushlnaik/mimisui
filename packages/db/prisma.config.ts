import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: "../../.env" });
loadEnv({ path: "../../apps/web/.env" });
loadEnv({ path: "../../apps/bot/.env" });

const prismaDatasourceUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!prismaDatasourceUrl) {
  throw new Error(
    "Set DIRECT_DATABASE_URL (preferred for Prisma) or DATABASE_URL in apps/web/.env or apps/bot/.env."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: prismaDatasourceUrl
  }
});
