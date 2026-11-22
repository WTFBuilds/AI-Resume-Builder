import type { ComponentType } from "react";
import type { ResumeConfig, ResumeData } from "./schema";

export interface TemplateProps {
  data: ResumeData;
  config: ResumeConfig;
}

export interface ResumeTemplateMeta {
  slug: string;
  name: string;
  category: "classic" | "modern" | "compact" | "minimal";
  description: string;
}

/**
 * A template renders the COMPLETE print document (html/head/body) so that
 * the exact same output feeds the live preview (browser iframe) and the
 * PDF export (Puppeteer on the worker). Must be a pure server-renderable
 * component: no hooks, no browser APIs.
 */
export interface ResumeTemplate extends ResumeTemplateMeta {
  Document: ComponentType<TemplateProps>;
}
