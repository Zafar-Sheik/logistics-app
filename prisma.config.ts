import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Falls back to a placeholder so `prisma generate` works at build time
    // even when the database URL is only available at runtime.
    url: process.env.DATABASE_URL ?? "mysql://user:pass@localhost:4000/logistics",
  },
});
