import * as React from "react";

// server.browser build: works in the browser (preview iframe), during SSR of
// client components, and in Node (worker) — avoids Next's react-dom/server
// rule on the RSC layer.
import { renderToStaticMarkup } from "react-dom/server.browser";
import type { ResumeConfig, ResumeData } from "./schema";
import { TEMPLATES } from "./registry";

export interface RenderOptions {
  data: ResumeData;
  config: ResumeConfig;
  templateSlug: string;
}

/**
 * Render a resume to a complete, self-contained HTML document.
 * Single source of truth: the live preview displays exactly this string
 * (inside a sandboxed iframe) and the PDF worker prints exactly this
 * string — the two can never diverge.
 */
export function renderResumeHtml({ data, config, templateSlug }: RenderOptions): string {
  const tpl = TEMPLATES[templateSlug] ?? TEMPLATES.classic;
  const html = renderToStaticMarkup(<tpl.Document data={data} config={config} />);
  return `<!doctype html>${html}`;
}
