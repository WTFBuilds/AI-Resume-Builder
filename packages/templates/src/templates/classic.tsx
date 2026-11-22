import * as React from "react";

import { cleanUrl, formatDateRange, resolveSectionOrder } from "../schema";
import type { ResumeTemplate, TemplateProps } from "../types";
import { baseCss, densityMetrics, Doc, PAGE_SIZES, resolveFont } from "./shared";

function ClassicDocument({ data, config }: TemplateProps) {
  const metrics = densityMetrics(config.density);
  const page = PAGE_SIZES[config.pageSize];
  const contact = [
    data.basics.phone,
    data.basics.email,
    data.basics.location,
    ...data.basics.profiles.map((p) => cleanUrl(p.url || p.username)),
  ].filter(Boolean);

  const sections = resolveSectionOrder(data, config);

  const css = `
${baseCss({ page, font: resolveFont(config, "serif"), metrics, accent: config.accent })}
.header { text-align: center; margin-bottom: 1.5em; }
.header h1 { font-size: 2.05em; font-weight: 700; letter-spacing: 0.4px; }
.contact { margin-top: 0.4em; font-size: 0.88em; color: #333; }
.contact .sep { margin: 0 0.55em; color: #9a9a9a; }
.section { margin-bottom: 1.25em; }
.section > h2 {
  font-size: 0.92em;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  border-bottom: 1.4px solid #2b2b2b;
  padding-bottom: 0.32em;
  margin-bottom: 0.75em;
}
.entry { margin-bottom: 0.95em; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 1em; }
.entry .title { font-weight: 700; }
.entry .right { color: #333; white-space: nowrap; font-size: 0.92em; }
.entry .meta { font-style: italic; color: #444; margin-top: 0.12em; }
.entry .links { font-size: 0.88em; color: #333; margin-top: 0.1em; }
.entry ul { padding-left: 1.35em; margin-top: 0.4em; }
.entry p.desc { margin-top: 0.35em; }
.entry p.tech { font-style: italic; color: #555; margin-top: 0.12em; font-size: 0.9em; }
.skillline { margin-top: 0.28em; }
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
                {[e.degree, e.field].filter(Boolean).join(", ")}
                {e.grade ? ` — ${e.grade}` : ""}
              </div>
              {e.highlights.filter(Boolean).length > 0 ? (
                <ul>
                  {e.highlights.filter(Boolean).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {sections.includes("experience") && data.experience.length > 0 ? (
        <section className="section">
          <h2>Experience</h2>
          {data.experience.map((e) => (
            <div className="entry" key={e.id}>
              <div className="row">
                <span className="title">{e.position}</span>
                <span className="right">{formatDateRange(e.startDate, e.endDate, e.current)}</span>
              </div>
              <div className="meta">
                {[e.company, e.location].filter(Boolean).join(" — ")}
              </div>
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

      {sections.includes("projects") && data.projects.length > 0 ? (
        <section className="section">
          <h2>Projects</h2>
          {data.projects.map((p) => (
            <div className="entry" key={p.id}>
              <div className="row">
                <span className="title">
                  {p.name}
                  {p.tech.filter(Boolean).length > 0 ? (
                    <span className="tech"> — {p.tech.filter(Boolean).join(", ")}</span>
                  ) : null}
                </span>
                <span className="right">{formatDateRange(p.startDate, p.endDate)}</span>
              </div>
              {p.url ? <div className="links">{cleanUrl(p.url)}</div> : null}
              {p.description ? <p className="desc">{p.description}</p> : null}
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
          <h2>Technical skills</h2>
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

export const classicTemplate: ResumeTemplate = {
  slug: "classic",
  name: "Classic",
  category: "classic",
  description: "Centered serif layout with ruled section headings. The safest, most familiar look.",
  Document: ClassicDocument,
};
