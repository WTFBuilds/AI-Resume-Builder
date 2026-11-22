import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@airesume/auth/server";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@airesume/db";
import type { User } from "@airesume/auth/server";

export type ApiErrorBody = { error: string } & Record<string, unknown>;

export function jsonError(status: number, body: ApiErrorBody) {
  return NextResponse.json(body, { status });
}

/** Session guard for route handlers. Returns the user or a 401 response. */
export async function apiUser(): Promise<
  { user: User; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { response: jsonError(401, { error: "Not signed in" }) };
  }
  return { user: session.user };
}

/** Map domain errors to API responses; unknown errors become 500. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof NotFoundError) return jsonError(404, { error: err.message });
  if (err instanceof ForbiddenError) return jsonError(403, { error: err.message });
  if (err instanceof ValidationError) return jsonError(422, { error: err.message });
  if (err instanceof ConflictError) {
    return NextResponse.json(
      {
        error: err.message,
        code: "conflict",
        updatedAt: err.current.updatedAt.toISOString(),
        resume: {
          title: err.current.title,
          data: err.current.data,
          config: err.current.config,
        },
      },
      { status: 409 },
    );
  }
  console.error("[api] unhandled error", err);
  return jsonError(500, { error: "Internal error" });
}
