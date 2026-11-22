import { EMBEDDED_FONTS } from "./fonts.generated";

const FONTS: Record<string, string> = EMBEDDED_FONTS;

/**
 * Embedded print fonts (latin subsets, SIL OFL — see fonts/ directory).
 * Inlined as base64 into every rendered document so the live preview
 * (browser) and the PDF (Chromium on the worker) use byte-identical
 * typefaces regardless of what fonts either machine has installed.
 */
const FACE = (family: string, file: string, weight: string, style: string) => {
  const data = FONTS[file];
  if (!data) return "";
  return `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  src: url(data:font/woff2;base64,${data}) format("woff2");
}`;
};

export function embeddedFontCss(): string {
  return [
    FACE("Source Serif 4", "sourceserif4_400_normal", "400", "normal"),
    FACE("Source Serif 4", "sourceserif4_600_normal", "600", "normal"),
    FACE("Source Serif 4", "sourceserif4_700_normal", "700", "normal"),
    FACE("Source Serif 4", "sourceserif4_400_italic", "400", "italic"),
    FACE("Source Sans 3", "sourcesans3_400_normal", "400", "normal"),
    FACE("Source Sans 3", "sourcesans3_600_normal", "600", "normal"),
    FACE("Source Sans 3", "sourcesans3_700_normal", "700", "normal"),
    FACE("Source Sans 3", "sourcesans3_400_italic", "400", "italic"),
  ].join("\n");
}

/** Family stacks — embedded font first, system fallbacks after. */
export const SERIF_STACK = `"Source Serif 4", Georgia, "Times New Roman", serif`;
export const SANS_STACK = `"Source Sans 3", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
