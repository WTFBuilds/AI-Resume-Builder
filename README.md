# AIResume

**Build a resume that gets you hired.**

AIResume is a focused resume workspace with Overleaf's workflow — a dashboard of resume projects, a three-pane editor, and a live document preview — except the middle pane is **structured forms, not code**. One renderer powers both the live preview and the PDF export, so what you see is *exactly* what downloads: a pixel-perfect, selectable-text, ATS-parsable PDF.

Part of the **wtfbuilds** product family. The full product & engineering plan lives in [plan.md](plan.md).

---

## Table of Contents

1. [Feature status](#feature-status)
2. [Requirements](#requirements)
3. [Quick setup (TL;DR)](#quick-setup-tldr)
4. [Step 1 — Get the code](#step-1--get-the-code)
5. [Step 2 — Install Node.js and pnpm](#step-2--install-nodejs-and-pnpm)
6. [Step 3 — Install project dependencies](#step-3--install-project-dependencies)
7. [Step 4 — Run the setup script & configure environment](#step-4--run-the-setup-script--configure-environment)
8. [Step 5 — Start PostgreSQL](#step-5--start-postgresql)
9. [Step 6 — Start Redis](#step-6--start-redis)
10. [Step 7 — Create the database schema & seed templates](#step-7--create-the-database-schema--seed-templates)
11. [Step 8 — Start the dev servers](#step-8--start-the-dev-servers)
12. [Step 9 — First-run walkthrough](#step-9--first-run-walkthrough)
13. [Optional — OAuth sign-in (Google / GitHub)](#optional--oauth-sign-in-google--github)
14. [Optional — Email verification flow](#optional--email-verification-flow)
15. [Scripts reference](#scripts-reference)
16. [Troubleshooting](#troubleshooting)
17. [Stopping everything](#stopping-everything)
18. [Project layout](#project-layout)
19. [How the render pipeline works](#how-the-render-pipeline-works)
20. [Deploying to AWS](#deploying-to-aws)

---

## Feature status

**Phase 1 MVP core — built and verified locally:**

- ✅ Email + password auth ([better-auth](https://better-auth.com)), sessions, account settings
- ✅ Dashboard: resume list, template picker with live previews, archive/trash, search
- ✅ Editor: section navigator, structured forms, drag-to-reorder, autosave with conflict protection, undo/redo, mobile layout
- ✅ Live preview: real template output, updates as you type (no "Recompile" button needed)
- ✅ PDF export: queue → worker → headless Chromium → downloadable, ATS-ready PDF
- ✅ 4 launch templates: **Classic**, **Modern**, **Compact Two-Column**, **Minimal ATS**
- ✅ Marketing site
- 🔜 Phase 2: version history UI, share links, Stripe billing, teams
- 🔜 Phase 3: AI writer, ATS analysis, job-description tailoring

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | **22+** (24 recommended) | `node -v` to check |
| pnpm | **12+** | installed via corepack (§Step 2) |
| PostgreSQL | **16** | local install **or** Docker (§Step 5) |
| Redis | **7+** | local install **or** Docker (§Step 6) |
| Chromium | auto | downloaded by Puppeteer on `pnpm install` |

> **Windows users:** use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) (Ubuntu) and follow the Linux commands. Native Windows works but is untested.

---

## Quick setup (TL;DR)

```bash
git clone <repo-url> && cd AI-Resume-Builder
corepack enable pnpm
pnpm install
pnpm setup                      # creates .env + env symlinks
docker compose up -d            # Postgres + Redis (or see §5–6 for native)
# using docker compose? set in .env:
#   DATABASE_URL=postgres://airesume:airesume@localhost:5432/airesume_dev
pnpm db:push && pnpm db:seed
pnpm dev                        # → http://localhost:3000
```

Detailed steps below.

---

## Step 1 — Get the code

```bash
git clone <repo-url> AI-Resume-Builder
cd AI-Resume-Builder
```

## Step 2 — Install Node.js and pnpm

**Check Node (22+):**

```bash
node -v
```

If missing, install [Node.js LTS](https://nodejs.org) (macOS: `brew install node@22`, or use [nvm](https://github.com/nvm-sh/nvm)).

**Enable pnpm** (bundled with Node via corepack):

```bash
corepack enable pnpm
corepack prepare pnpm@latest --activate
pnpm -v        # should print 12.x
```

> If `corepack enable` fails with a permissions error (root-owned Node install), install the shim into a user-writable dir already on your PATH:
> ```bash
> COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable --install-directory ~/.local/bin pnpm
> ```

## Step 3 — Install project dependencies

```bash
pnpm install
```

This downloads ~500 packages **plus Chromium** for the PDF worker (~150 MB, cached in `~/.cache/puppeteer`).

> **pnpm 12 blocks install scripts by default.** This repo whitelists the needed packages (`puppeteer`, `esbuild`, …) under `allowBuilds` in `pnpm-workspace.yaml`. If you ever see `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds` and select the listed packages, then `pnpm rebuild puppeteer`.

## Step 4 — Run the setup script & configure environment

```bash
pnpm setup
```

This creates `.env` from `.env.example` (with a generated `BETTER_AUTH_SECRET`) and links it into `apps/web/.env` and `apps/worker/.env` (Next.js and the worker read env files from their own working directories).

Open `.env` and review the values:

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | `postgres://localhost:5432/airesume_dev` | Postgres connection string. **Change to `postgres://airesume:airesume@localhost:5432/airesume_dev` if using docker compose** (§Step 5, option A). |
| `REDIS_URL` | `redis://localhost:6379` | Redis for the PDF export queue + rate limiting |
| `BETTER_AUTH_SECRET` | *(generated)* | Session signing secret — never commit the real value |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Base URL better-auth uses for callbacks |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | App base URL (SEO metadata, auth client) |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | `true` = block sign-in until email verified. Dev default `false` auto-verifies. |
| `STORAGE_DRIVER` | `local` | `local` (dev, writes to `.data/exports/` at the repo root) or `s3` (prod) |
| `LOCAL_EXPORTS_DIR` | `./.data` | Local PDF storage root — relative paths anchor to the repo root so web + worker agree |
| `S3_EXPORTS_BUCKET` / `S3_REGION` | — | Only used when `STORAGE_DRIVER=s3` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Optional Google OAuth (§Optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | Optional GitHub OAuth |
| `NEXT_PUBLIC_GOOGLE_OAUTH` / `NEXT_PUBLIC_GITHUB_OAUTH` | `false` | Show the OAuth buttons on auth pages |
| `WORKER_CONCURRENCY` | `2` | Parallel PDF render jobs per worker |

## Step 5 — Start PostgreSQL

Pick **one** option.

### Option A — Docker (easiest, any OS)

```bash
docker compose up -d
```

This starts Postgres 16 (`airesume`/`airesume`, db `airesume_dev`) on port 5432. **Then set in `.env`:**

```env
DATABASE_URL=postgres://airesume:airesume@localhost:5432/airesume_dev
```

### Option B — macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

The brew formula is keg-only — add it to your PATH:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Create the database:

```bash
createdb airesume_dev
```

The default `.env` value (`postgres://localhost:5432/airesume_dev`) works — Homebrew Postgres trusts local socket connections for your user.

### Option C — Linux (apt)

```bash
sudo apt update && sudo apt install -y postgresql-16
sudo systemctl enable --now postgresql
sudo -u postgres createuser --superuser "$USER"
createdb airesume_dev
```

**Verify:** `psql -d airesume_dev -c "select 1;"` prints one row.

## Step 6 — Start Redis

Pick **one** option.

### Option A — Docker

```bash
docker compose up -d        # if you already ran it in Step 5, Redis is up too
```

### Option B — macOS (Homebrew)

```bash
brew install redis
brew services start redis
```

### Option C — Standalone (no service manager)

```bash
mkdir -p /tmp/airesume-redis
redis-server --daemonize yes --port 6379 --dir /tmp/airesume-redis
```

**Verify:** `redis-cli ping` → `PONG`.

## Step 7 — Create the database schema & seed templates

From the repo root:

```bash
pnpm db:push       # applies the Drizzle schema (auth + app tables)
pnpm db:seed       # upserts the 4 launch templates into the templates table
```

You should see `Seeded 4 templates: classic, modern, compact-two-column, minimal-ats`.

> `db:push` is for local dev. For staging/prod, generate SQL migrations with `pnpm db:generate` and apply them with `pnpm db:migrate` (CI runs the migrate job before deploy — see plan.md §17).

## Step 8 — Start the dev servers

```bash
pnpm dev
```

This runs **both** processes in parallel with Turborepo:

| Process | URL / output | Role |
|---|---|---|
| `@airesume/web` | **http://localhost:3000** | Next.js app — marketing site, auth, dashboard, editor, API routes |
| `@airesume/worker` | console logs | BullMQ consumer — renders PDFs with headless Chromium, purges old trash daily at 03:00 |

Run them separately if you prefer separate terminals:

```bash
pnpm dev:web        # terminal 1
pnpm dev:worker     # terminal 2
```

Wait for `✓ Ready in …ms` from the web process, then open **http://localhost:3000**.

> The **worker is required for PDF export**. Without Redis + worker, downloads show *"PDF service is not running"* — everything else works without it.

## Step 9 — First-run walkthrough

1. Open **http://localhost:3000** → click **Get started** → create an account (email + password, 8+ chars).
2. You land on the **dashboard** → click **New resume**.
3. Pick a template (cards show live previews with sample content), give it a title, **Create resume**.
4. In the editor:
   - Blank page? Click **Load sample** to fill everything with the demo persona.
   - Type in any field — the **live preview on the right updates instantly**.
   - Drag the ⠿ handles to reorder sections and entries; use the eye icon to hide a section.
   - Autosave runs ~1.5 s after you stop typing (`Saving…` → `Saved HH:MM`).
5. Click **Download PDF** → wait ~2–4 s → the PDF downloads. Open it: selectable text, correct fonts, matching the preview exactly.

**Keyboard shortcuts:** `⌘S` save now · `⌘Z` / `⌘⇧Z` undo/redo · `Esc` close dialogs.

---

## Optional — OAuth sign-in (Google / GitHub)

1. **Google:** create an OAuth client at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) → *Authorized redirect URI*: `http://localhost:3000/api/auth/callback/google`.
2. **GitHub:** create an OAuth app at [github.com/settings/developers](https://github.com/settings/developers) → *Authorization callback URL*: `http://localhost:3000/api/auth/callback/github`.
3. Put the IDs/secrets in `.env` and flip the flags:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_OAUTH=true
```

4. Restart `pnpm dev` — the buttons appear on `/sign-in` and `/sign-up`.

## Optional — Email verification flow

By default (`REQUIRE_EMAIL_VERIFICATION=false`) accounts are usable immediately. Emails are **not sent anywhere in dev — links print to the web server console** (look for the `📧 airesume dev email` box in the `pnpm dev` output).

- **Resend a verification link manually:**

  ```bash
  curl -s -X POST http://localhost:3000/api/auth/send-verification-email \
    -H "Content-Type: application/json" \
    -d '{"email":"you@example.com","callbackURL":"/dashboard"}'
  ```

  Copy the `http://localhost:3000/api/auth/verify-email?token=…` link from the console and open it in your browser.

- **Enforce verification** (recommended for staging/prod): set `REQUIRE_EMAIL_VERIFICATION=true` in `.env` and restart. Sign-up then shows "Check your inbox" and blocks sign-in until verified. Production sends via SES (wired in Phase 2 — see plan.md §17).

---

## Scripts reference

All commands run from the repo root.

| Command | What it does |
|---|---|
| `pnpm setup` | One-time local setup: `.env` + env symlinks |
| `pnpm dev` | Run web + worker together (dev) |
| `pnpm dev:web` | Run only the Next.js app |
| `pnpm dev:worker` | Run only the PDF export worker |
| `pnpm build` | Production build (all packages) |
| `pnpm typecheck` | TypeScript check across all 7 packages |
| `pnpm db:push` | Push the Drizzle schema straight to the DB (dev) |
| `pnpm db:generate` | Generate SQL migration files from schema changes |
| `pnpm db:migrate` | Apply generated migrations |
| `pnpm db:seed` | Upsert the 4 templates |
| `pnpm db:studio` | Open Drizzle Studio (DB browser) |


## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `ERR_PNPM_IGNORED_BUILDS` during `pnpm install` | pnpm 12 blocked lifecycle scripts → `pnpm approve-builds` (select all listed), then `pnpm rebuild puppeteer esbuild` |
| `DATABASE_URL is not set` | `.env` missing or app symlinks missing → run `pnpm setup` from the repo root |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres not running → check §Step 5; verify with `psql -d airesume_dev -c "select 1"` |
| `Could not connect…` from `redis-cli` | Redis not running → check §Step 6; verify with `redis-cli ping` |
| Homebrew Redis fails with `redisbloom.so failed to load` | A local config demands a module that isn't installed → run the standalone command from §Step 6 Option C |
| "PDF service is not running" toast on Download | Redis and/or the worker aren't running → start them, confirm `[airesume-worker] ready` in the worker output |
| Download button spins forever | Look for `[export <id>] failed:` in the worker log; most common cause: Chromium missing → `pnpm rebuild puppeteer` |
| Port 3000 already in use | `kill $(lsof -t -iTCP:3000 -sTCP:LISTEN)` or run `PORT=3001 pnpm dev:web` (if you change the port, also update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` in `.env` for auth/OAuth to work) |
| `psql: command not found` after brew install | keg-only formula → add `/opt/homebrew/opt/postgresql@16/bin` to PATH (§Step 5 Option B) |
| Next.js says it "reconfigured your tsconfig.json" | Expected — Next sets `jsx: preserve` itself; harmless |
| Warning about unreadable `~/.npmrc` | A root-owned leftover file on your machine; harmless — pnpm continues without it |
| Sign-up says "User already exists" | That email is registered → sign in instead, or use another email |

## Stopping everything

```bash
# Ctrl+C the pnpm dev terminals

# Docker:
docker compose down            # add -v to also wipe data volumes

# Homebrew services:
brew services stop postgresql@16
brew services stop redis
```

Dev PDFs live in `.data/exports/` (gitignored) — delete the folder to reset exports.

---

## Project layout

```
apps/
  web/            Next.js 15 — marketing, auth, dashboard, editor, API routes
  worker/         BullMQ worker — PDF rendering (Puppeteer), trash purge
packages/
  db/             Drizzle schema + queries + seed (better-auth tables live here too)
  auth/           better-auth server + client config
  templates/      zod resume schema + 4 templates + the single-source HTML renderer
  ui/             Design tokens + primitives (Tailwind v4, shadcn-style)
  storage/        Local / S3 drivers for exported PDFs
  config/         Shared tsconfig presets
infra/terraform/  AWS foundation (VPC, ECS Fargate, RDS, ElastiCache, S3, ALB)
docker/           Dockerfiles for web (standalone) and worker (Chromium)
.github/workflows/  CI (typecheck + build) and staging deploy skeleton
```

## How the render pipeline works

`packages/templates` turns a resume **document** (JSON, zod-validated at every write) into one complete HTML page. That exact string is:

1. displayed **live** in the editor's preview iframe (client-side, instant, no server round-trip), and
2. printed to **PDF** by the worker through headless Chromium (`preferCSSPageSize`, print backgrounds, embedded fonts).

One renderer → the preview and the export **cannot diverge**. Templates are pure React components (no hooks, no browser APIs), so they render identically in the browser and on the worker.

## Deploying to AWS

The Terraform foundation in `infra/terraform/` provisions VPC → RDS 16 → ElastiCache → S3 → ECR → ECS Fargate (web + worker) → ALB. See plan.md §6 and §17 for the architecture and the GitHub Actions deploy flow (`.github/workflows/deploy-staging.yml` — enable by setting the AWS secrets/vars it lists). Local Dockerfiles live in `docker/`.
