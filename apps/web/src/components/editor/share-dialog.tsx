"use client";

import { Check, Copy, Link2, Loader2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, EmptyState, Spinner } from "@airesume/ui";
import { timeAgo } from "@/lib/format";

interface ShareRow {
  id: string;
  token: string;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
}

/** Create / copy / revoke view-only share links (plan §9 Share). */
export function ShareDialog({ resumeId, onClose }: { resumeId: string; onClose: () => void }) {
  const [links, setLinks] = useState<ShareRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/resumes/${resumeId}/share`);
    if (!res.ok) {
      toast.error("Could not load share links");
      setLinks([]);
      return;
    }
    const body = await res.json();
    setLinks(body.links as ShareRow[]);
  }, [resumeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/share`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Could not create share link");
        return;
      }
      await navigator.clipboard?.writeText(`${window.location.origin}${body.url}`).catch(() => {});
      setCopiedId(body.shareId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Link created and copied — anyone with it can view this resume");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function copy(row: ShareRow) {
    await navigator.clipboard?.writeText(`${window.location.origin}/share/${row.token}`).catch(() => {});
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Link copied");
  }

  async function revoke(row: ShareRow) {
    const res = await fetch(`/api/resumes/${resumeId}/share/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not revoke link");
      return;
    }
    toast.success("Link revoked — it no longer works");
    await load();
  }

  const active = (links ?? []).filter((l) => !l.revoked);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--surface)]">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-[var(--accent)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Share</h2>
              <p className="text-xs text-[var(--muted)]">View-only link — visitors can read but not edit</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close share dialog" onClick={onClose}>
            <X />
          </Button>
        </header>

        <div className="border-b border-[var(--line)] px-5 py-3">
          <Button size="sm" onClick={create} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" /> : <Plus />} Create share link
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {links === null ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="text-[var(--muted)]" />
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              title="No share links"
              description="Create a link to let anyone view this resume read-only — no account needed. Revoke anytime."
            />
          ) : (
            <ul className="space-y-2">
              {active.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-2 rounded-(--radius) border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-[var(--ink)]">
                      /share/{l.token.slice(0, 10)}…
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      created {timeAgo(l.createdAt)}
                      {l.expiresAt ? ` · expires ${new Date(l.expiresAt).toLocaleDateString()}` : " · never expires"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={() => copy(l)}>
                    {copiedId === l.id ? <Check className="text-[var(--accent)]" /> : <Copy />}
                  </Button>
                  <Button variant="ghost-destructive" size="icon-sm" aria-label="Revoke link" onClick={() => revoke(l)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
