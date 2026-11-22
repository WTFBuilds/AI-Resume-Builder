"use client";

import { Download, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderResumeHtml } from "@airesume/templates/render";
import { Button } from "@airesume/ui";
import type { EditorStoreApi } from "./store";
import { useEditor } from "./store";

const PAGE_W = 816; // 8.5in @96dpi — A4 is 794, close enough for fit-width
const PAGE_H = 1056;

export function PreviewPane({ store }: { store: EditorStoreApi }) {
  const data = useEditor(store, (s) => s.data);
  const config = useEditor(store, (s) => s.config);
  const templateId = useEditor(store, (s) => s.templateId);
  const resumeId = useEditor(store, (s) => s.resumeId);

  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [html, setHtml] = useState("");
  const [downloading, setDownloading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const htmlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // fit-to-width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setFitWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // debounced render — the preview IS the export renderer
  const targetHtml = useMemo(
    () => renderResumeHtml({ data, config, templateSlug: templateId }),
    [data, config, templateId],
  );

  useEffect(() => {
    if (htmlTimer.current) clearTimeout(htmlTimer.current);
    htmlTimer.current = setTimeout(() => setHtml(targetHtml), 250);
    return () => {
      if (htmlTimer.current) clearTimeout(htmlTimer.current);
    };
  }, [targetHtml]);

  useEffect(
    () => () => {},
    [],
  );

  const scale = fitWidth > 0 ? (fitWidth / PAGE_W) * zoom : 0.5;

  /** Synchronous render: the web route streams the worker's PDF. */
  function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    try {
      store.getState().flush();
      window.location.href = `/api/resumes/${resumeId}/pdf`;
    } finally {
      // navigation keeps this page alive; re-enable after a grace period
      setTimeout(() => setDownloading(false), 6000);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[var(--surface-2)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Live preview
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          >
            <Minus />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-[var(--ink-2)]">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            <RotateCcw />
          </Button>
          <Button size="sm" onClick={downloadPdf} disabled={downloading} className="ml-1">
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            {downloading ? "Rendering…" : "Download PDF"}
          </Button>
        </div>
      </div>
      <div ref={wrapRef} className="flex-1 overflow-auto p-6">
        {html ? (
          <iframe
            title="Resume preview"
            srcDoc={html}
            sandbox="allow-same-origin"
            className="mx-auto block bg-white shadow-(--shadow-lg)"
            style={{
              width: PAGE_W,
              height: PAGE_H,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-[var(--muted)]" />
          </div>
        )}
      </div>
    </div>
  );
}
