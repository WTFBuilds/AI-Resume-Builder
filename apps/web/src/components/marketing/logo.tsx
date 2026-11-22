import Link from "next/link";
import { cn } from "@airesume/ui";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 rounded-(--radius-sm)">
      <span className="flex size-6 items-center justify-center rounded-(--radius-sm) bg-[var(--accent)]">
        <svg viewBox="0 0 32 32" className="size-4" aria-hidden>
          <path
            d="M8 8h16M8 13h16M8 18h9M8 23h12M8 28h7"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            transform="scale(1) translate(0, -2)"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="text-[17px] font-bold tracking-tight text-[var(--ink)]">
          AI<span className="text-[var(--accent)]">Resume</span>
        </span>
      ) : null}
    </Link>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[17px] font-bold tracking-tight", className)}>
      AI<span className="text-[var(--accent)]">Resume</span>
    </span>
  );
}
