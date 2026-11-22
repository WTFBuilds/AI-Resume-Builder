"use client";

import { authClient } from "@airesume/auth/client";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@airesume/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    setSent(true);
  }

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-[var(--ink)]">Reset your password</h1>
      {sent ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">
          If an account exists for <b>{email}</b>, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null} Send reset link
          </Button>
        </form>
      )}
    </Card>
  );
}
