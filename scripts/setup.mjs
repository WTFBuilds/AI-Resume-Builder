#!/usr/bin/env node
/**
 * One-time local setup for AIResume:
 *   1. creates .env from .env.example (with a generated auth secret)
 *   2. symlinks apps/web/.env and apps/worker/.env → repo-root .env
 *      (Next.js and the worker each read env files from their own cwd)
 *   3. prints the remaining manual steps (Postgres, Redis, schema)
 *
 * Run from the repo root:   pnpm setup
 */
import { existsSync, symlinkSync, unlinkSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const root = process.cwd();

if (!existsSync(path.join(root, "pnpm-workspace.yaml"))) {
  console.error("✗ Run this script from the repository root (pnpm-workspace.yaml not found).");
  process.exit(1);
}

console.log("AIResume local setup\n────────────────────");

/* 1 ─ .env */
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  console.log("✓ .env already exists — left untouched");
} else {
  if (!existsSync(path.join(root, ".env.example"))) {
    console.error("✗ .env.example missing — cannot create .env");
    process.exit(1);
  }
  let content = readFileSync(path.join(root, ".env.example"), "utf8");
  const secret = randomBytes(32).toString("base64");
  content = content.replace(/BETTER_AUTH_SECRET=.*/, `BETTER_AUTH_SECRET=${secret}`);
  writeFileSync(envPath, content);
  console.log("✓ created .env from .env.example (generated BETTER_AUTH_SECRET)");
}

/* 2 ─ env symlinks for apps (Next + worker read env from their own cwd) */
for (const app of ["web", "worker"]) {
  const link = path.join(root, "apps", app, ".env");
  if (existsSync(link)) {
    console.log(`✓ apps/${app}/.env already exists`);
    continue;
  }
  try {
    symlinkSync(path.join("..", "..", ".env"), link);
    console.log(`✓ linked apps/${app}/.env → .env`);
  } catch (err) {
    // filesystems without symlink support (Windows FAT) — fall back to a copy
    copyFileSync(envPath, link);
    console.log(`✓ copied .env → apps/${app}/.env (symlinks unsupported here)`);
  }
}

/* 3 ─ next steps */
console.log(`
Next steps:

  1. Make sure PostgreSQL and Redis are running (see README §5–6):
       docker compose up -d            # easiest — or native installs

  2. If you use docker compose, set in .env:
       DATABASE_URL=postgres://airesume:airesume@localhost:5432/airesume_dev

  3. Apply the schema and seed the templates:
       pnpm db:push
       pnpm db:seed

  4. Start the app:
       pnpm dev                        # web on http://localhost:3000 + worker

Full guide: README.md
`);
