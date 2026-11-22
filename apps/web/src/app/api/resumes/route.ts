import { z } from "zod";
import { createResume, listResumes } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

const createSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "archived" || statusParam === "trashed" ? statusParam : "active";
    const { items } = await listResumes(user.id, {
      status,
      q: url.searchParams.get("q") ?? undefined,
    });
    return NextResponse.json(
      {
        resumes: items.map((r) => ({
          id: r.id,
          title: r.title,
          templateId: r.templateId,
          status: r.status,
          updatedAt: r.updatedAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(422, { error: "Invalid request body" });
    const row = await createResume(user.id, {
      templateId: parsed.data.templateId,
      title: parsed.data.title ?? "Untitled resume",
    });
    return NextResponse.json({ id: row.id, title: row.title }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
