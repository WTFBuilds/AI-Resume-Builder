import { createExport } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";
import { enqueueExport, QueueUnavailableError } from "@/lib/queue";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const exportRow = await createExport(user.id, id);
    try {
      await enqueueExport(exportRow.id, id);
    } catch (err) {
      if (err instanceof QueueUnavailableError) {
        await import("@airesume/db").then((m) => m.updateExport(exportRow.id, { status: "failed", error: "Queue unavailable" }));
        return jsonError(503, {
          error: "PDF service is not running. Start Redis and the worker: `pnpm dev:worker`.",
        });
      }
      throw err;
    }
    return NextResponse.json({ exportId: exportRow.id, status: "queued" }, { status: 202 });
  } catch (err) {
    return handleApiError(err);
  }
}
