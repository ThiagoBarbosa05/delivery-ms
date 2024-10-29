import { defineConfig } from "drizzle-kit";
import { env } from "../env";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./.migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  dialect: "postgresql",
});
