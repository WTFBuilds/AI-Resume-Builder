import { revokeShareLink } from "@airesume/db";
import { NextResponse } from "next/server";
import { apiUser, handleApiError } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  const { user, response } = await apiUser();
  if (response) return response;
  try {
    const { id, shareId } = await params;
    await revokeShareLink(user.id, id, shareId);
    return NextResponse.json({ revoked: true });
  } catch (err) {
    return handleApiError(err);
  }
}
