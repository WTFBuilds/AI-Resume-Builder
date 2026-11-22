"use client";

import {
  ArrowLeft,
  Check,
  CloudOff,
  Clock,
  Download,
  History,
  Loader2,
  Redo2,
  Share2,
  Sparkles,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Select } from "@airesume/ui";
import {
  SAMPLE_DATA,
  sectionTitle,
  TEMPLATE_LIST,
  resolveSectionOrder,
} from "@airesume/templates";
import { clockTime } from "@/lib/format";
import { HistoryPanel } from "./history-panel";
import { ShareDialog } from "./share-dialog";
import { PreviewPane } from "./preview-pane";
import { SectionNav } from "./section-nav";
import { SectionForm } from "./section-forms";
import { createEditorStore, useEditor, type EditorDoc } from "./store";

export function EditorClient({
  resumeId,
  doc,
  updatedAt,
}: {
  resumeId: string;
  doc: EditorDoc;
  updatedAt: string;
}) {
  const storeRef = useRef(createEditorStore({ resumeId, doc, updatedAt }));
  const store = storeRef.current;

  const saveState = useEditor(store, (s) => s.saveState);
  const title = useEditor(store, (s) => s.title);
  const updatedAtState = useEditor(store, (s) => s.updatedAt);
  const data = useEditor(store, (s) => s.data);
  const config = useEditor(store, (s) => s.config);
  const templateId = useEditor(store, (s) => s.templateId);
  const past = useEditor(store, (s) => s.past.length);
  const future = useEditor(store, (s) => s.future.length);
  const revision = useEditor(store, (s) => s.revision);
  const conflictServer = useEditor(store, (s) => s.conflictServer);

  const [activeKey, setActiveKey] = useState("basics");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // keyboard shortcuts + unsaved-changes guard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        void store.getState().flush();
      } else if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.getState().undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        store.getState().redo();
      }
    }
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (["dirty", "saving", "error"].includes(store.getState().saveState)) {
        e.preventDefault();
      }
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [store]);

  const ordered = resolveSectionOrder(data, config);

  function selectSection(key: string) {
    setActiveKey(key);
    setMobileTab("edit");
    requestAnimationFrame(() => {
      document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function loadSample() {
    const sample = structuredClone(SAMPLE_DATA);
    store.getState().update((d) => {
      Object.assign(d, sample);
    });
    toast.success("Sample content loaded — make it yours");
  }

  const docIsEmpty =
    !data.basics.name &&
    !data.summary &&
    data.education.length === 0 &&
    data.experience.length === 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--canvas)]">
      {/* top bar */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-3">
        <Link
          href="/dashboard"
          className="rounded-(--radius-sm) p-1.5 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <input
          value={title}
          onChange={(e) => store.getState().setTitle(e.target.value)}
          className="min-w-0 max-w-64 flex-1 truncate rounded-(--radius-sm) bg-transparent px-2 py-1 text-sm font-semibold text-[var(--ink)] outline-none hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)]"
          aria-label="Resume title"
        />

        <SaveIndicator state={saveState} updatedAt={updatedAtState} onRetry={() => void store.getState().flush()} />

        <div className="mx-1 hidden items-center gap-0.5 sm:flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            onClick={() => store.getState().undo()}
            disabled={past === 0}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            onClick={() => store.getState().redo()}
            disabled={future === 0}
          >
            <Redo2 />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* document options — desktop only; mobile lives in preview bar */}
          <div className="hidden items-center gap-1.5 xl:flex">
            <Select
              value={templateId}
              onChange={(e) => store.getState().setTemplate(e.target.value)}
              className="h-8 w-32 text-xs"
              aria-label="Template"
            >
              {TEMPLATE_LIST.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select
              value={config.font}
              onChange={(e) => store.getState().patchConfig({ font: e.target.value as typeof config.font })}
              className="h-8 w-28 text-xs"
              aria-label="Font"
            >
              <option value="template">Template font</option>
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
            </Select>
            <Select
              value={config.density}
              onChange={(e) =>
                store.getState().patchConfig({ density: e.target.value as typeof config.density })
              }
              className="h-8 w-28 text-xs"
              aria-label="Density"
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
            </Select>
            <label className="flex items-center gap-1" title="Accent color">
              <input
                type="color"
                value={config.accent}
                onChange={(e) => store.getState().patchConfig({ accent: e.target.value })}
                className="size-7 cursor-pointer rounded-(--radius-sm) border border-[var(--line)] bg-[var(--surface)] p-0.5"
              />
            </label>
          </div>

          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setHistoryOpen(true)}>
            <History /> History
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setShareOpen(true)}>
            <Share2 /> Share
          </Button>
        </div>
      </header>

      {/* conflict banner */}
      {saveState === "conflict" && conflictServer ? (
        <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--warning-soft)] px-4 py-2 text-sm text-[var(--warning)]">
          <TriangleAlert className="size-4 shrink-0" />
          <span className="flex-1">
            This resume changed in another tab or window since you started editing.
          </span>
          <Button size="sm" variant="secondary" onClick={() => store.getState().resolveConflict("mine")}>
            Keep my version
          </Button>
          <Button size="sm" variant="destructive" onClick={() => store.getState().resolveConflict("theirs")}>
            Use the other version
          </Button>
        </div>
      ) : null}

      {/* panes */}
      <div className="flex min-h-0 flex-1">
        <div className={mobileTab === "edit" ? "flex min-w-0 flex-1" : "hidden"}>
          <div className="hidden lg:flex">
            <SectionNav store={store} activeKey={activeKey} onSelect={setActiveKey} />
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
              {docIsEmpty ? (
                <div className="flex items-center justify-between gap-3 rounded-(--radius-lg) border border-dashed border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3">
                  <p className="text-sm text-[var(--ink-2)]">
                    Blank page syndrome? Start from a complete sample resume.
                  </p>
                  <Button variant="soft" size="sm" onClick={loadSample}>
                    <Sparkles /> Load sample
                  </Button>
                </div>
              ) : null}

              {ordered.map((key) => (
                <section
                  key={`${key}:${revision}`}
                  id={`sec-${key}`}
                  className="scroll-mt-4 rounded-(--radius-lg) border border-[var(--line)] bg-[var(--surface)] shadow-(--shadow-sm)"
                >
                  <h2 className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
                    {sectionTitle(key, data)}
                  </h2>
                  <div className="p-4">
                    <SectionForm store={store} sectionKey={key} data={data} />
                  </div>
                </section>
              ))}
              <p className="pb-4 text-center text-xs text-[var(--muted)]">
                Everything saves automatically · ⌘S to save now · ⌘Z to undo
              </p>
            </div>
          </div>
        </div>

        <div
          className={
            mobileTab === "preview"
              ? "flex min-w-0 flex-1 lg:w-[45%] lg:max-w-[720px] lg:flex-none"
              : "hidden lg:flex lg:w-[45%] lg:max-w-[720px] lg:flex-none"
          }
        >
          <PreviewPane store={store} />
        </div>
      </div>

      {/* mobile tab switch */}
      <div className="flex shrink-0 border-t border-[var(--line)] bg-[var(--surface)] p-1.5 lg:hidden">
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={[
              "flex-1 rounded-(--radius) py-2 text-sm font-medium capitalize transition-colors",
              mobileTab === tab
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--ink-2)]",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {historyOpen ? <HistoryPanel store={store} onClose={() => setHistoryOpen(false)} /> : null}
      {shareOpen ? <ShareDialog resumeId={resumeId} onClose={() => setShareOpen(false)} /> : null}
    </div>
  );
}

