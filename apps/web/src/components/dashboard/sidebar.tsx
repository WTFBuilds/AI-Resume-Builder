"use client";

import {
  Archive,
  FileText,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authClient, signOut } from "@airesume/auth/client";
import { Badge, Button, Dropdown, MenuItem, MenuLabel, MenuSeparator } from "@airesume/ui";
import { NewResumeDialog } from "./new-resume-dialog";
import { useTheme } from "./theme-toggle";
import { useEffect, useState } from "react";

interface SidebarProps {
  user: { name: string; email: string };
  tags: { id: string; name: string }[];
}

export function DashboardSidebar({ user, tags }: SidebarProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeTag = params.get("tag");
  const newParam = params.get("new");
  const [newOpen, setNewOpen] = useState(false);
  const { theme, toggle } = useTheme();

  // /dashboard?new=1 (toolbar button) or ?new=<slug> (from /templates) opens the picker
  useEffect(() => {
    if (newParam) setNewOpen(true);
  }, [newParam]);

  const link = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link
      href={href}
      className={[
        "flex items-center gap-2.5 rounded-(--radius) px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
          : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] md:flex">
        <div className="px-4 pb-2 pt-4">
          <Link href="/">
            <span className="text-[17px] font-bold tracking-tight text-[var(--ink)]">
              AI<span className="text-[var(--accent)]">Resume</span>
            </span>
          </Link>
        </div>

        <div className="px-3 pb-3">
          <Button className="w-full" onClick={() => setNewOpen(true)}>
            <Plus /> New resume
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {link("/dashboard", "All resumes", <FileText />, pathname === "/dashboard" && !activeTag)}
          {link("/dashboard/archive", "Archive", <Archive />, pathname === "/dashboard/archive")}
          {link("/dashboard/trash", "Trash", <Trash2 />, pathname === "/dashboard/trash")}

          {tags.length > 0 ? (
            <>
              <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Tags
              </div>
              {tags.map((t) =>
                link(`/dashboard?tag=${t.id}`, t.name, <Tag className="size-4" />, activeTag === t.id),
              )}
            </>
          ) : null}
        </nav>

        <div className="border-t border-[var(--line)] p-3">
          <Dropdown
            width={220}
            trigger={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-(--radius) px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                    {user.name}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--muted)]">
                    Free plan
                  </span>
                </span>
              </button>
            }
          >
            <MenuLabel>{user.email}</MenuLabel>
            <MenuItem icon={<Settings />} onSelect={() => (window.location.href = "/settings")}>
              Account settings
            </MenuItem>
            <MenuItem
              icon={theme === "dark" ? <Sun /> : <Moon />}
              onSelect={toggle}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<LogOut />}
              danger
              onSelect={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
            >
              Sign out
            </MenuItem>
          </Dropdown>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <Link href="/">
          <span className="text-[16px] font-bold tracking-tight text-[var(--ink)]">
            AI<span className="text-[var(--accent)]">Resume</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus /> New
          </Button>
        </div>
      </div>

      <NewResumeDialog
        open={newOpen}
        onOpenChange={(v) => {
          setNewOpen(v);
          if (!v && newParam) {
            // clean the ?new= param so a refresh doesn't reopen the picker
            window.history.replaceState(null, "", pathname + (activeTag ? `?tag=${activeTag}` : ""));
          }
        }}
        initialTemplate={newParam && newParam !== "1" ? newParam : undefined}
      />
    </>
  );
}
