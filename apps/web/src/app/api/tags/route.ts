import { z } from "zod";
import { createTag, listTags } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function GET() {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const tags = await listTags(user.id);
    return NextResponse.json({ tags });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(422, { error: "Invalid tag" });
    const tag = await createTag(user.id, parsed.data.name, parsed.data.color);
    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
