import { eq } from "drizzle-orm";
import {
  createManualVersion,
  db,
  NotFoundError,
  patchResume,
  requireResume,
  resumeVersion,
} from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

interface VersionSnapshot {
  title?: string;
  data?: unknown;
  config?: unknown;
}

/** Restore a version: snapshot the current state first (restores are undoable). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id, versionId } = await params;
    await requireResume(user.id, id);
    const rows = await db
      .select()
      .from(resumeVersion)
      .where(eq(resumeVersion.id, versionId));
    const version = rows[0];
    if (!version || version.resumeId !== id) throw new NotFoundError("Version not found");
    const snapshot = version.snapshot as VersionSnapshot;
    if (!snapshot.data) throw new NotFoundError("Version snapshot is empty");

    // safety net: keep the pre-restore state as a labeled version
    await createManualVersion(user.id, id, `Before restore (${new Date().toLocaleString()})`);

    const row = await patchResume(user.id, id, {
      title: snapshot.title,
      data: snapshot.data,
      config: snapshot.config,
    });
    return NextResponse.json({
      updatedAt: row.updatedAt.toISOString(),
      restoredFrom: version.createdAt.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
