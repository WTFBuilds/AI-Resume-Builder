import { getActiveShareByToken } from "@airesume/db";
import { ResumeConfigSchema, ResumeDataSchema } from "@airesume/templates";
import type { Metadata } from "next";
import { ShareView } from "@/components/share/share-view";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

// Shared resumes must never be indexed (declared via generateMetadata).
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  return {
    title: "Shared resume",
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const result = await getActiveShareByToken(token);

  if (!result) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--canvas)] px-4 text-center">
        <div className="max-w-sm rounded-(--radius-lg) border border-[var(--line)] bg-[var(--surface)] p-8 shadow-(--shadow-sm)">
          <h1 className="text-lg font-semibold text-[var(--ink)]">Link unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
            This share link doesn&apos;t exist, was revoked by its owner, or has expired.
          </p>
          <a
            href="/"
            className="mt-5 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Visit AIResume →
          </a>
        </div>
      </main>
    );
  }

  const { resume } = result;
  const data = ResumeDataSchema.parse(resume.data);
  const config = ResumeConfigSchema.parse(resume.config);

  return (
    <div className="min-h-dvh bg-[var(--canvas)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <a href="/" className="text-[15px] font-bold tracking-tight text-[var(--ink)]">
          AI<span className="text-[var(--accent)]">Resume</span>
        </a>
        <p className="text-xs text-[var(--muted)]">
          Shared read-only · created with AIResume
        </p>
      </header>
      <ShareView data={data} config={config} templateId={resume.templateId} />
    </div>
  );
}
