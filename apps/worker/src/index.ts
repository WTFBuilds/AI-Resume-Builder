import "dotenv/config";
import { createHmac } from "node:crypto";
import http from "node:http";
import { eq } from "drizzle-orm";
import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { db, schema, purgeTrashedOlderThan } from "@airesume/db";
import { htmlToPdf, resumeHtml } from "./pdf";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

console.log(`[airesume-worker] redis: ${REDIS_URL.replace(/:[^@]*@/, ":***@")}`);

/* ── maintenance queue (trash purge) ─────────────────────────────────────── */

async function handleMaintenance(job: Job): Promise<void> {
  if (job.name === "purge-trash") {
    const n = await purgeTrashedOlderThan(30);
    if (n > 0) console.log(`[maintenance] purged ${n} trashed resumes (>30 days)`);
  }
}

const maintenanceWorker = new Worker("airesume-maintenance", handleMaintenance, {
  connection,
  prefix: "airesume",
  concurrency: 1,
});

async function registerRepeatables(): Promise<void> {
  const { Queue } = await import("bullmq");
  const q = new Queue("airesume-maintenance", { connection, prefix: "airesume" });
  await q.add("purge-trash", {}, { repeat: { pattern: "0 3 * * *" }, jobId: "purge-trash" });
  await q.close();
}

/* ── render server ─────────────────────────────────────────────────────────
 * GET /pdf/:resumeId?t=<hmac>&e=<expiry-epoch-seconds>
 *
 * The web app verifies the session + ownership, then signs a 10-minute HMAC
 * token (INTERNAL_TOKEN shared with this worker) and streams the render
 * through to the user. PDFs are rendered on demand from the document in
 * Postgres — nothing is stored on disk.
 */
const RENDER_PORT = Number(process.env.WORKER_PORT ?? 3001);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? "";

const renderServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const match = url.pathname.match(/^\/pdf\/([0-9a-f-]{36})$/);

  if (!INTERNAL_TOKEN || !match) {
    res.writeHead(404).end();
    return;
  }
  const resumeId = match[1];
  const expiry = Number(url.searchParams.get("e") ?? 0);
  const token = url.searchParams.get("t") ?? "";

  if (!expiry || expiry < Math.floor(Date.now() / 1000)) {
    res.writeHead(403).end("expired");
    return;
  }
  const expected = createHmac("sha256", INTERNAL_TOKEN).update(`${resumeId}.${expiry}`).digest("hex");
  if (token !== expected) {
    res.writeHead(403).end("bad token");
    return;
  }

  const startedAt = Date.now();
  try {
    const rows = await db.select().from(schema.resume).where(eq(schema.resume.id, resumeId));
    const resume = rows[0];
    if (!resume || resume.status === "trashed") {
      res.writeHead(404).end("not found");
      return;
    }

    const html = resumeHtml(
      resume.data as Parameters<typeof resumeHtml>[0],
      resume.config as Parameters<typeof resumeHtml>[1],
      resume.templateId,
    );
    const pdf = await htmlToPdf(html);
    console.log(`[render ${resumeId}] done in ${Date.now() - startedAt}ms (${pdf.length} bytes)`);

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="airesume-${resumeId}.pdf"`,
      "Cache-Control": "private, no-store",
    });
    res.end(pdf);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[render ${resumeId}] failed:`, message);
    if (!res.headersSent) res.writeHead(500).end("render failed");
    else res.end();
  }
});

renderServer.listen(RENDER_PORT, () => {
  console.log(`[airesume-worker] render server on :${RENDER_PORT}`);
});

/* ── lifecycle ───────────────────────────────────────────────────────────── */

await registerRepeatables();
console.log("[airesume-worker] ready — render server + maintenance");

async function shutdown(signal: string) {
  console.log(`[airesume-worker] ${signal} — closing workers…`);
  await Promise.allSettled([maintenanceWorker.close(), renderServer.close()]);
  connection.disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
