import { duplicateResume } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id } = await params;
    const row = await duplicateResume(user.id, id);
    return NextResponse.json({ id: row.id, title: row.title }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
