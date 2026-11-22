"use client";

import { History, Loader2, RotateCcw, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, EmptyState, Spinner } from "@airesume/ui";
import { timeAgo } from "@/lib/format";
import type { EditorStoreApi } from "./store";
import { useEditor } from "./store";

interface VersionRow {
  id: string;
  label: string | null;
  auto: boolean;
  title: string | null;
  createdAt: string;
}

/** Slide-over listing version snapshots with restore (plan §9 History). */
export function HistoryPanel({ store, onClose }: { store: EditorStoreApi; onClose: () => void }) {
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const saveState = useEditor(store, (s) => s.saveState);

  const load = useCallback(async () => {
    // flush pending edits first so the newest state is snapshotted/listable
    await store.getState().flush();
    const res = await fetch(`/api/resumes/${store.getState().resumeId}/versions`);
    if (!res.ok) {
      toast.error("Could not load version history");
      setVersions([]);
      return;
    }
    const body = await res.json();
    setVersions(body.versions as VersionRow[]);
  }, [store]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveVersion() {
    setSaving(true);
    try {
      await store.getState().flush();
      const res = await fetch(`/api/resumes/${store.getState().resumeId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Saved ${new Date().toLocaleTimeString()}` }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not save version");
        return;
      }
      toast.success("Version saved");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function restore(version: VersionRow) {
    setRestoringId(version.id);
    try {
      // fetch the full snapshot for this version
      const res = await fetch(`/api/resumes/${store.getState().resumeId}/versions/${version.id}`);
      if (!res.ok) {
        toast.error("Could not load the version snapshot");
        return;
      }
      const body = await res.json();
      const snap = body.snapshot as { title?: string; data?: unknown; config?: unknown } | undefined;
      if (!snap?.data) {
        toast.error("Version snapshot is empty");
        return;
      }
      store.getState().restoreSnapshot({
        title: snap.title ?? store.getState().title,
        data: snap.data as never,
        config: snap.config as never,
      });
      toast.success(`Restored version from ${timeAgo(version.createdAt)}`);
      onClose();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--surface)]">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="size-4 text-[var(--accent)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Version history</h2>
              <p className="text-xs text-[var(--muted)]">
                Automatic snapshots while you work · {saveState === "saved" ? "all changes saved" : "unsaved changes"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close history" onClick={onClose}>
            <X />
          </Button>
        </header>

        <div className="border-b border-[var(--line)] px-5 py-3">
          <Button size="sm" onClick={saveVersion} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save version now
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {versions === null ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="text-[var(--muted)]" />
            </div>
          ) : versions.length === 0 ? (
            <EmptyState
              title="No versions yet"
              description="Snapshots are taken automatically every few minutes while you edit, and every time you save a version."
            />
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 rounded-(--radius) border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--ink)]">
                      {v.label ?? v.title ?? "Untitled"}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {timeAgo(v.createdAt)} · {v.auto ? "auto snapshot" : "manual save"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restore(v)}
                    disabled={restoringId !== null}
                  >
                    {restoringId === v.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                    Restore
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
