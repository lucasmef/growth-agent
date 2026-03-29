import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/growth_agent?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
