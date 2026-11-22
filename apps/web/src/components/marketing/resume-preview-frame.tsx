"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderResumeHtml } from "@airesume/templates/render";
import { SAMPLE_CONFIG, SAMPLE_DATA } from "@airesume/templates";

/**
 * Renders a live, real template output inside browser chrome —
 * marketing shows the actual product renderer, not a screenshot.
 */
export function ResumePreviewFrame({
  templateSlug = "classic",
  scale = "fit",
  chrome = true,
  url = "app.airesume.com/resume/8f2c",
  maxWidth,
  className,
}: {
  templateSlug?: string;
  scale?: "fit" | number;
  chrome?: boolean;
  url?: string;
  maxWidth?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const html = useMemo(
    () => renderResumeHtml({ data: SAMPLE_DATA, config: { ...SAMPLE_CONFIG }, templateSlug }),
    [templateSlug],
  );

  useEffect(() => {
    if (scale !== "fit") return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [scale]);

  const PAGE_W = 816; // 8.5in at 96dpi
  const PAGE_H = 1056;
  const effectiveScale =
    scale === "fit"
      ? containerWidth > 0
        ? Math.min(1, containerWidth / PAGE_W)
        : 0.4
      : scale;
  const scaledH = PAGE_H * effectiveScale;
  const inner = maxWidth ? Math.min(maxWidth, PAGE_W) : PAGE_W;

  return (
    <div className={className}>
      {chrome ? (
        <div className="flex items-center gap-2 rounded-t-(--radius-lg) border border-b-0 border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 truncate rounded-(--radius-sm) bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--ink-2)]">
            {url}
          </span>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={
          chrome
            ? "overflow-hidden rounded-b-(--radius-lg) border border-[var(--line-strong)] bg-[var(--surface-2)]"
            : "overflow-hidden rounded-(--radius-lg) border border-[var(--line-strong)] bg-[var(--surface-2)]"
        }
      >
        <div style={{ height: scaledH }} className="overflow-hidden">
          <iframe
            title="AIResume live template preview"
            srcDoc={html}
            sandbox="allow-same-origin"
            style={{
              width: inner,
              height: PAGE_H,
              border: 0,
              transform: `scale(${effectiveScale})`,
              transformOrigin: "top left",
              display: "block",
              background: "#fff",
            }}
          />
        </div>
      </div>
    </div>
  );
}
