# SHIFTPLAN — Deployment for the starting phase

**Decision:** skip bespoke AWS infrastructure for now. Ship on services that
already exist or are free, and keep `infra/terraform/` (the full AWS stack)
for when scale demands it.

> Supersedes docs/DEPLOY.md as the active plan; DEPLOY.md remains the future
> "scale up to managed AWS" path. Status: **v1 — 2026-11-23**.

---

## 1. Target architecture

```
                        ┌──────────────────────────┐
   users ──▶ Vercel ────▶  web (Next.js, serverless) │──┐
             (app + API + marketing)                   │  │ enqueues jobs
                                                       │  │ + proxies PDFs
                                                       ▼  ▼
                              ┌─────────────────────────────────────┐
                              │  EC2 instance (AIResume)            │
                              │                                     │
                              │  PostgreSQL 16  ◀──── app data      │
                              │  Redis 7       ◀──── BullMQ + cache │
                              │  worker (AIResume) ◀─ PDF rendering │
                              │       └─ download server :3001      │
                              │           (serves PDFs, HMAC-gated) │
                              └─────────────────────────────────────┘
```

| Piece | Runs on | Why |
|---|---|---|
| **web** (Next.js: marketing + app + API routes) | **Vercel** | Native Next.js hosting, zero-ops, free tier, preview deploys per PR |
| **worker** (BullMQ consumer + Puppeteer + download server) | **EC2** (systemd service) | Long-running Chromium can't live on serverless |
| **PostgreSQL** | **EC2** | Already there; one more database costs nothing |
| **Redis** | **EC2** | Already there; queue + better-auth cookie cache + rate limits |
| **PDF storage** | **EC2 local disk** — no third party | Worker saves to local disk and serves downloads itself through a signed URL; the web app proxies. Cloudinary/S3 drivers remain in the codebase for scale-up |
| Email | dev: console · prod: Resend (free 3k/mo) — SES deferred with the rest of AWS | — |

**Cost:** Vercel Hobby $0 · EC2 already paid · Cloudinary free tier $0.
Effective new spend: **₹0 / $0**.

---

## 2. Code changes this plan requires (done)

1. `packages/storage` gained a **CloudinaryDriver** — `STORAGE_DRIVER=cloudinary`
   with `CLOUDINARY_*` env vars. PDFs upload as `resource_type: raw`,
   `type: authenticated` (private); downloads go through **signed URLs with
   10-minute expiry**, same semantics as the S3 driver. `local` and `s3`
   drivers stay available.
2. `next.config.ts` — `output: "standalone"` only when building outside
   Vercel (`VERCEL` env), so the same repo builds on both.
3. `deploy/ec2/` — systemd unit + setup script for the worker.

---

## 3. Runbook

### 3a. Vercel (web) — ~10 minutes, dashboard only

1. Push the repo to GitHub (already: `WTFBuilds/AI-Resume-Builder`).
2. vercel.com → **Add New Project** → import the repo.
3. **Root Directory: `apps/web`** (framework preset auto-detects Next.js).
4. Environment variables (Production + Preview):
   ```
   DATABASE_URL            = postgres://airesume:<PASS>@<EC2_IP>:5432/airesume?sslmode=require&uselibpqcompat=true
   REDIS_URL               = redis://:<PASS>@<EC2_IP>:6379
   BETTER_AUTH_SECRET      = <32-byte random, generate: openssl rand -base64 32>
   BETTER_AUTH_URL         = https://<your-app>.vercel.app
   NEXT_PUBLIC_APP_URL     = https://<your-app>.vercel.app
   REQUIRE_EMAIL_VERIFICATION = false
   STORAGE_DRIVER          = local
   INTERNAL_TOKEN          = <48-char random — SAME value on the worker>
   WORKER_DOWNLOAD_URL     = http://<EC2_ELASTIC_IP>:3001
   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET      (when ready)
   NEXT_PUBLIC_GOOGLE_OAUTH = true               (when ready)
   ```
5. Deploy. `*.vercel.app` HTTPS is automatic.
6. After the first deploy: **Settings → Domains** → add your custom domain
   whenever you buy one; update `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL` then.

### 3b. EC2 (Postgres remote access) — ~15 min, SSH

Make the existing Postgres accept Vercel connections **safely**:

```bash
# /etc/postgresql/16/main/postgresql.conf
listen_addresses = '*'

# /etc/postgresql/16/main/pg_hba.conf  (TLS + SCRAM only)
hostssl  airesume  all  0.0.0.0/0  scram-sha-256
```

