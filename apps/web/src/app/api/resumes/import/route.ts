import { z } from "zod";
import { createResume } from "@airesume/db";
import { ResumeDataSchema } from "@airesume/templates";
import { NextResponse } from "next/server";
import { apiUser, handleApiError, jsonError } from "@/lib/api";

const importSchema = z.object({
  title: z.string().max(200).optional(),
  templateId: z.string().min(1).optional(),
  data: z.unknown(),
});

/** Create a resume from imported resume data (AIResume / JSON-Resume-ish). */
export async function POST(req: Request) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const parsed = importSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(422, { error: "Invalid import payload" });

    // Validate the document strictly — invalid imports are rejected whole.
    const doc = ResumeDataSchema.safeParse(parsed.data.data);
    if (!doc.success) {
      return jsonError(422, { error: "The JSON doesn't match the resume schema" });
    }

    const row = await createResume(user.id, {
      title: parsed.data.title?.trim() || "Imported resume",
      templateId: parsed.data.templateId ?? "classic",
      data: doc.data,
    });
    return NextResponse.json({ id: row.id, title: row.title }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
