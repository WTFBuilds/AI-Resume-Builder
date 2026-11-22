import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@airesume/ui";
import { TEMPLATE_LIST } from "@airesume/templates";
import { ResumePreviewFrame } from "@/components/marketing/resume-preview-frame";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Four ATS-friendly, typographically disciplined resume templates. Classic, Modern, Compact Two-Column, and Minimal ATS — preview each with real content.",
};

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
        Templates
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-2)]">
        Every template renders from the same engine that prints your PDF — what you preview
        here is exactly what an employer receives. Switch templates anytime; content follows.
      </p>
      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {TEMPLATE_LIST.map((tpl) => (
          <div key={tpl.slug}>
            <ResumePreviewFrame templateSlug={tpl.slug} chrome={false} scale={0.62} />
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--ink)]">{tpl.name}</h2>
                <p className="mt-1 text-sm text-[var(--ink-2)]">{tpl.description}</p>
              </div>
              <Link href={`/sign-up?template=${tpl.slug}`} className="shrink-0">
                <Button variant="soft" size="sm">
                  Use <ArrowRight />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