```bash
sudo -u postgres psql -c "ALTER USER airesume PASSWORD '<50-char-random>';"
sudo systemctl restart postgresql
```

EC2 security group: open TCP 5432 **to 0.0.0.0/0** (serverless can't have
static IPs) — mitigations: SCRAM + TLS enforced, 50-char password, non-root
role for the app. **Do not** reuse your superuser for the app.

Verify from your laptop: `psql "<DATABASE_URL>" -c "select 1"`.

### 3c. EC2 (Redis remote access) — ~10 min, SSH

```conf
# /etc/redis/redis.conf
bind 0.0.0.0
requirepass <64-char-random>
port 6379          # or a non-standard port; update REDIS_URL to match
```

```bash
sudo systemctl restart redis
```

Security group: open the Redis port. Note: plain-Redis AUTH is weaker than
Postgres+TLS — if you want to harden later, wrap it with stunnel (TLS) or
switch to managed Upstash (free tier) without code changes (`REDIS_URL` swap).

### 3d. EC2 (worker) — one-time, script provided

```bash
ssh your-ec2
git clone https://github.com/WTFBuilds/AI-Resume-Builder.git /opt/airesume
cd /opt/airesume
sudo bash deploy/ec2/setup.sh        # node 22, pnpm, chromium deps, .env template
cp deploy/ec2/airesume-worker.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now airesume-worker
journalctl -u airesume-worker -f     # watch for "ready — queues: exports, maintenance"
```

The worker env file (`/opt/airesume/.env`) points at the same Postgres/Redis
and the same Cloudinary creds as Vercel.

**Isolation from your other project:** the worker runs as its own systemd
unit, its own working dir, its own DB/database-name — it shares only the
machine. Chromium memory spikes are capped by the unit's `MemoryMax=1.5G`.

### 3e. Cloudinary — ~5 min, dashboard

1. cloudinary.com → free account → Dashboard → copy **Cloud name / API key / API secret**.
2. Put them in Vercel env vars and `/opt/airesume/.env`.
3. Verify: export a resume in the app → download works (signed URL, 10-min expiry).

### 3f. Google OAuth — console steps (docs/DEPLOY.md § bottom)

Add a **second redirect URI** for the deployed origin:
`https://<your-app>.vercel.app/api/auth/callback/google` alongside the
localhost one — same OAuth client serves both.

### 3g. Email in production — Resend (~15 min)

resend.com → API key → `RESEND_API_KEY` + `EMAIL_FROM` env vars → the email
helper in `packages/auth/src/server.ts` gains a Resend branch (assistant
wires it when you have the key). Until then, verification links print to the
worker console (`journalctl -u airesume-worker`), and verification stays off.

---

## 4. Security checklist (the honest bits)

- [ ] Postgres: SCRAM + `hostssl` only + 50-char password + dedicated app role
- [ ] Redis: `requirepass` 64-char + consider stunnel/Upstash for TLS later
- [ ] EC2 security group: only 80/443 (your other project), 5432, 6379 open
- [ ] Cloudinary: `authenticated` type + signed URLs (10-min) — never public
- [ ] BETTER_AUTH_SECRET unique per environment; never committed
- [ ] Vercel env vars marked **Sensitive**
- [ ] Worker runs as non-root user (setup script creates `airesume` user)
- [ ] Database backups: `pg_dump` cron on EC2 → S3 (add when real users arrive)
- [ ] Watch Cloudinary bandwidth (free tier 25 credits ≈ 25 GB/mo) — fine for years of resume PDFs

## 5. Known trade-offs of the shift plan

| Trade-off | Mitigation |
|---|---|
| Postgres/Redis exposed publicly (auth-protected) | TLS+SCRAM on PG; strong AUTH on Redis; Upstash swap is a one-line env change |
| Single EC2 = worker + PG + Redis single point of failure | Acceptable pre-launch; AWS path (docs/DEPLOY.md) is the managed upgrade |
| Vercel serverless cold starts on API routes | Negligible for this traffic; BullMQ enqueue-only works on serverless |
| Puppeteer memory on a shared box | `MemoryMax` in the systemd unit + `WORKER_CONCURRENCY=1` |

## 6. Rollback story

- Vercel: instant rollback to any previous deployment (dashboard, 1 click)
- Worker: `git -C /opt/airesume checkout <tag> && sudo systemctl restart airesume-worker`
- DB: `pg_dump` restores; Terraform untouched (not deployed)
