"use client";

import { authClient } from "@airesume/auth/client";
import { Github } from "lucide-react";
import { Button } from "@airesume/ui";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.2h6.6c-.1 1.1-.8 2.8-2.5 3.9l3.8 2.9c2.3-2.1 3.6-5.2 3.6-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-3.9 3C3.3 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-4-3C.4 8.2 0 10 0 12s.4 3.8 1.3 5.4l3.9-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.4-3.3C17.9 1 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

export function OAuthButtons({
  google,
  github,
  redirectTo,
  onError,
}: {
  google: boolean;
  github: boolean;
  redirectTo?: string;
  onError: (message: string) => void;
}) {
  if (!google && !github) return null;

  const callback = "/dashboard";
  void redirectTo;

  async function signInGoogle() {
    const res = await authClient.signIn.social({
      provider: "google",
      callbackURL: callback,
    });
    if (res.error) onError(res.error.message ?? "Google sign-in failed");
  }

  async function signInGithub() {
    const res = await authClient.signIn.social({
      provider: "github",
      callbackURL: callback,
    });
    if (res.error) onError(res.error.message ?? "GitHub sign-in failed");
  }

  return (
    <div className="mt-5 space-y-2">
      {google ? (
        <Button variant="secondary" className="w-full" onClick={signInGoogle}>
          <GoogleIcon /> Continue with Google
        </Button>
      ) : null}
      {github ? (
        <Button variant="secondary" className="w-full" onClick={signInGithub}>
          <Github /> Continue with GitHub
        </Button>
      ) : null}
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
    </div>
  );
}
