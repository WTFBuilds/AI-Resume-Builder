import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@airesume/ui";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Form-based editing, live preview, ATS-ready PDF exports, version history, and templates — everything in AIResume, a wtfbuilds product.",
};

const SECTIONS = [
  {
    title: "The editor",
    points: [
      "Three-pane workspace: section navigator, structured forms, live preview",
      "Drag-and-drop reordering for sections and entries",
      "Autosave with conflict protection — stale tabs can't clobber your work",
      "Local undo/redo with keyboard shortcuts",
    ],
  },
  {
    title: "The document",
    points: [
      "Preview and PDF render from one engine — they can never diverge",
      "Selectable-text PDFs with embedded fonts",
      "Letter and A4 page sizes with density controls",
      "Per-document accent color and font choices",
    ],
  },
  {
    title: "Reliability",
    points: [
      "Automatic version snapshots as you work",
      "Archive and trash with 30-day restore window",
      "JSON import/export — your data is portable by design",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
        Built like a tool, not a toy.
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-2)]">
        Most resume builders are wizards that lock your content into their idea of a resume.
        AIResume treats your resume like a document you own — a workspace you can return to,
        refine, and export with confidence.
      </p>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold text-[var(--ink)]">{s.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-[var(--ink-2)]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-14">
        <Link href="/sign-up">
          <Button size="lg">Start building — it&apos;s free</Button>
        </Link>
      </div>
    </div>
  );
}
