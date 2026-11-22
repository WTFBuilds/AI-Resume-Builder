import {
  ArrowRight,
  Eye,
  FileText,
  History,
  LayoutTemplate,
  ShieldCheck,
  Type,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@airesume/ui";
import { ResumePreviewFrame } from "@/components/marketing/resume-preview-frame";

const FEATURES = [
  {
    icon: Type,
    title: "Form-based editing",
    body: "Fill structured fields — education, experience, projects, skills — with drag-and-drop ordering. No markup, no code, nothing to break.",
  },
  {
    icon: Eye,
    title: "Live preview",
    body: "The rendered document updates as you type. What you see is byte-for-byte what downloads — one renderer, zero surprises.",
  },
  {
    icon: FileText,
    title: "ATS-ready exports",
    body: "Pixel-perfect PDFs with selectable text, standard section names, and single-column safe layouts that applicant tracking systems parse.",
  },
  {
    icon: History,
    title: "Version history",
    body: "Every save is snapshotted automatically. Compare, revisit, and restore any point in your resume's life.",
  },
  {
    icon: LayoutTemplate,
    title: "Templates, not themes",
    body: "Four typographically disciplined templates. Switch anytime — your content never moves.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    body: "Export the raw JSON anytime. Delete your account and everything goes with it, within 24 hours.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <p className="mb-3 inline-flex items-center rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                Free during beta
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
                Build a resume that gets you hired.
              </h1>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--ink-2)] sm:text-base">
                AIResume is a focused resume workspace — structured forms instead of
                fiddly code, a live preview that updates as you type, and
                pixel-perfect, ATS-ready PDF exports.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/sign-up">
                  <Button size="lg">
                    Start building — it&apos;s free <ArrowRight />
                  </Button>
                </Link>
                <Link href="/templates">
                  <Button variant="secondary" size="lg">
                    Browse templates
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                No credit card required. Your first resume takes about ten minutes.
              </p>
            </div>
            <ResumePreviewFrame className="hidden lg:block" url="app.airesume.com/resume/8f2c" />
            <ResumePreviewFrame className="lg:hidden" url="app.airesume.com/resume/8f2c" />
          </div>
        </div>
      </section>

      {/* How it works strip */}
      <section className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            ["1", "Pick a template", "Four disciplined layouts. Switch anytime without losing content."],
            ["2", "Fill the forms", "Structured sections with drag-to-reorder. The preview follows every keystroke."],
            ["3", "Download the PDF", "One click. Selectable text, clean headings, parsed by every major ATS."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                {n}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink)]">{t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-2)]">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Everything a serious resume needs.
        </h2>
        <p className="mt-2 max-w-xl text-[15px] text-[var(--ink-2)]">
          Nothing you don&apos;t. No wizard, no clutter — a calm, professional tool built for
          people who iterate on their resume more than once a year.
        </p>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="flex size-9 items-center justify-center rounded-(--radius) border border-[var(--line)] bg-[var(--surface)] shadow-(--shadow-sm)">
                <f.icon className="size-4 text-[var(--accent)]" />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-[var(--ink)]">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-2)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Your next opportunity starts with one page.
          </h2>
          <p className="mt-2 max-w-md text-[15px] text-[var(--ink-2)]">
            Make it the best-written page about you. AIResume handles the formatting.
          </p>
          <Link href="/sign-up" className="mt-6">
            <Button size="lg">
              Create your free account <ArrowRight />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
