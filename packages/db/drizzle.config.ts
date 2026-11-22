import { config } from "dotenv";
// db scripts may run from this package's cwd — always load the repo-root .env
config({ path: new URL("../../.env", import.meta.url) });
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set (copy .env.example → .env)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
