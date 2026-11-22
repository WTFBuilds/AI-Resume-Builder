import { requireExportForUser } from "@airesume/db";
import { getStorage, storageKind } from "@airesume/storage";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

/**
 * Download a finished export. Local driver streams the file through the
 * app (dev); S3 / Cloudinary drivers redirect to a short-TTL signed URL.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const row = await requireExportForUser(user.id, id);
    if (row.status !== "done" || !row.storageKey) {
      return NextResponse.json({ error: "Export not ready" }, { status: 409 });
    }

    if (storageKind() !== "local") {
      const url = await getStorage().downloadUrl(row.storageKey);
      return NextResponse.redirect(url);
    }

    const buffer = await getStorage().get(row.storageKey);
    const filename = `${row.resumeId}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="airesume-${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
