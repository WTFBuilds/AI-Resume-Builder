import { listResumes } from "@airesume/db";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-guard";
import { ResumeList, type ResumeListItem } from "@/components/dashboard/resume-list";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const user = await requireUser();
  const { items } = await listResumes(user.id, { status: "trashed" });

  const listItems: ResumeListItem[] = items.map((r) => ({
    id: r.id,
    title: r.title,
    templateId: r.templateId,
    updatedAt: r.updatedAt.toISOString(),
    tags: [],
  }));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-20 md:px-8 md:pt-10">
      <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">Trash</h1>
      <p className="mb-6 mt-1 text-sm text-[var(--ink-2)]">
        Items are removed permanently after 30 days.
      </p>
      <ResumeList items={listItems} status="trashed" />
    </main>
  );
}
