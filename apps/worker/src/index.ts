import "dotenv/config";
import { eq } from "drizzle-orm";
import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { db, schema, pruneExports, purgeTrashedOlderThan, updateExport, getExport } from "@airesume/db";
import { getStorage } from "@airesume/storage";
import { htmlToPdf, resumeHtml } from "./pdf";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

console.log(`[airesume-worker] redis: ${REDIS_URL}`);

/* ── export queue ────────────────────────────────────────────────────────── */

async function handleExport(job: Job<{ exportId: string }>): Promise<void> {
  const { exportId } = job.data;
  const exportRow = await getExport(exportId);
  if (exportRow.status === "done") return;

  const rows = await db.select().from(schema.resume).where(eq(schema.resume.id, exportRow.resumeId));
  const resume = rows[0];
  if (!resume) {
    await updateExport(exportId, { status: "failed", error: "Resume not found" });
    return;
  }

  await updateExport(exportId, { status: "rendering" });
  const startedAt = Date.now();

  try {
    const html = resumeHtml(
      resume.data as Parameters<typeof resumeHtml>[0],
      resume.config as Parameters<typeof resumeHtml>[1],
      resume.templateId,
    );
    const pdf = await htmlToPdf(html);
    const key = `exports/${exportId}.pdf`;
    await getStorage().put(key, pdf, "application/pdf");
    await updateExport(exportId, { status: "done", storageKey: key, completedAt: new Date() });
    console.log(`[export ${exportId}] done in ${Date.now() - startedAt}ms (${pdf.length} bytes)`);

    // keep the latest 10 exports per resume; delete evicted files
    const evicted = await pruneExports(resume.id, 10);
    await Promise.all(evicted.map((k) => getStorage().delete(k)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[export ${exportId}] failed:`, message);
    await updateExport(exportId, { status: "failed", error: message, completedAt: new Date() });
    throw err; // let BullMQ retry per job attempts
  }
}

const exportWorker = new Worker("airesume", handleExport, {
  connection,
  prefix: "airesume",
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
});
exportWorker.on("failed", (job, err) => {
  console.error(`[worker] export job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

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

/* ── lifecycle ───────────────────────────────────────────────────────────── */

await registerRepeatables();
console.log("[airesume-worker] ready — queues: exports, maintenance");

async function shutdown(signal: string) {
  console.log(`[airesume-worker] ${signal} — closing workers…`);
  await Promise.allSettled([exportWorker.close(), maintenanceWorker.close()]);
  connection.disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
