"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@airesume/ui";
import { Logo } from "./logo";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--canvas)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-(--radius-sm) px-3 py-1.5 text-sm text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Button size="sm" onClick={() => (window.location.href = "/dashboard")}>
              Open dashboard
            </Button>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-(--radius-sm) px-3 py-1.5 text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                Sign in
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="rounded-(--radius-sm) p-2 text-[var(--ink-2)] hover:bg-[var(--surface-2)] md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-(--radius-sm) px-3 py-2.5 text-sm text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-[var(--line)] pt-3">
            {signedIn ? (
              <Link href="/dashboard" className="w-full">
                <Button size="sm" className="w-full">
                  Open dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up" className="flex-1">
                  <Button size="sm" className="w-full">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
