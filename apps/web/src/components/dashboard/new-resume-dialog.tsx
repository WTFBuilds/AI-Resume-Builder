"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TEMPLATE_LIST } from "@airesume/templates";
import { Button, Dialog, Input } from "@airesume/ui";
import { ResumePreviewFrame } from "@/components/marketing/resume-preview-frame";

/**
 * Template picker — the "New project" flow of the dashboard.
 * `initialTemplate` preselects a card (e.g. arriving from /templates?new=slug).
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
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && initialTemplate) setSelected(initialTemplate);
  }, [open, initialTemplate]);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected, title: title.trim() || "Untitled resume" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Could not create resume");
        return;
      }
      // navigate FIRST — the dialog's close-side cleanup must not race the push
      router.push(`/resume/${body.id}`);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  }

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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEMPLATE_LIST.map((tpl) => (
            <button
              key={tpl.slug}
              type="button"
              onClick={() => setSelected(tpl.slug)}
              className={[
                "overflow-hidden rounded-(--radius) border text-left transition-all",
                selected === tpl.slug
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
                  : "border-[var(--line)] hover:border-[var(--line-strong)]",
              ].join(" ")}
              aria-pressed={selected === tpl.slug}
            >
              <ResumePreviewFrame templateSlug={tpl.slug} chrome={false} scale={0.165} />
              <div className="px-2 py-1.5 text-[11px] font-medium text-[var(--ink)]">{tpl.name}</div>
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resume title (e.g. Software Engineer — 2026)"
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
          <p className="text-[11px] text-[var(--muted)]">
            Internal name only — employers never see it.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
