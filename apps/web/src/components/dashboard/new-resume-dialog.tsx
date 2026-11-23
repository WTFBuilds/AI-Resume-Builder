"use client";

import { Braces, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TEMPLATE_LIST } from "@airesume/templates";
import { Button, Dialog, Input } from "@airesume/ui";
import { ResumePreviewFrame } from "@/components/marketing/resume-preview-frame";

/**
 * Template picker — the "New project" flow of the dashboard.
 * One live preview iframe (for the SELECTED template only) + compact
 * selector buttons, so typing in the title never re-renders heavy iframes.
 * The title input is deliberately UNCONTROLLED (ref) — zero React work per
 * keystroke. Also accepts a JSON import (AIResume / JSON-Resume).
 */
export function NewResumeDialog({
  open,
  onOpenChange,
  initialTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTemplate?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("classic");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && initialTemplate) setSelected(initialTemplate);
  }, [open, initialTemplate]);

  function getTitle() {
    return titleRef.current?.value.trim() || "Untitled resume";
  }

  function finish(body: { id: string }) {
    onOpenChange(false);
    router.push(`/resume/${body.id}`);
  }

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected, title: getTitle() }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Could not create resume");
        return;
      }
      finish(body);
    } finally {
      setCreating(false);
    }
  }

  async function importJson(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error("That file isn't valid JSON");
        return;
      }
      const payload =
        typeof parsed === "object" && parsed !== null && "data" in parsed
          ? (parsed as { data?: unknown; title?: string })
          : { data: parsed };
      const res = await fetch("/api/resumes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title ?? (getTitle() !== "Untitled resume" ? getTitle() : file.name.replace(/\.json$/i, "")),
          templateId: selected,
          data: payload.data,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Import failed");
        return;
      }
      toast.success("Resume imported");
      finish(body);
    } finally {
      setImporting(false);
    }
  }

  const selectedTpl = TEMPLATE_LIST.find((t) => t.slug === selected) ?? TEMPLATE_LIST[0];

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="New resume"
      description="Pick a starting template — you can switch anytime without losing content."
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" /> : null} Create resume
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <div className="space-y-1.5">
          {TEMPLATE_LIST.map((tpl) => (
            <button
              key={tpl.slug}
              type="button"
              onClick={() => setSelected(tpl.slug)}
              className={[
                "w-full rounded-(--radius) border px-3 py-2 text-left transition-colors",
                selected === tpl.slug
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]",
              ].join(" ")}
              aria-pressed={selected === tpl.slug}
            >
              <div className="text-[13px] font-medium text-[var(--ink)]">{tpl.name}</div>
              <div className="truncate text-[11px] text-[var(--muted)]">{tpl.category}</div>
            </button>
          ))}

          <div className="space-y-1.5 pt-2">
            <Input
              data-autofocus
              ref={titleRef}
              placeholder="Resume title (e.g. Software Engineer — 2026)"
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
              }}
            />
            <p className="text-[11px] text-[var(--muted)]">
              Internal name only — employers never see it.
            </p>
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--line)] pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="animate-spin" /> : <Braces />} Import JSON
            </Button>
            <span className="text-[11px] text-[var(--muted)]">AIResume or JSON-Resume file.</span>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importJson(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div>
          <ResumePreviewFrame templateSlug={selectedTpl.slug} chrome={false} scale={0.22} />
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
            {selectedTpl.description}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
