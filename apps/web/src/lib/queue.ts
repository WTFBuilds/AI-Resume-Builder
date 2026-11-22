import { Queue } from "bullmq";
import Redis from "ioredis";

/**
 * BullMQ producer (web side). The worker consumes "exports" jobs.
 * Missing/failed Redis → clean 503 with an actionable message rather
 * than a hung request.
 */
let queue: Queue | null = null;
let connection: Redis | null = null;

function getQueue(): Queue | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!queue) {
    connection = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
    queue = new Queue("airesume", { connection, prefix: "airesume" });
  }
  return queue;
}

export async function enqueueExport(exportId: string, resumeId: string): Promise<void> {
  const q = getQueue();
  if (!q) {
    throw new QueueUnavailableError();
  }
  try {
    await q.add(
      "export",
      { exportId, resumeId },
      { jobId: exportId, attempts: 3, backoff: { type: "exponential", delay: 3000 }, removeOnComplete: 500, removeOnFail: 500 },
    );
  } catch (err) {
    queue = null; // force reconnect next attempt
    throw new QueueUnavailableError();
  }
}

export class QueueUnavailableError extends Error {
  constructor() {
    super("PDF export service is unavailable (Redis offline)");
    this.name = "QueueUnavailableError";
  }
}
