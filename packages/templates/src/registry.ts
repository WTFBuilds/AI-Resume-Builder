import type { ResumeTemplate } from "./types";
import { classicTemplate } from "./templates/classic";
import { modernTemplate } from "./templates/modern";
import { compactTwoColumnTemplate } from "./templates/compact-two-column";
import { minimalAtsTemplate } from "./templates/minimal-ats";

export const TEMPLATES: Record<string, ResumeTemplate> = {
  classic: classicTemplate,
  modern: modernTemplate,
  "compact-two-column": compactTwoColumnTemplate,
  "minimal-ats": minimalAtsTemplate,
};

export const TEMPLATE_LIST: ResumeTemplate[] = Object.values(TEMPLATES);

export function getTemplate(slug: string): ResumeTemplate | undefined {
  return TEMPLATES[slug];
}
