import { requireResume } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

/** Download the resume document as a portable JSON file. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const row = await requireResume(user.id, id);
    const payload = {
      schema: "airesume/v1",
      title: row.title,
      templateId: row.templateId,
      data: row.data,
      config: row.config,
      exportedAt: new Date().toISOString(),
    };
    const filename = row.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "resume";
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
