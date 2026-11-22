import Link from "next/link";
import { Logo } from "./logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">
              A focused resume workspace — structured forms, live preview, ATS-ready PDFs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Product
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link className="text-[var(--ink-2)] hover:text-[var(--ink)]" href="/features">Features</Link></li>
                <li><Link className="text-[var(--ink-2)] hover:text-[var(--ink)]" href="/templates">Templates</Link></li>
                <li><Link className="text-[var(--ink-2)] hover:text-[var(--ink)]" href="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Get started
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link className="text-[var(--ink-2)] hover:text-[var(--ink)]" href="/sign-up">Create account</Link></li>
                <li><Link className="text-[var(--ink-2)] hover:text-[var(--ink)]" href="/sign-in">Sign in</Link></li>
                <li><Link className="text-[var(--ink-2)] hover:text-[var(--ink)]" href="/dashboard">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Company
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><span className="text-[var(--ink-2)]">A wtfbuilds product</span></li>
                <li><span className="text-[var(--ink-2)]">© {new Date().getFullYear()} AIResume</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
