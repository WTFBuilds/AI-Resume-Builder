import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-guard";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata: Metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">Account settings</h1>
      <SettingsClient name={user.name} email={user.email} />
    </main>
  );
}
