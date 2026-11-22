import { z } from "zod";

/**
 * Resume document schema — JSON-Resume-compatible shape, stored as jsonb.
 * Every entry carries a client-side id so the editor can key/drag rows.
 * This schema is the single validation boundary for every write.
 */

const newId = () => crypto.randomUUID();

export const profileSchema = z.object({
  id: z.string().default(newId),
  network: z.string().default(""),
  username: z.string().default(""),
  url: z.string().default(""),
});

export const basicsSchema = z.object({
  name: z.string().default(""),
  label: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  url: z.string().default(""),
  profiles: z.array(profileSchema).default([]),
});

export const educationSchema = z.object({
  id: z.string().default(newId),
  school: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  startDate: z.string().default(""), // "YYYY-MM" | "YYYY"
  endDate: z.string().default(""),
  grade: z.string().default(""), // GPA / percentage — optional
  highlights: z.array(z.string()).default([]),
});

export const experienceSchema = z.object({
  id: z.string().default(newId),
  company: z.string().default(""),
  position: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});

export const projectSchema = z.object({
  id: z.string().default(newId),
  name: z.string().default(""),
  description: z.string().default(""),
  url: z.string().default(""),
  tech: z.array(z.string()).default([]),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const skillCategorySchema = z.object({
  id: z.string().default(newId),
  name: z.string().default(""), // e.g. "Languages", "Frameworks"
  keywords: z.array(z.string()).default([]),
});

export const customEntrySchema = z.object({
  id: z.string().default(newId),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  dateRange: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const customSectionSchema = z.object({
  id: z.string().default(newId),
  title: z.string().default("New section"),
  entries: z.array(customEntrySchema).default([]),
});

export const resumeDataSchema = z.object({
  basics: basicsSchema.default({}),
  summary: z.string().default(""),
  education: z.array(educationSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  skills: z.array(skillCategorySchema).default([]),
  custom: z.array(customSectionSchema).default([]),
});

/** Presentation config (per-document; never contains content). */
export const resumeConfigSchema = z.object({
  // "template" = defer to the template's own typeface
  font: z.enum(["template", "sans", "serif"]).default("template"),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Accent must be a hex color")
    .default("#166534"),
  density: z.enum(["compact", "normal", "relaxed"]).default("normal"),
  pageSize: z.enum(["letter", "a4"]).default("letter"),
  // Ordered section keys; empty = template default order.
  sectionOrder: z.array(z.string()).default([]),
  hiddenSections: z.array(z.string()).default([]),
});

export type Profile = z.infer<typeof profileSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SkillCategory = z.infer<typeof skillCategorySchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;
export type CustomEntry = z.infer<typeof customEntrySchema>;
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type ResumeConfig = z.infer<typeof resumeConfigSchema>;

export const ResumeDataSchema = resumeDataSchema;
export const ResumeConfigSchema = resumeConfigSchema;

export function emptyResumeData(): ResumeData {
  return resumeDataSchema.parse({});
}

export function defaultResumeConfig(): ResumeConfig {
  return resumeConfigSchema.parse({});
}

/* ── section ordering ────────────────────────────────────────────────────── */

export const CORE_SECTION_KEYS = [
  "basics",
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
] as const;

export type CoreSectionKey = (typeof CORE_SECTION_KEYS)[number];

export function resolveSectionOrder(data: ResumeData, config: ResumeConfig): string[] {
  const all = [
    ...CORE_SECTION_KEYS,
    ...data.custom.map((c) => `custom:${c.id}`),
  ];
  const ordered = config.sectionOrder.filter((key) => all.includes(key));
  const rest = all.filter((key) => !ordered.includes(key));
  const full = [...ordered, ...rest];
  const hidden = new Set(config.hiddenSections);
  return full.filter((key) => !hidden.has(key));
}

export function sectionTitle(key: string, data: ResumeData): string {
  switch (key) {
    case "basics":
      return "Personal information";
    case "summary":
      return "Summary";
    case "education":
      return "Education";
    case "experience":
      return "Experience";
    case "projects":
      return "Projects";
    case "skills":
      return "Skills";
    default: {
      if (key.startsWith("custom:")) {
        const id = key.slice("custom:".length);
        return data.custom.find((c) => c.id === id)?.title ?? "Custom section";
      }
      return key;
    }
  }
}

/* ── date formatting (shared by templates) ───────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(ym: string): string {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  if (!m) return y;
  const name = MONTHS[Number.parseInt(m, 10) - 1];
  return name ? `${name} ${y}` : y;
}

export function formatDateRange(start: string, end: string, current?: boolean): string {
  const s = formatMonth(start);
  const e = current ? "Present" : formatMonth(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** Strip protocol for print-friendly links: https://github.com/x → github.com/x */
export function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
