import { requireExportForUser } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const row = await requireExportForUser(user.id, id);
    return NextResponse.json({
      exportId: row.id,
      status: row.status,
      error: row.error,
      requestedAt: row.requestedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
