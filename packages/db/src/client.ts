import { config } from "dotenv";
// Scripts and workers load this module directly — make sure the repo-root
// .env is present regardless of process.cwd() (Next.js loads it itself).
// webpackIgnore keeps webpack from trying to bundle the .env file — CI has
// none (gitignored) and receives env vars through the environment instead.
config({ path: new URL(/* webpackIgnore: true */ "../../../.env", import.meta.url) });
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (copy .env.example → .env)");
}

const pool = new Pool({ connectionString, max: 10 });

export const db = drizzle(pool, { schema });
export { schema };
export type Db = typeof db;
