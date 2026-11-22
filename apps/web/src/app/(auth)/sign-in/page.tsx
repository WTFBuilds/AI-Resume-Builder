"use client";

import { googleOAuthEnabled, githubOAuthEnabled, authClient } from "@airesume/auth/client";
import { Github, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@airesume/ui";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Could not sign in — check your email and password.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-[var(--ink)]">Sign in</h1>
      <p className="mt-1 text-sm text-[var(--ink-2)]">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-[var(--accent)] hover:underline">
          Create a free account
        </Link>
      </p>

      <OAuthButtons
        google={googleOAuthEnabled}
        github={githubOAuthEnabled}
        redirectTo={next}
        onError={(m) => setError(m)}
      />

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error ? (
          <p className="rounded-(--radius) bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null} Sign in
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-[var(--muted)]">
        <Link href="/forgot-password" className="hover:text-[var(--ink-2)]">
          Forgot your password?
        </Link>
      </p>
    </Card>
  );
}
