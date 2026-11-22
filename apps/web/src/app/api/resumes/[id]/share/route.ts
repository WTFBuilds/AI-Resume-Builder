import { z } from "zod";
import { createShareLink, listShareLinks } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

const createSchema = z.object({
  /** Optional expiry as ISO timestamp; omit = no expiry. */
  expiresAt: z.string().datetime().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const links = await listShareLinks(user.id, id);
    return NextResponse.json({
      links: links.map((l) => ({
        id: l.id,
        token: l.token,
        revoked: l.revoked,
        expiresAt: l.expiresAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
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
    const parsed = createSchema.safeParse(req.headers.get("content-length") === "0" ? {} : await req.json().catch(() => ({})));
    if (!parsed.success) return jsonError(422, { error: "Invalid request body" });
    const link = await createShareLink(user.id, id, {
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });
    return NextResponse.json(
      { shareId: link.id, token: link.token, url: `/share/${link.token}` },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
