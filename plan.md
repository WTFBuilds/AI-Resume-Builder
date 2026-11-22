# AIResume — Product & Engineering Plan

**Product name:** **AIResume** · **SEO display name:** *AI Resume Builder* · **Part of** `wtfbuilds` · **Working repo** `AI-Resume-Builder` · **Status** v0.1 (pre-implementation)

> **One-liner:** Overleaf's workflow for resumes — a dashboard of "resume projects", a three-pane editor, and live PDF preview — except the middle pane is **structured forms, not LaTeX code**. Built with better-auth, deployed on AWS, engineered for heavy daily users. AI features ship in a later phase behind a clean extension point.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Design Principles](#2-design-principles)
3. [Product Surfaces](#3-product-surfaces)
4. [Overleaf Parity Map](#4-overleaf-parity-map)
5. [Tech Stack](#5-tech-stack)
6. [System Architecture (AWS)](#6-system-architecture-aws)
7. [Data Model](#7-data-model)
8. [Auth Design (better-auth)](#8-auth-design-better-auth)
9. [Editor Specification](#9-editor-specification)
10. [Resume Data Schema](#10-resume-data-schema)
11. [Render Pipeline (Preview + PDF)](#11-render-pipeline-preview--pdf)
12. [API Surface](#12-api-surface)
13. [Scaling for Heavy Users](#13-scaling-for-heavy-users)
14. [Security & Privacy](#14-security--privacy)
15. [Design System & Brand](#15-design-system--brand)
16. [Repository Layout](#16-repository-layout)
17. [Environments & CI/CD](#17-environments--cicd)
18. [Phased Roadmap](#18-phased-roadmap)
19. [AI Architecture (Phase 3, designed now)](#19-ai-architecture-phase-3-designed-now)
20. [Milestones](#20-milestones)
21. [Risks](#21-risks)
22. [Open Questions](#22-open-questions)

---

## 1. Product Vision

A resume builder that behaves like a **professional document workspace**, not a wizard.

- **Dashboard** = project list (like Overleaf's `/project`): every resume is a project with title, owner, last-modified, tags, archive, trash.
- **Editor** = Overleaf's three-pane layout: left panel for navigation, middle panel for editing, right panel for the rendered document. The difference: the middle pane is a **form-based section editor** (Personal Info → Summary → Education → Experience → Projects → Skills → Custom), not code.
- **Preview** = the real document, always visible, updates as you type. Download gives a pixel-identical, ATS-parsable PDF.
- **Brand:** part of the `wtfbuilds` family. Quiet, professional, credible UI — deliberately *not* the "AI startup" look (no purple-blue gradients, no glassmorphism, no glowing blobs).

Positioning promise carried from the README: **ATS-friendly by construction** — selectable-text PDFs, standard section headings, no critical content inside images, parseable structure.

## 2. Design Principles

| # | Principle | Consequence |
|---|-----------|-------------|
| 1 | **Overleaf's workflow, not its LaTeX** | Project dashboard + 3-pane editor + version history. Forms replace code. |
| 2 | **One source of truth** | Resume = JSON document. Preview and PDF export render from the *same* template components — they can never diverge. |
| 3 | **Structure over freeform text** | Fields and repeatable entries (jobs, degrees, bullets) instead of one big text box. Enables reordering, templates, and AI later. |
| 4 | **Heavy-user architecture from day 1** | Autosave with optimistic concurrency, version snapshots, queue-based PDF rendering, autoscaling, caching, quotas. |
| 5 | **AI later, cleanly** | AI is a queued job + a panel, never baked into the editor core. Schema and job infra exist in Phase 1. |
| 6 | **Quiet, professional brand** | Neutral palette, one restrained accent, solid colors, real screenshots in marketing. Responsive down to small phones. |

## 3. Product Surfaces

| Surface | Route | Phase | Notes |
|---|---|---|---|
| Marketing site | `/` , `/features`, `/templates`, `/pricing` (stub), `/about` | P1 | AIResume-branded (wtfbuilds family), conversion-focused, real product screenshots |
| Auth | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | P1 | better-auth; email+password + Google/GitHub OAuth |
| Dashboard | `/dashboard`, `/dashboard/archive`, `/dashboard/trash` | P1 | Overleaf `/project` parity: search, tags, table→cards, "New resume" |
| Template picker | modal `/dashboard/new` | P1 | 4 launch templates with previews |
| Editor | `/resume/[id]` | P1 | The core 3-pane experience |
| Templates gallery (public) | `/templates` | P1 | Marketing + picker source |
| Account settings | `/settings` | P1 | Profile, password, sessions, delete account |
| Version history | `/resume/[id]/history` (editor overlay) | P2 | Restore/compare snapshots |
| Share (view-only link) | `/share/[token]` | P2 | Public read-only rendered resume |
| Billing | `/pricing` live, Stripe checkout, portal | P2 | Free vs Pro plans |
| AI panel | editor right rail | P3 | Writer, ATS check, job tailoring |

## 4. Overleaf Parity Map

| Overleaf | Ours | Notes |
|---|---|---|
| Project dashboard (`/project`) | `/dashboard` | Table on desktop → cards on mobile; Title / Owner / Last modified; search; tags sidebar |
| File tree + outline (left) | **Section navigator** | Sections of the resume + drag-reorder + jump-to-section; replaces files+outline with one concept |
| Source editor (middle) | **Form editor** | Structured fields per section; repeatable entries; drag-reorder items; bullet lists |
| PDF preview (right) | **Live preview** | Same HTML the PDF export renders; instant client-side re-render (no "Recompile") |
| Recompile button | Not needed | Preview re-renders on keystroke (debounced) |
| History | **Version snapshots** | Autosaved timeline, restore any snapshot (P2 UI, P1 data) |
| Download PDF | **Download PDF** | Server-rendered via headless Chromium, cached in S3 |
| Share | Share | P2: view-only link; later: collaboration |
| Tags | Tags | Same sidebar concept |
| Archive / Trash | Archive / Trash | Same |
| Templates gallery | Templates gallery | 4 launch templates, growing |
| Latex editor / Visual switch | N/A | Forms *are* the visual editor |
| Zip upload/download | JSON import/export | JSON-Resume-compatible import/export (P2) |

## 5. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One codebase for marketing site + app + API; RSC for fast dashboards |
| Styling / UI | **Tailwind CSS v4 + shadcn/ui** | Speed, consistency, accessible primitives |
| State (editor) | **Zustand** | Small, testable editor store with optimistic updates |
| Auth | **better-auth** (as requested) | TS-first, Drizzle adapter, built-in rate limiting & session management, plugins (2FA, organization) when needed |
| ORM / DB | **Drizzle ORM + PostgreSQL (RDS)** | better-auth's first-class adapter; typed schema; lightweight migrations |
| Cache / queues | **Redis (ElastiCache) + BullMQ** | PDF render jobs, rate limiting, autosave throttling, session cookie-cache |
| PDF engine | **Puppeteer (headless Chromium) on the worker** | Renders the *same HTML* as the live preview → guaranteed identical output; selectable text (ATS) |
| Storage | **S3 + CloudFront** | PDFs, template assets, template preview images; signed URLs |
| Email | **AWS SES** | Verification, password reset, (P2) product emails |
| Infra | **ECS Fargate + ALB** (web + worker services) | Long-running containers: WebSocket-ready for future collab, no Lambda DB-connection storms, Puppeteer-friendly |
| IaC | **Terraform** | Reviewable, reproducible AWS; modules per component |
| CI/CD | **GitHub Actions → ECR → ECS** | Lint/test/build → migrate → rolling deploy (CodeDeploy blue/green) |
| Monorepo | **pnpm workspaces + Turborepo** | Shared packages (db, auth, templates, ui) across web + worker |

**Rejected alternatives (kept short):** Vercel (user wants AWS-owned stack), `@react-pdf/renderer` (second template language, diverges from preview), AWS Amplify Hosting (less control over workers/queues), Lambda for PDF (Chromium cold starts + 15-min limit friction; worker on Fargate is simpler).

## 6. System Architecture (AWS)

```
                         ┌──────────────┐
  Route53 (DNS) ────────▶│  CloudFront  │──── WAF (managed rules)
                         └───┬──────┬───┘
        static assets (S3)   │      │  dynamic (/app, /api)
                     ┌───────▼─┐  ┌─▼─────────┐
                     │ S3 web  │  │    ALB    │
                     │ assets  │  └─────┬─────┘
                     └─────────┘        │
                    ┌───────────────────┼────────────────────┐
                    │  ECS Fargate cluster (private subnets, 2 AZs)
                    │            ┌──────▼──────┐
                    │            │  service:   │  Next.js standalone
                    │            │  web  (2–N) │  RSC + API routes
                    │            └──┬───┬───┬──┘
                    │     ┌─────────┘   │   └──────────┐
                    │ ┌───▼────┐  ┌─────▼─────┐  ┌────▼─────┐
                    │ │ Redis  │  │ RDS PG 16 │  │ Secrets  │
                    │ │(cache, │  │ (Drizzle, │  │ Manager  │
                    │ │ BullMQ)│  │ Multi-AZ) │  └──────────┘
                    │ └───▲────┘  └───────────┘
                    │     │ enqueue/consume
                    │ ┌───┴──────────┐
                    │ │ service:     │  Puppeteer + BullMQ worker
                    │ │ worker (1–N) │  PDF render, (P3) AI jobs
                    │ └───┬──────────┘
                    └─────┼──────────────────────────────
                    ┌─────▼───────────────┐   ┌──────────┐
                    │ S3: exports bucket  │   │ SES mail │
                    │ (PDFs, signed URLs) │   └──────────┘
                    └─────────────────────┘

  Observability: CloudWatch logs/alarms + OpenTelemetry → X-Ray, Sentry
```

**Request flows**

- **Editing:** browser keeps document state locally → debounced `PATCH /api/resumes/:id` → web service writes to RDS → 200 carries new `updated_at` token.
- **Preview:** fully client-side (template HTML re-renders in a sandboxed iframe). No server round-trip, no "recompile".
- **PDF export:** `POST /api/resumes/:id/export` → job into BullMQ → worker renders HTML → Chromium prints to PDF → uploads to S3 → returns job id → client polls/SSE → signed download URL.
- **Auth:** better-auth HTTP handlers mounted at `/api/auth/*`; session cookie (httpOnly, SameSite=Lax); cookie-cache enabled to cut DB hits.

**Why Fargate over Lambda/OpenNext:** we need a long-running Puppeteer worker regardless; one runtime and one deploy story for web + worker; stable DB connection pools; WebSocket-capable for Phase-2+ collaboration. Cost at small scale is comparable.

## 7. Data Model

better-auth owns the first four tables; app tables use Drizzle with FKs to `user.id`.

```
── better-auth core ─────────────────────────────────────────
user            id, name, email(uniq), email_verified, image, created_at, updated_at
session         id, user_id, token(uniq), expires_at, ip, user_agent, ...
account         id, user_id, provider, provider_account_id(uniq per provider), ...
verification    id, identifier, value, expires_at  (email tokens)

── app core ─────────────────────────────────────────────────
resume          id, user_id →user, title, template_id →template,
                data jsonb (resume schema §10), config jsonb (per-doc options),
                status enum(active, archived, trashed), trashed_at,
                updated_at, updated_by_client, created_at
                idx: (user_id, status, updated_at desc)

resume_version  id, resume_id →resume (cascade), snapshot jsonb, label,
                created_at, auto bool          -- rolling window per plan (50 free / 300 pro)

template        id, slug(uniq), name, category, description,
                preview_asset_key, is_premium bool, sort_order, active

tag             id, user_id, name, color        -- uniq (user_id, name)
resume_tag      resume_id, tag_id               -- PK both

export          id, resume_id, status enum(queued, rendering, done, failed),
                s3_key, mime, error, requested_at, completed_at
                -- retained latest 10 per resume (GC worker)

── phase 2+ (schema designed now, tables created when needed) ──
share_link      id, resume_id, token(uniq), expires_at, revoked, created_at
plan / billing  user_plan(user_id, plan, renews_at), stripe_customer_id on user
ai_job          id, user_id, resume_id, kind, input jsonb, output jsonb,
                status, tokens_in/out, cost_cents, created_at   -- §19
```

**Rules**

- `resume.data` is validated by zod at every write boundary; invalid writes are rejected (422), never partially stored.
- Deletes are soft (`status=trashed`) → trash purges after 30 days (worker).
- `resume_version` is written server-side every **20 changes or 5 minutes** (whichever first) and on manual "Save version". Pruned to plan window.
- All ownership checks in one server helper: `requireResume(userId, id)` — no query elsewhere bypasses it.

## 8. Auth Design (better-auth)

```ts
// packages/auth/src/server.ts (shape, not final)
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, requireEmailVerification: true },
  socialProviders: { google: {...}, github: {...} },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24,
             cookieCache: { enabled: true, maxAge: 5 * 60 } },   // cuts DB reads 90%+
  rateLimit: { enabled: true, window: 60, max: 100 },           // built-in; stricter on auth routes
  plugins: [ nextCookies() ],   // later: twoFactor(), organization() (P2 teams), magicLink()
});
```

- Mounted at `app/api/auth/[...all]/route.ts`; client via `createAuthClient<ReturnType<typeof auth>>()` in `packages/auth/client`.
- Server components / API routes call `auth.api.getSession({ headers })`; helper `requireUser()` returns user or redirects to `/sign-in`.
- Emails (verify, reset) via SES with branded templates.
- OAuth: Google + GitHub at launch (Google first — largest job-seeker overlap).
- Session security: httpOnly, Secure, SameSite=Lax; device list + revoke in `/settings` (better-auth session list).
- **Deferred plugins, designed for:** `organization` (teams/shared resumes P2), `twoFactor` (P2), `magicLink` (optional).

## 9. Editor Specification

Route: `/resume/[id]`. App shell (not marketing chrome): slim top bar + three panes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ☰  Ahqaf Ali's Resume ▾     ● Saved 12:41   History   Download   Share 🔒  │
├──────────────┬───────────────────────────────┬───────────────────────────┤
│ SECTIONS     │  EDITOR (form)                │  PREVIEW          100% ▾ │
│              │                               │                           │
│ ● Personal   │  RESUME TITLE  [__________]   │  ┌─────────────────────┐  │
│ ● Social     │  ─ PERSONAL INFORMATION ─     │  │   rendered resume   │  │
│ ● Summary    │  Full name  [__________]      │  │   (A4/Letter pages, │  │
│ ○ Education  │  Title      [__________]      │  │    scaled to fit)   │  │
│ ○ Experience │  Phone      [____] Email [__] │  │                     │  │
│ ○ Projects   │  Location   [__________]      │  │                     │  │
│ ○ Skills     │                               │  └─────────────────────┘  │
│ ○ Custom     │  ─ EDUCATION ─      [+ Add]   │                           │
│              │  ┌─────────────────────────┐  │  ⤓ PDF   ↺ Reset zoom    │
│ + Add section│  │ School / Degree / Dates │  │                           │
│ ⠿ Reorder    │  │ • bullet  …      [⠿][🗑] │  │                           │
│              │  └─────────────────────────┘  │                           │
├──────────────┴───────────────────────────────┴───────────────────────────┤
│ template: Classic ▾   font: Inter ▾   accent: ▤   density: Normal ▾      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Middle pane — form editor (the core difference vs Overleaf)**

- Per-section field groups matching the schema (§10): text inputs, month/year pickers, textareas.
- Repeatable entries (jobs, degrees, projects, links) as cards with **drag-to-reorder** (dnd-kit) and per-card delete/duplicate.
- Descriptions & achievements are **bullet lists** (array of strings) — ATS-clean and AI-ready; no rich-text editor in P1.
- Section visibility toggle (eye icon) — hides a section without deleting content.
- Validation: inline, on blur; nothing blocking autosave except hard schema errors.
- Autosave indicator states: `Saving…` → `Saved 12:41` / `Offline — retrying` / `Conflict — review`.

**Left pane — section navigator** (replaces Overleaf's file tree + outline)

- Section list with completion dots (empty / partial / complete), drag-reorder of sections, add custom section, click scrolls middle pane to that section.

**Right pane — live preview**

- The exact template HTML (§11) scaled to pane width; zoom 50–200%, page navigation for multi-page.
- Updates on a 250 ms debounce after each edit. No server round-trip.
- "Download PDF" button → export flow (worker) with progress state.

**Autosave & concurrency (heavy-user core)**

1. Every mutation updates the local Zustand store immediately (optimistic UI).
2. Debounce 1.5 s → `PATCH /api/resumes/:id` with `{ patch, base_updated_at }`.
3. Server rejects with `409` if `base_updated_at` ≠ stored (stale tab); client shows "Resolve" bar offering *theirs/mine* (P1: mine-last-wins with confirmation; P2: field-level merge).
4. Multi-tab same user: allowed; conflict path above handles it.

**Keyboard:** `⌘S` flush-save, `⌘Z/⌘⇧Z` local undo/redo (store-level), `⌘P` export, `Esc` close dialogs.

**Responsive behavior**

| Viewport | Layout |
|---|---|
| ≥ 1280 px | Full 3 panes (navigator 240 px / editor fluid / preview ~45%) |
| 1024–1279 px | 3 panes, narrower navigator (icon rail) |
| 768–1023 px | 2 panes: editor + preview side-by-side; navigator → dropdown sheet |
| < 768 px | Single pane + bottom segmented control **Edit / Preview**; sticky top bar with Save state + Download |

**Dashboard** (mirrors Overleaf `/project`): left sidebar (All resumes, Shared with you — P2, Archive, Trash, Tags), main area with search, plan badge, `New resume` → template picker modal, table (checkbox / Title / Owner / Last modified) → card grid on mobile; bulk actions: archive, tag, delete.

## 10. Resume Data Schema

Aligned with the **JSON Resume** open standard (import/export for free, familiar to the ecosystem), stored as `jsonb`, zod-validated.

```jsonc
{
  "basics":   { "name": "", "label": "", "email": "", "phone": "", "location": "",
                "url": "", "profiles": [{ "network": "GitHub", "username": "", "url": "" }] },
  "summary":  "",
  "education": [{ "school": "", "degree": "", "field": "", "startDate": "2020-08",
                  "endDate": "2024-07", "grade": "", "highlights": [""] }],
  "experience": [{ "company": "", "position": "", "location": "", "startDate": "",
                   "endDate": "", "current": false, "bullets": [""] }],
  "projects": [{ "name": "", "description": "", "url": "", "tech": [""],
                 "startDate": "", "endDate": "", "bullets": [""] }],
  "skills":   [{ "name": "Languages", "keywords": ["Python", "SQL"] }],
  "custom":   [{ "id": "", "title": "", "entries": [] }]   // user-defined sections
}
// resume.config (per-document presentation)
{ "template": "classic", "font": "inter", "accent": "#166534", "density": "normal",
  "pageSize": "letter", "sectionOrder": [...], "hiddenSections": [...] }
```

## 11. Render Pipeline (Preview + PDF)

**Single-source-of-truth rule:** one React template component tree consumes `{data, config}` and emits print-ready HTML + CSS. Both surfaces use it.

- **Live preview (client):** the template component renders inside a sandboxed iframe with print stylesheet (`@page`, A4/Letter). Scaled via CSS transform. Re-renders in-memory — instant, offline-tolerant.
- **PDF export (worker):** worker fetches resume → server-renders the same HTML → Puppeteer `page.pdf()` (print media, embedded fonts) → S3 `exports/{resumeId}/{exportId}.pdf` → signed URL (10-min) → row in `export`.
- **Fonts:** self-hosted (next/font + worker-loaded): Inter, Source Sans 3, EB Garamond, Charter. No CDN font dependency at render time.

**Template SDK** (`packages/templates`):

```ts
interface ResumeTemplate {
  slug: string; name: string; category: "classic" | "modern" | "compact";
  options: TemplateOptionsSchema;          // accent, font, density, pageSize
  Document: React.FC<{ data: ResumeData; config: ResumeConfig }>;  // print CSS included
}
```

**Launch templates (4):** `classic` (serif, single-column, Overleaf-Jake vibe), `modern` (sans, accent headings), `compact-two-column` (sidebar skills), `minimal-ats` (single column, zero decoration).

**Demo persona:** all template previews, seed data, and marketing screenshots use the demo candidate **Ahqaf Ali** — seeded demo resume *"Ahqaf Ali's Resume"* (our equivalent of Overleaf's "Jake's Resume").

**ATS guarantees (P1, enforced by lint rules on schema + template):** selectable text, no critical info in images, standard section names, single logical reading order, ≤ 2 pages guidance with warning.

## 12. API Surface

All under `/api`, JSON, better-auth session cookie auth, zod-validated bodies.

| Method & Path | Purpose |
|---|---|
| `POST /api/auth/*` | better-auth handlers (sign-in/up, OAuth, reset) |
| `GET/POST /api/resumes` | list (paginated, search, tag, status filter) / create (from template) |
| `GET/PATCH/DELETE /api/resumes/:id` | fetch / autosave patch (409 on conflict) / soft-delete |
| `POST /api/resumes/:id/duplicate` | fork a resume |
| `GET /api/resumes/:id/versions` · `POST .../restore` | history (P1 data, P2 UI) |
| `POST /api/resumes/:id/export` · `GET /api/exports/:id` | enqueue PDF / poll status + signed URL |
| `GET/POST/DELETE /api/tags` · `POST /api/resumes/:id/tags` | tag management |
| `GET /api/templates` | active templates + assets |
| `POST /api/exports/cleanup`, cron routes | worker/admin (signed internal) |

## 13. Scaling for Heavy Users

| Concern | Mechanism |
|---|---|
| Autosave storm | 1.5 s debounce + payload = changed fields; server idempotent on `base_updated_at`; Redis rate-limit per user (e.g. 120 writes/min) |
| DB connections | Drizzle pooled via `pg` pool sized to task count; RDSProxy when tasks × pool approaches RDS limit |
| Session cost | better-auth cookie-cache (5 min) → session lookups mostly cookie-only |
| Preview cost | Zero — client-side rendering |
| PDF bursts | BullMQ queue absorbs spikes; worker autoscaling on queue depth (target d < 10 s at p95); dedupe: same doc hash re-export reuses S3 object |
| Web autoscale | ECS target-tracking on CPU 60% + ALB requests/task; min 2 tasks multi-AZ |
| Dashboard load | RSC + indexed queries (`user_id, status, updated_at desc`); keyset pagination |
| Static | Next standalone assets → S3/CloudFront; immutable hashes |
| Notifications | Autosave failures surface inline; retry with backoff; offline queue in memory |
| Quotas (P2) | Free: 3 resumes, 50 versions, 30 exports/mo · Pro: unlimited resumes, 300 versions, unlimited exports, premium templates |
| Observability | OTel traces → X-Ray, Sentry (client+server), CloudWatch alarms: p95 latency, 5xx, queue depth, export failure rate, RDS connections |

## 14. Security & Privacy

- WAF (AWS managed common rules + rate-based) in front of CloudFront; ALB private-path only from CloudFront for app routes.
- All traffic TLS (ACM); HSTS; secure headers (`CSP` with nonce for scripts, `X-Content-Type-Options`, `frame-ancestors 'none'` except preview iframe is same-origin sandbox).
- Secrets in AWS Secrets Manager (DB, Redis, OAuth, SES); rotated; never in env-committed files.
- Ownership check helper on every resume mutation (§7); UUIDs (non-enumerable); signed URLs expire in 10 min.
- PII: resumes are sensitive docs — S3 bucket private + SSE-KMS; exports GC'd after 30 days; account deletion wipes resumes + exports (worker job) within 24 h.
- Rate limiting: better-auth built-in (auth routes) + Redis middleware for API.
- Backups: RDS PITR 7 days, snapshot before every migration; S3 versioning on exports bucket.
- Dependency + container scanning in CI (Trivy); `npm audit` gate on criticals.

## 15. Design System & Brand

**wtfbuilds product line:** marketing site carries the wtfbuilds identity (wordmark footer, "A wtfbuilds product"), while the product itself has its own quiet, tool-first personality — closer to Linear/Notion tooling than to a landing page.

**Naming & SEO**

- **Product name:** **AIResume** — wordmark in nav, app UI, social handles, domain (`airesume.com` if available, else `airesume.wtfbuilds.com`).
- **SEO display name:** **AI Resume Builder** — page titles follow the pattern `{Page} · AIResume — AI Resume Builder` (e.g. *"AIResume — AI Resume Builder | ATS-friendly resumes in minutes"*).
- **Target keywords:** ai resume builder, ats friendly resume builder, free resume builder, online resume maker, resume builder for students, latex-free resume editor.
- **Technical SEO:** static/SSR marketing pages via RSC, `generateMetadata` per route, OpenGraph + Twitter cards using real editor screenshots, `sitemap.xml` + `robots.txt`, JSON-LD (`SoftwareApplication`, `FAQPage`), canonical URLs, template gallery pages individually indexable (`/templates/classic`, …).

**Anti-"AI look" rules (explicit):**

- ❌ Purple→blue gradients, glowing orbs, glassmorphism cards, confetti emoji, generic 3D illustrations.
- ✅ Solid colors, 1px borders, subtle shadows only, real product screenshots in marketing, generous whitespace, consistent 8-px spacing scale.

**Tokens (proposed, confirmable):**

| Token | Value |
|---|---|
| Neutrals | Zinc scale (`zinc-50` canvas, `zinc-950` text) |
| Accent | **Forest green `#166534`** (emerald-800 family) — nods to Overleaf, reads professional, works in light+dark |
| Secondary accents | Amber for warnings, red-600 destructive only |
| Type | UI: **Inter** (tight tracking on headings) · Print fonts: Source Sans 3, EB Garamond, Charter |
| Shape | Radius 8–10 px; borders `zinc-200`/`zinc-800`; elevation ≤ 2 levels |
| Dark mode | Full support (class strategy); editor defaults to system |
| Components | shadcn/ui base, themed via CSS variables in `packages/ui` |

**Editor chrome:** compact app toolbar (like Overleaf) — dense, keyboard-first, document title dropdown (rename/duplicate/move), autosave status, History, Download, Share (P2). Bottom bar for template/font/accent/density.

**Responsive:** marketing site collapses to hamburger nav + stacked hero; dashboard table→cards (§9); editor per-breakpoint table (§9). Touch targets ≥ 44 px on mobile.

**Accessibility:** WCAG 2.1 AA — keyboard navigation for all editor actions, aria-live for autosave status, focus rings, reduced-motion respected.

## 16. Repository Layout

```
AI-Resume-Builder/
├─ apps/
│  ├─ web/                    # Next.js 15 (marketing + app + API routes)
│  └─ worker/                 # Node worker: BullMQ consumer, Puppeteer, cron (trash purge, export GC)
├─ packages/
│  ├─ db/                     # Drizzle schema, migrations, seeded templates
│  ├─ auth/                   # better-auth server + client, requireUser/requireResume helpers
│  ├─ templates/              # Resume schema (zod), template SDK, 4 launch templates, print CSS
│  ├─ ui/                     # Design system (shadcn-based), tokens, dark mode
│  └─ config/                 # eslint, tsconfig, tailwind presets
├─ infra/                     # Terraform: network, ecs, rds, redis, s3, cloudfront, ses, iam
├─ .github/workflows/         # ci.yml (lint/test/build), deploy-staging.yml, deploy-prod.yml
└─ docker/                    # Dockerfiles: web (standalone), worker (chromium layer)
```

## 17. Environments & CI/CD

| Env | Branch | AWS | Data |
|---|---|---|---|
| Local | — | docker compose (postgres, redis, minio) + SES sandbox/email-catcher | seed |
| Staging | `main` auto | own stack (smaller instances) | seed + synthetic |
| Prod | release tag → approval | full stack, Multi-AZ RDS | real |

**Pipeline (GitHub Actions):** lint + typecheck → unit (vitest) + e2e smoke (Playwright: sign-up→create→edit→export) → build images → push ECR → **migrate job** (drizzle-kit, gated) → ECS rolling deploy via CodeDeploy (10% canary → 100%, auto-rollback on alarm).

## 18. Phased Roadmap

### Phase 0 — Foundation (week 1) ✅ done
- [x] Monorepo scaffold, docker compose, design tokens in `packages/ui`
- [x] Terraform base: VPC, RDS, Redis, S3, ECR, ECS cluster (`infra/terraform` — apply when AWS creds are wired)
- [x] CI pipeline (`.github/workflows/ci.yml` — typecheck + build; staging deploy skeleton ready)

### Phase 1 — MVP: "Overleaf for resumes" (weeks 2–5) — core ✅ verified locally
- [x] better-auth: email/password (Google OAuth ready behind env flags), settings/sessions
- [x] Dashboard: list/create/duplicate/archive/trash/search, template picker with live previews
- [x] Editor: 3 panes, section navigator, form editor (all sections), live preview, autosave + conflict handling, undo/redo
- [x] Templates: schema + SDK + 4 launch templates, per-doc config (font/accent/density/page size)
- [x] PDF export: queue → worker → storage → download (verified: valid 2-page selectable-text PDF)
- [x] Marketing site: home, features, templates gallery, pricing stub, wtfbuilds footer
- [ ] Observability + alarms (prod wiring)
- [ ] Playwright smoke in CI
- [ ] Tags UI (API + schema ready)

### Phase 2 — Heavy users & growth (weeks 6–9) — 2a ✅ done, 2b next
- [x] Version history UI (timeline, manual saves, restore with pre-restore safety snapshot)
- [x] View-only share links (public /share/… noindex viewer, create/revoke, optional expiry)
- [x] JSON import/export (AIResume v1 envelope + bare JSON-Resume, strict zod validation)
- [x] Tags UI (create/assign/filter, chips on rows, sidebar list)
- [x] Quota scaffolding (free plan: 5 active resumes, 402 + upgrade messaging; Stripe-ready seam)
- [ ] 2b: Stripe billing (Free/Pro), plan gating upgrades
- [ ] 2b: better-auth `organization` plugin → teams & shared resumes; `twoFactor`
- [ ] 2b: Multi-page pagination polish, cover letter doc type
- [ ] 2b: More templates (premium tier)

### Phase 3 — AI (weeks 10+, §19)
- [ ] AI writer: bullet/summary generation & improvement, tone controls
- [ ] ATS analysis: score, missing keywords vs job description
- [ ] Job-description tailoring: highlight matching skills, suggest rewrites
- [ ] Resume import: parse existing PDF via AI into schema
- [ ] Usage metering + AI quota per plan

## 19. AI Architecture (Phase 3, designed now)

Extension points reserved in Phase 1 so AI never requires rework:

- **Jobs:** `ai_job` table (§7) + BullMQ `ai` queue consumed by the same worker. Long LLM calls never block web tasks; web streams progress via SSE from job status.
- **Provider abstraction:** `packages/ai` — `complete(prompt, schema, opts)` behind an interface; provider adapter (OpenAI/Anthropic/local) chosen by env; zod-schema-constrained outputs so AI writes *valid resume data*, never freeform into the doc.
- **Product model:** AI proposes → user accepts/rejects per suggestion (no silent doc mutation). Every accepted change is a normal autosave patch → version history covers it.
- **Context building:** resume JSON + selected section + (optional) pasted job description → prompt templates versioned in repo.
- **Cost control:** per-plan quotas, token accounting in `ai_job`, response caching by (section-content-hash, prompt-version), streaming with max-token caps.
- **Feature flags:** AI UI hidden behind flag until launch; billing metering slot already in plan schema.

## 20. Milestones

| Milestone | Target | Exit criteria |
|---|---|---|
| M0 Infra live | end week 1 | staging deploys on push; RDS/Redis/S3 reachable from ECS |
| M1 Auth + dashboard | end week 2 | sign-up/in (email+Google) → create resume from template → see it listed |
| M2 Editor core | end week 3 | edit all sections with autosave; live preview mirrors edits; conflicts handled |
| M3 PDF pipeline | end week 4 | export produces pixel-identical, selectable-text PDF; p95 < 15 s |
| M4 MVP polish + marketing | end week 5 | responsive editor + dashboard, dark mode, a11y pass, alarms, smoke e2e green |
| M5 Ship (soft launch) | week 6 | prod live, 10 friendly users, feedback loop |

## 21. Risks

| Risk | Mitigation |
|---|---|
| Puppeteer memory spikes in worker | one Chromium per job with pool cap; worker tasks sized 1 vCPU/2 GB; queue depth autoscaling; kill+retry on timeout |
| Autosave conflicts frustrate users | conservative UX: last-write-wins with clear "Resolve" bar in P1; field-level merge in P2 |
| Preview/PDF drift | impossible by construction (same component tree); Playwright test renders both and diffs text |
| better-auth API churn | pin version; wrap in `packages/auth` so app code never imports better-auth directly except there |
| AWS cost creep | budgets + billing alarms from day 1; staging uses smaller instances; worker min 1 task |
| Cold template rendering perf on low-end mobile | preview virtualized per page; debounce; measure with Playwright CPU throttle |

## 22. Open Questions

1. **Accent color** — plan proposes forest green `#166534`; confirm against wtfbuilds brand.
2. **Billing** — Stripe assumed for Phase 2; confirm (especially for Indian entity pricing/currency).
3. **Page size default** — Letter (US-heavy job market) vs A4 (India/EU). Plan: default by locale, toggle in editor.
4. **OAuth scope at launch** — Google only, or Google + GitHub on day one?

**Resolved**

- ~~Product name~~ → **AIResume**, SEO display name **"AI Resume Builder"** (see §15).
- ~~Demo persona~~ → seeded demo resume and marketing screenshots use **Ahqaf Ali** (see §11).
