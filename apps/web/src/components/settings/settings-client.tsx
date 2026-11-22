"use client";

import { authClient } from "@airesume/auth/client";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Card, Field, Input } from "@airesume/ui";

export function SettingsClient({ name: initialName, email }: { name: string; email: string }) {
  return (
    <div className="mt-6 space-y-6">
      <ProfileCard initialName={initialName} email={email} />
      <PasswordCard />
      <SessionsCard />
    </div>
  );
}

function ProfileCard({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await authClient.updateUser({ name });
    setSaving(false);
    if (res.error) toast.error(res.error.message ?? "Could not save");
    else toast.success("Profile updated");
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Profile</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input value={email} disabled />
        </Field>
        <div className="sm:col-span-2">
          <Button size="sm" type="submit" disabled={saving || name === initialName}>
            {saving ? <Loader2 className="animate-spin" /> : null} Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setSaving(false);
    if (res.error) toast.error(res.error.message ?? "Could not change password");
    else {
      toast.success("Password changed — other sessions revoked");
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Password</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Current password">
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <Input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button size="sm" type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null} Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface SessionRow {
  id: string;
  createdAt: string | Date;
  userAgent: string | null;
  ipAddress: string | null;
}

function SessionsCard() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await authClient.listSessions();
    setSessions(
      (res.data ?? []).map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        userAgent: s.userAgent ?? null,
        ipAddress: s.ipAddress ?? null,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function revoke(id: string) {
    await authClient.revokeSession({ token: id });
    toast.success("Session revoked");
    void load();
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Active sessions</h2>
      {loading ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <MonitorSmartphone className="size-4 text-[var(--muted)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--ink)]">
                  {s.userAgent ?? "Unknown device"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {s.ipAddress ?? "unknown IP"} · signed in{" "}
                  {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost-destructive" size="sm" onClick={() => revoke(s.id)}>
                <LogOut /> Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
