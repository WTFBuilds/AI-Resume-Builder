import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--canvas)]">
      <header className="px-4 pt-6">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--ink-2)]">
          ← Back to airesume.com
        </Link>
      </footer>
    </div>
  );
}
