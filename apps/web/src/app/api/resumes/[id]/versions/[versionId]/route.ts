import { eq } from "drizzle-orm";
import { db, NotFoundError, requireResume, resumeVersion } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

/** Full snapshot of a single version (used by Restore). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id, versionId } = await params;
    await requireResume(user.id, id);
    const rows = await db.select().from(resumeVersion).where(eq(resumeVersion.id, versionId));
    const version = rows[0];
    if (!version || version.resumeId !== id) throw new NotFoundError("Version not found");
    return NextResponse.json({
      id: version.id,
      label: version.label,
      auto: version.auto,
      createdAt: version.createdAt.toISOString(),
      snapshot: version.snapshot,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
