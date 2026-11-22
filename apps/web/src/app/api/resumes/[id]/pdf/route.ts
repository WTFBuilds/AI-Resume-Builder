import { createHmac } from "node:crypto";
import { requireResume } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

// The render runs on the EC2 worker (Chromium) — allow time for cold starts.
export const maxDuration = 60;

/**
 * GET — render the resume to PDF on the EC2 worker and stream it through.
 * Session + ownership verified here; the worker is gated by a 10-minute
 * HMAC token (INTERNAL_TOKEN shared with the worker). Nothing is stored.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    await requireResume(user.id, id);

    const workerBase = process.env.WORKER_DOWNLOAD_URL;
    const internalToken = process.env.INTERNAL_TOKEN;
    if (!workerBase || !internalToken) {
      return NextResponse.json(
        { error: "PDF service is not configured (missing WORKER_DOWNLOAD_URL / INTERNAL_TOKEN)" },
        { status: 503 },
      );
    }

    const expiry = Math.floor(Date.now() / 1000) + 600;
    const token = createHmac("sha256", internalToken).update(`${id}.${expiry}`).digest("hex");
    const upstream = await fetch(`${workerBase}/pdf/${id}?t=${token}&e=${expiry}`, {
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      const message = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: message || "PDF rendering failed" },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="airesume-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
