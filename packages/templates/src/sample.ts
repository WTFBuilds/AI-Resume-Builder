import { resumeConfigSchema, resumeDataSchema, type ResumeConfig, type ResumeData } from "./schema";

/**
 * Demo persona — Ahqaf Ali. Used for template previews, marketing
 * screenshots, and the editor's "start with sample content" action.
 * (Our equivalent of Overleaf's "Jake's Resume".)
 */
export const SAMPLE_DATA: ResumeData = resumeDataSchema.parse({
  basics: {
    name: "Ahqaf Ali",
    label: "Full-Stack Developer",
    email: "ahqaf.ali@example.com",
    phone: "+1 (555) 010-0100",
    location: "San Francisco, CA",
    url: "https://ahqaf.dev",
    profiles: [
      { network: "GitHub", username: "ahqaf", url: "https://github.com/ahqaf" },
      { network: "LinkedIn", username: "ahqaf", url: "https://linkedin.com/in/ahqaf" },
    ],
  },
  summary:
    "Full-stack developer with 4 years of experience shipping web products end to end. Focused on clean architecture, measurable outcomes, and shipping fast without breaking things.",
  education: [
    {
      id: "edu-1",
      school: "New York University",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startDate: "2020-08",
      endDate: "2024-07",
      grade: "GPA 3.8/4.0",
      highlights: [
        "Coursework: Distributed Systems, Databases, Machine Learning",
        "Teaching assistant for Data Structures (2 semesters)",
      ],
    },
  ],
  experience: [
    {
      id: "exp-1",
      company: "Northwind Labs",
      position: "Software Engineer",
      location: "San Francisco, CA",
      startDate: "2024-08",
      endDate: "",
      current: true,
      bullets: [
        "Built a real-time analytics dashboard used by 40+ enterprise customers, cutting report generation time from minutes to seconds",
        "Designed and shipped a REST API serving 2M+ daily requests with p95 latency under 120ms",
        "Led migration of a legacy monolith to modular services, reducing deploy time by 70%",
        "Mentored two interns through their first production releases",
      ],
    },
    {
      id: "exp-2",
      company: "Brightline Studio",
      position: "Frontend Engineer",
      location: "New York, NY",
      startDate: "2022-06",
      endDate: "2024-07",
      current: false,
      bullets: [
        "Rebuilt the marketing site in Next.js, improving Lighthouse performance from 54 to 98",
        "Implemented a component library adopted across 3 client projects",
        "Introduced end-to-end testing that caught regressions before every release",
      ],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "OpenLedger",
      description: "Self-hosted expense tracking for small teams.",
      url: "https://github.com/ahqaf/openledger",
      tech: ["TypeScript", "FastAPI", "PostgreSQL", "Docker"],
      startDate: "2023-10",
      endDate: "",
      bullets: ["2.1k GitHub stars; deployed by 300+ self-hosters", "Plugin system with 12 community extensions"],
    },
    {
      id: "proj-2",
      name: "Quizwhiz",
      description: "Spaced-repetition study app for university students.",
      url: "",
      tech: ["React", "Supabase"],
      startDate: "2022-02",
      endDate: "2023-01",
      bullets: ["Reached 5,000 monthly active students at launch"],
    },
  ],
  skills: [
    { id: "sk-1", name: "Languages", keywords: ["TypeScript", "Python", "SQL", "Go"] },
    { id: "sk-2", name: "Frameworks", keywords: ["React", "Next.js", "FastAPI", "Node.js"] },
    {
      id: "sk-3",
      name: "Tools",
      keywords: ["PostgreSQL", "Redis", "Docker", "AWS", "Terraform", "Git"],
    },
  ],
});

export const SAMPLE_CONFIG: ResumeConfig = resumeConfigSchema.parse({
  template: "classic",
  font: "template",
  density: "normal",
  pageSize: "letter",
});
