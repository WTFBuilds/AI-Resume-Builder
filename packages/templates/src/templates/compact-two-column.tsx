import * as React from "react";

import {
  cleanUrl,
  formatDateRange,
  resolveSectionOrder,
} from "../schema";
import type { ResumeTemplate, TemplateProps } from "../types";
import { baseCss, densityMetrics, Doc, PAGE_SIZES, resolveFont } from "./shared";

/**
 * Two-column layout: contact + skills live in a shaded sidebar,
 * narrative sections fill the main column. Still fully text-selectable.
 */
function CompactDocument({ data, config }: TemplateProps) {
  const metrics = densityMetrics(config.density);
  const page = PAGE_SIZES[config.pageSize];
  const accent = config.accent;
  const sections = resolveSectionOrder(data, config);

  const sideProfiles = data.basics.profiles.filter((p) => p.url || p.username);

  const css = `
${baseCss({ page, font: resolveFont(config, "sans"), metrics, accent })}
.page { padding: 0; display: flex; align-items: stretch; }
.side {
  width: 33%;
  min-height: ${page.h}in;
  background: #f3f5f4;
  border-right: 1px solid #e2e7e4;
  padding: ${metrics.pad};
  padding-top: calc(${metrics.pad} + 0.15in);
}
.main { flex: 1; padding: ${metrics.pad}; padding-top: calc(${metrics.pad} + 0.15in); }
.side h2, .main h2 {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  color: ${accent};
  margin-bottom: 0.6em;
}
.side .block { margin-bottom: 1.3em; }
.side .item { margin-bottom: 0.45em; font-size: 0.92em; }
.side .item b { font-weight: 650; }
.side ul { padding-left: 1.2em; font-size: 0.92em; }
.side ul li::marker { color: ${accent}; }
.main .header h1 { font-size: 1.8em; font-weight: 750; }
.main .header .label { color: ${accent}; font-weight: 600; margin-top: 0.15em; }
.main .header { margin-bottom: 1.2em; }
.section { margin-bottom: 1.25em; }
.entry { margin-bottom: 0.9em; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.8em; }
.entry .title { font-weight: 700; }
.entry .right { color: #666; white-space: nowrap; font-size: 0.88em; }
.entry .meta { color: #555; margin-top: 0.12em; font-size: 0.92em; }
.entry ul { padding-left: 1.3em; margin-top: 0.35em; }
.entry li::marker { color: ${accent}; }
.entry p.desc { margin-top: 0.3em; color: #333; }
.skillline { margin-top: 0.3em; font-size: 0.92em; }
.skillline b { font-weight: 650; }
.summary { white-space: pre-line; color: #2a2a2a; }
`;

  return (
    <Doc title={data.basics.name ? `${data.basics.name} — Resume` : "Resume"} css={css}>
      <aside className="side">
        <div className="block">
          <h2>Contact</h2>
          {data.basics.email ? <div className="item">{data.basics.email}</div> : null}
          {data.basics.phone ? <div className="item">{data.basics.phone}</div> : null}
          {data.basics.location ? <div className="item">{data.basics.location}</div> : null}
          {data.basics.url ? <div className="item">{cleanUrl(data.basics.url)}</div> : null}
        </div>

        {sideProfiles.length > 0 ? (
          <div className="block">
            <h2>Profiles</h2>
            {sideProfiles.map((p) => (
              <div className="item" key={p.id}>
                {p.network ? <b>{p.network}: </b> : null}
                {cleanUrl(p.url || p.username)}
              </div>
            ))}
          </div>
        ) : null}

        {sections.includes("skills") && data.skills.length > 0 ? (
          <div className="block">
            <h2>Skills</h2>
            {data.skills.map((s) => (
              <p className="skillline" key={s.id}>
                {s.name ? <b>{s.name}: </b> : null}
                {s.keywords.filter(Boolean).join(", ")}
              </p>
            ))}
          </div>
        ) : null}
      </aside>

      <main className="main">
        <header className="header">
          <h1>{data.basics.name || "Your Name"}</h1>
          {data.basics.label ? <div className="label">{data.basics.label}</div> : null}
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
                  <span className="title">{e.position}</span>
                  <span className="right">
                    {formatDateRange(e.startDate, e.endDate, e.current)}
                  </span>
                </div>
                <div className="meta">{[e.company, e.location].filter(Boolean).join(" · ")}</div>
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
                  <div className="meta">{p.tech.filter(Boolean).join(" · ")}</div>
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
      </main>
    </Doc>
  );
}

export const compactTwoColumnTemplate: ResumeTemplate = {
  slug: "compact-two-column",
  name: "Compact Two-Column",
  category: "compact",
  description: "Sidebar for contact and skills, main column for experience. Fits more in less space.",
  Document: CompactDocument,
};
