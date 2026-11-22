import { z } from "zod";
import { createManualVersion, listVersions, requireResume } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

type RouteParams = { params: Promise<{ id: string }> };

const manualSchema = z.object({ label: z.string().min(1).max(100) });

export async function GET(_req: Request, { params }: RouteParams) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    await requireResume(user.id, id);
    const versions = await listVersions(id, 100);
    return NextResponse.json({
      versions: versions.map((v) => {
        const snapshot = v.snapshot as { title?: string };
        return {
          id: v.id,
          label: v.label,
          auto: v.auto,
          title: snapshot.title ?? null,
          createdAt: v.createdAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const parsed = manualSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(422, { error: "A version label is required" });
    const version = await createManualVersion(user.id, id, parsed.data.label);
    return NextResponse.json(
      { id: version.id, label: version.label, createdAt: version.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
