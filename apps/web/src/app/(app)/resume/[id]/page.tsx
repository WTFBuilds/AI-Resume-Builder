import { NotFoundError, requireResume } from "@airesume/db";
import {
  ResumeConfigSchema,
  ResumeDataSchema,
  type ResumeConfig,
  type ResumeData,
} from "@airesume/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { EditorClient } from "@/components/editor/editor-client";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditorPageProps): Promise<Metadata> {
  return { title: "Editor" };
}

export default async function EditorPage({ params }: EditorPageProps) {
  const user = await requireUser();
  const { id } = await params;

  let row: Awaited<ReturnType<typeof requireResume>>;
  try {
    row = await requireResume(user.id, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    // Ownership failures surface as "not found" — don't leak existence.
    notFound();
  }

  const data: ResumeData = ResumeDataSchema.parse(row.data);
  const config: ResumeConfig = ResumeConfigSchema.parse(row.config);

  return (
    <EditorClient
      resumeId={row.id}
      updatedAt={row.updatedAt.toISOString()}
      doc={{ title: row.title, templateId: row.templateId, data, config }}
    />
  );
}
