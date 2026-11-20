import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ quiet: true, path: [".env.local", ".env"] });

const schemaConfig = {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
};
const generating = process.argv[2] === "generate";

if (generating) {
  // Prisma 6 checks URL syntax when generating the client without opening a connection.
  process.env.DATABASE_URL ||= "postgresql://localhost/unused";
  process.env.DIRECT_URL ||= "postgresql://localhost/unused";
}

export default defineConfig(generating ? {
  ...schemaConfig,
  experimental: { adapter: true },
  engine: "js",
  adapter: async () => new PrismaPg({ connectionString: process.env.DIRECT_URL }),
} : schemaConfig);
