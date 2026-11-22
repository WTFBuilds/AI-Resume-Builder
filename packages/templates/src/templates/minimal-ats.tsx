import * as React from "react";

import {
  cleanUrl,
  formatDateRange,
  resolveSectionOrder,
} from "../schema";
import type { ResumeTemplate, TemplateProps } from "../types";
import { baseCss, densityMetrics, Doc, PAGE_SIZES, resolveFont } from "./shared";

/**
 * Maximum parser compatibility: no color, no columns, no italics for
 * critical content, plain uppercase headings, everything in one column.
 */
function MinimalDocument({ data, config }: TemplateProps) {
  const metrics = densityMetrics(config.density);
  const page = PAGE_SIZES[config.pageSize];
  const sections = resolveSectionOrder(data, config);

  const contact = [
    data.basics.phone,
    data.basics.email,
    data.basics.location,
    ...data.basics.profiles.map((p) => cleanUrl(p.url || p.username)),
  ].filter(Boolean);

  const css = `
${baseCss({ page, font: resolveFont(config, "sans"), metrics, accent: "#111111" })}
.header { margin-bottom: 1.3em; }
.header h1 { font-size: 1.5em; font-weight: 700; }
.contact { margin-top: 0.35em; font-size: 0.92em; color: #222; }
.contact .sep { margin: 0 0.45em; }
.section { margin-bottom: 1.15em; }
.section > h2 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-bottom: 0.6em;
}
.entry { margin-bottom: 0.85em; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 1em; }
.entry .title { font-weight: 700; }
.entry .right { white-space: nowrap; font-size: 0.92em; }
.entry .meta { margin-top: 0.12em; font-size: 0.95em; }
.entry ul { padding-left: 1.3em; margin-top: 0.35em; }
.skillline { margin-top: 0.25em; }
.skillline b { font-weight: 700; }
.summary { white-space: pre-line; }
`;

  return (
    <Doc title={data.basics.name ? `${data.basics.name} — Resume` : "Resume"} css={css}>
      <header className="header">
        <h1>{data.basics.name || "Your Name"}</h1>
        {data.basics.label ? <div className="contact">{data.basics.label}</div> : null}
        {contact.length > 0 ? (
          <div className="contact">
            {contact.map((c, i) => (
              <span key={i}>
                {i > 0 ? <span className="sep">|</span> : null}
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {sections.includes("summary") && data.summary ? (
        <section className="section">
          <h2>Summary</h2>
          <p className="summary">{data.summary}</p>
        </section>
      ) : null}

      {sections.includes("experience") && data.experience.length > 0 ? (
        <section className="section">
          <h2>Experience</h2>
          {data.experience.map((e) => (
            <div className="entry" key={e.id}>
              <div className="row">
                <span className="title">
                  {[e.position, e.company].filter(Boolean).join(", ")}
                </span>
                <span className="right">{formatDateRange(e.startDate, e.endDate, e.current)}</span>
              </div>
              {e.location ? <div className="meta">{e.location}</div> : null}
              {e.bullets.filter(Boolean).length > 0 ? (
                <ul>
                  {e.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {sections.includes("education") && data.education.length > 0 ? (
        <section className="section">
          <h2>Education</h2>
          {data.education.map((e) => (
            <div className="entry" key={e.id}>
              <div className="row">
                <span className="title">{e.school}</span>
                <span className="right">{formatDateRange(e.startDate, e.endDate)}</span>
              </div>
              <div className="meta">
                {[e.degree, e.field, e.grade].filter(Boolean).join(", ")}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {sections.includes("projects") && data.projects.length > 0 ? (
        <section className="section">
          <h2>Projects</h2>
          {data.projects.map((p) => (
            <div className="entry" key={p.id}>
              <div className="row">
                <span className="title">{p.name}</span>
                <span className="right">{formatDateRange(p.startDate, p.endDate)}</span>
              </div>
              {p.url ? <div className="meta">{cleanUrl(p.url)}</div> : null}
              {p.description ? <div className="meta">{p.description}</div> : null}
              {p.tech.filter(Boolean).length > 0 ? (
                <div className="meta">Technologies: {p.tech.filter(Boolean).join(", ")}</div>
              ) : null}
              {p.bullets.filter(Boolean).length > 0 ? (
                <ul>
                  {p.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {sections.includes("skills") && data.skills.length > 0 ? (
        <section className="section">
          <h2>Skills</h2>
          {data.skills.map((s) => (
            <p className="skillline" key={s.id}>
              {s.name ? <b>{s.name}: </b> : null}
              {s.keywords.filter(Boolean).join(", ")}
            </p>
          ))}
        </section>
      ) : null}

      {data.custom
        .filter((c) => sections.includes(`custom:${c.id}`) && c.entries.length > 0)
        .map((c) => (
          <section className="section" key={c.id}>
            <h2>{c.title}</h2>
            {c.entries.map((e) => (
              <div className="entry" key={e.id}>
                <div className="row">
                  <span className="title">{e.title}</span>
                  <span className="right">{e.dateRange}</span>
                </div>
                {e.subtitle ? <div className="meta">{e.subtitle}</div> : null}
                {e.bullets.filter(Boolean).length > 0 ? (
                  <ul>
                    {e.bullets.filter(Boolean).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </section>
        ))}
    </Doc>
  );
}

export const minimalAtsTemplate: ResumeTemplate = {
  slug: "minimal-ats",
  name: "Minimal ATS",
  category: "minimal",
  description: "Zero decoration, maximum parser compatibility. For automated screening.",
  Document: MinimalDocument,
};