function SaveIndicator({
  state,
  updatedAt,
  onRetry,
}: {
  state: "saved" | "dirty" | "saving" | "error" | "conflict";
  updatedAt: string;
  onRetry: () => void;
}) {
  const content = (() => {
    switch (state) {
      case "saving":
        return (
          <>
            <Loader2 className="size-3.5 animate-spin text-[var(--muted)]" />
            <span className="text-[var(--ink-2)]">Saving…</span>
          </>
        );
      case "dirty":
        return (
          <>
            <Clock className="size-3.5 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">Unsaved changes</span>
          </>
        );
      case "error":
        return (
          <>
            <CloudOff className="size-3.5 text-[var(--danger)]" />
            <button
              type="button"
              onClick={onRetry}
              className="text-[var(--danger)] underline underline-offset-2"
            >
              Offline — retry
            </button>
          </>
        );
      case "conflict":
        return (
          <>
            <TriangleAlert className="size-3.5 text-[var(--warning)]" />
            <span className="text-[var(--warning)]">Conflict</span>
          </>
        );
      default:
        return (
          <>
            <Check className="size-3.5 text-[var(--accent)]" />
            <span className="text-[var(--muted)]">Saved {clockTime(updatedAt)}</span>
          </>
        );
    }
  })();
  return (
    <span
      className="ml-1 hidden items-center gap-1.5 text-xs md:flex"
      aria-live="polite"
      aria-label={`Save status: ${state}`}
    >
      {content}
    </span>
  );
}
