"use client";

import { googleOAuthEnabled, githubOAuthEnabled, authClient } from "@airesume/auth/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@airesume/ui";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignUpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const template = params.get("template");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Could not create your account.");
      return;
    }
    if (!res.data?.token) {
      // No session was created — email verification is enforced. Show the
      // check-your-inbox state instead of the dashboard.
      setNeedsVerification(true);
      return;
    }
    router.push(template ? `/dashboard?new=${template}` : "/dashboard");
    router.refresh();
  }

  if (needsVerification) {
    return (
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-[var(--ink)]">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          We sent a verification link to <b>{email}</b>. Click it to activate your account,
          then sign in.
        </p>
        <p className="mt-4 text-xs text-[var(--muted)]">
          (Local dev: the link is printed in the web server console.)
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-[var(--ink)]">Create your free account</h1>
      <p className="mt-1 text-sm text-[var(--ink-2)]">
        Already have one?{" "}
        <Link href="/sign-in" className="font-medium text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>

      <OAuthButtons
        google={googleOAuthEnabled}
        github={githubOAuthEnabled}
        redirectTo={template ?? undefined}
        onError={(m) => setError(m)}
      />

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Field label="Full name">
          <Input
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ahqaf Ali"
          />
        </Field>
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
        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
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
          {loading ? <Loader2 className="animate-spin" /> : null} Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-[var(--muted)]">
        By continuing you agree to our fair-use terms. Your resumes are yours — export or
        delete them anytime.
      </p>
    </Card>
  );
}
