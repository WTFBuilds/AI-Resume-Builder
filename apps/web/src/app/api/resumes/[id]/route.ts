import { z } from "zod";
import { NextResponse } from "next/server";
import {
  deleteResumeForever,
  listVersions,
  patchResume,
  requireResume,
  setResumeStatus,
} from "@airesume/db";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

const patchSchema = z.object({
  title: z.string().max(200).optional(),
  data: z.unknown().optional(),
  config: z.unknown().optional(),
  status: z.enum(["active", "archived", "trashed"]).optional(),
  baseUpdatedAt: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const row = await requireResume(user.id, id);
    return NextResponse.json({
      id: row.id,
      title: row.title,
      templateId: row.templateId,
      data: row.data,
      config: row.config,
      updatedAt: row.updatedAt.toISOString(),
      versions: (await listVersions(row.id, 20)).map((v) => ({
        id: v.id,
        label: v.label,
        auto: v.auto,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(422, { error: "Invalid request body" });
    const { status, baseUpdatedAt, ...patch } = parsed.data;

    if (status) {
      const row = await setResumeStatus(user.id, id, status);
      return NextResponse.json({ updatedAt: row.updatedAt.toISOString(), status: row.status });
    }

    const row = await patchResume(user.id, id, patch, baseUpdatedAt);
    return NextResponse.json({
      updatedAt: row.updatedAt.toISOString(),
      savedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const permanent = new URL(req.url).searchParams.get("permanent") === "true";
    if (permanent) {
      await deleteResumeForever(user.id, id);
      return NextResponse.json({ deleted: true });
    }
    const row = await setResumeStatus(user.id, id, "trashed");
    return NextResponse.json({ status: row.status });
  } catch (err) {
    return handleApiError(err);
  }
}
