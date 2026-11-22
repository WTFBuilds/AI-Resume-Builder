import * as React from "react";

import type { ReactNode } from "react";
import type { ResumeConfig } from "../schema";

export const PAGE_SIZES = {
  letter: { w: 8.5, h: 11, css: "Letter" },
  a4: { w: 8.27, h: 11.69, css: "A4" },
} as const;

export const FONT_STACKS = {
  sans: `-apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`,
  serif: `Georgia, "Times New Roman", Times, serif`,
} as const;

export function resolveFont(config: ResumeConfig, templateDefault: "sans" | "serif"): string {
  return FONT_STACKS[config.font === "template" ? templateDefault : config.font];
}

export interface DensityMetrics {
  fs: string;
  lh: number;
  pad: string;
  gap: string;
}

export function densityMetrics(density: ResumeConfig["density"]): DensityMetrics {
  switch (density) {
    case "compact":
      return { fs: "9.5pt", lh: 1.32, pad: "0.5in", gap: "0.55rem" };
    case "relaxed":
      return { fs: "10.5pt", lh: 1.5, pad: "0.75in", gap: "1.05rem" };
    default:
      return { fs: "10pt", lh: 1.4, pad: "0.62in", gap: "0.85rem" };
  }
}

export interface DocOptions {
  title: string;
  css: string;
  children: ReactNode;
}

/** Wraps template content in the full print document (html/head/body). */
export function Doc({ title, css, children }: DocOptions) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}

/** Base reset + page geometry shared by every template. */
export function baseCss(opts: {
  page: (typeof PAGE_SIZES)[keyof typeof PAGE_SIZES];
  font: string;
  metrics: DensityMetrics;
  accent: string;
}): string {
  const { page, font, metrics } = opts;
  return `
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: ${page.css}; margin: 0; }
html, body { background: #fff; }
body {
  font-family: ${font};
  font-size: ${metrics.fs};
  line-height: ${metrics.lh};
  color: #1a1a1a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page {
  width: ${page.w}in;
  min-height: ${page.h}in;
  padding: ${metrics.pad};
  background: #fff;
}
ul { list-style: disc; }
li { margin-top: 0.22em; }
`;
}
