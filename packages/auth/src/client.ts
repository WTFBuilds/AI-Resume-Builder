"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. An explicit baseURL keeps SSR safe (client
 * components still render on the server, where there is no window to
 * infer from); in the browser it matches the same origin anyway.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { useSession, signIn, signUp, signOut } = authClient;

export const googleOAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH === "true";
export const githubOAuthEnabled = process.env.NEXT_PUBLIC_GITHUB_OAUTH === "true";
