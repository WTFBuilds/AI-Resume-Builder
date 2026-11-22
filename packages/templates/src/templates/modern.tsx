import * as React from "react";

import {
  cleanUrl,
  formatDateRange,
  resolveSectionOrder,
} from "../schema";
import type { ResumeTemplate, TemplateProps } from "../types";
import { baseCss, densityMetrics, Doc, PAGE_SIZES, resolveFont } from "./shared";

function ModernDocument({ data, config }: TemplateProps) {
  const metrics = densityMetrics(config.density);
  const page = PAGE_SIZES[config.pageSize];
  const accent = config.accent;
  const contact = [
    data.basics.phone,
    data.basics.email,
    data.basics.location,
    data.basics.url,
    ...data.basics.profiles.map((p) => cleanUrl(p.url || p.username)),
  ].filter(Boolean);

  const sections = resolveSectionOrder(data, config);

  const css = `
${baseCss({ page, font: resolveFont(config, "sans"), metrics, accent })}
.header { margin-bottom: 1.4em; }
.header h1 { font-size: 1.9em; font-weight: 750; letter-spacing: -0.2px; }
.header .label { margin-top: 0.2em; color: ${accent}; font-weight: 600; font-size: 1em; }
.contact { margin-top: 0.45em; font-size: 0.88em; color: #444; }
.contact .sep { margin: 0 0.5em; color: #c4c9c4; }
.section { margin-bottom: 1.3em; }
.section > h2 {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: ${accent};
  border-bottom: 2px solid ${accent};
  padding-bottom: 0.3em;
  margin-bottom: 0.8em;
}
.entry { margin-bottom: 1em; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 1em; }
.entry .title { font-weight: 700; }
.entry .company { color: ${accent}; font-weight: 600; }
.entry .right { color: #666; white-space: nowrap; font-size: 0.9em; }
.entry .meta { color: #555; margin-top: 0.15em; font-size: 0.92em; }
.entry ul { padding-left: 1.35em; margin-top: 0.4em; }
.entry li::marker { color: ${accent}; }
.entry p.desc { margin-top: 0.35em; color: #333; }
.entry p.tech { color: #666; margin-top: 0.15em; font-size: 0.88em; }
.skillline { margin-top: 0.3em; }
.skillline b { font-weight: 650; }
.skillline .kw::after { content: ", "; color: #999; }
.skillline .kw:last-child::after { content: ""; }
.summary { white-space: pre-line; color: #2a2a2a; }
`;

  return (
    <Doc title={data.basics.name ? `${data.basics.name} — Resume` : "Resume"} css={css}>
      <header className="header">
        <h1>{data.basics.name || "Your Name"}</h1>
        {data.basics.label ? <div className="label">{data.basics.label}</div> : null}
        {contact.length > 0 ? (
          <div className="contact">
            {contact.map((c, i) => (
              <span key={i}>
                {i > 0 ? <span className="sep">•</span> : null}
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
                  {e.position}
                  {e.company ? (
                    <>
                      {" "}
                      · <span className="company">{e.company}</span>
                    </>
                  ) : null}
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
                {[e.degree, e.field, e.grade].filter(Boolean).join(" · ")}
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
              {p.description ? <p className="desc">{p.description}</p> : null}
              {p.tech.filter(Boolean).length > 0 ? (
                <p className="tech">{p.tech.filter(Boolean).join(" · ")}</p>
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
              {s.keywords
                .filter(Boolean)
                .map((kw, i) => (
                  <span className="kw" key={i}>
                    {kw}
                  </span>
                ))}
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

export const modernTemplate: ResumeTemplate = {
  slug: "modern",
  name: "Modern",
  category: "modern",
  description: "Clean sans-serif with an accent color. Professional without being plain.",
  Document: ModernDocument,
};
