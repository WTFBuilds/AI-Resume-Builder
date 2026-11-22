"use client";

import { useMemo } from "react";
import { renderResumeHtml } from "@airesume/templates/render";
import type { ResumeConfig, ResumeData } from "@airesume/templates";

const PAGE_W = 816;
const PAGE_H = 1056;

/** Read-only public renderer — same engine as the editor preview. */
export function ShareView({
  data,
  config,
  templateId,
}: {
  data: ResumeData;
  config: ResumeConfig;
  templateId: string;
}) {
  const html = useMemo(
    () => renderResumeHtml({ data, config, templateSlug: templateId }),
    [data, config, templateId],
  );

  // fit A4/Letter to the window, min 0.4 for small screens
  const scale = typeof window === "undefined" ? 0.6 : Math.min(1, (window.innerWidth - 48) / PAGE_W);

  return (
    <div className="flex justify-center overflow-hidden px-3 py-8">
      <div style={{ height: PAGE_H * scale }} className="w-full">
        <iframe
          title="Shared resume"
          srcDoc={html}
          sandbox="allow-same-origin"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            display: "block",
            margin: "0 auto",
            background: "#fff",
            boxShadow: "var(--shadow-lg)",
          }}
        />
      </div>
    </div>
  );
}
