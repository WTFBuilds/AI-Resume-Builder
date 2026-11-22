import { auth } from "@airesume/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@airesume/auth/server";

export async function getSessionUser(): Promise<User | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** RSC/page guard — redirects to sign-in when unauthenticated. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}
