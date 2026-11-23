import { listResumes, listTags, listTagsForAllResumes } from "@airesume/db";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@airesume/ui";
import { requireUser } from "@/lib/auth-guard";
import { ResumeList, type ResumeListItem } from "@/components/dashboard/resume-list";

export const metadata: Metadata = { title: "All resumes" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [{ items }, tags, tagMap] = await Promise.all([
    listResumes(user.id, { status: "active", q: sp.q, tagId: sp.tag }),
    listTags(user.id),
    listTagsForAllResumes(user.id),
  ]);

  const listItems: ResumeListItem[] = items.map((r) => ({
    id: r.id,
    title: r.title,
    templateId: r.templateId,
    updatedAt: r.updatedAt.toISOString(),
    tags: (tagMap.get(r.id) ?? []).map((t) => ({ id: t.id, name: t.name })),
  }));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-20 md:px-8 md:pt-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">All resumes</h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Welcome back, {user.name.split(" ")[0]}.
          </p>
        </div>
        <p className="hidden items-center gap-2 text-sm text-[var(--ink-2)] sm:flex">
          You&apos;re on the free plan <Badge variant="accent">Beta</Badge>{" "}
          <Link href="/pricing" className="text-[var(--accent)] hover:underline">
            Upgrade
          </Link>
        </p>
      </div>
      <ResumeList
        items={listItems}
        status="active"
        allTags={tags.map((t) => ({ id: t.id, name: t.name }))}
      />
    </main>
  );
}
