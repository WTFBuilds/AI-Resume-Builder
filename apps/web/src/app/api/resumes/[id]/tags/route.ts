import { z } from "zod";
import { setResumeTags } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

const setSchema = z.object({ tagIds: z.array(z.string().uuid()).max(20) });

/** Replace the tag set on a resume. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const parsed = setSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(422, { error: "Invalid tag list" });
    await setResumeTags(user.id, id, parsed.data.tagIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
