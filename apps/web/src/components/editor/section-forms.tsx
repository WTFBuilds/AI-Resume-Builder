"use client";

import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StoreApi } from "zustand";
import { Button, Field, Input, Textarea } from "@airesume/ui";
import type {
  CustomSection,
  Education,
  Experience,
  Profile,
  Project,
  ResumeData,
  SkillCategory,
} from "@airesume/templates";
import type { EditorActions, EditorState } from "./store";

type EditorStore = StoreApi<EditorState & EditorActions>;

/*
 * Form inputs are deliberately UNCONTROLLED (defaultValue + onChange→store).
 * Typing never re-renders the form tree (fast), while list mutations do
 * (FormPane subscribes to data). Undo/redo remounts via a `revision` key.
 */

/* ── sortable plumbing ───────────────────────────────────────────────────── */

function SortableEntry({
  id,
  onRemove,
  onDuplicate,
  children,
}: {
  id: string;
  onRemove: () => void;
  onDuplicate?: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "rounded-(--radius-lg) border border-[var(--line)] bg-[var(--surface)] p-4 shadow-(--shadow-sm)",
        isDragging ? "z-10 opacity-90 shadow-(--shadow-md)" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag to reorder"
          className="-ml-1 cursor-grab touch-none rounded-(--radius-sm) p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-2)] active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          {onDuplicate ? (
            <Button variant="ghost" size="icon-sm" aria-label="Duplicate" onClick={onDuplicate}>
              <Copy />
            </Button>
          ) : null}
          <Button variant="ghost-destructive" size="icon-sm" aria-label="Remove" onClick={onRemove}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="-mt-2">{children}</div>
    </div>
  );
}

/** Vertical drag-to-reorder wrapper for entry arrays. */
function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ── shared field groups ─────────────────────────────────────────────────── */

function MonthInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return <Input type="month" defaultValue={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

function BulletsEditor({
  bullets,
  onChange,
  label = "Bullets",
  placeholder = "Start with an action verb — e.g. Built, Led, Reduced",
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= bullets.length) return;
    const next = [...bullets];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-center text-xs text-[var(--muted)]">•</span>
            <Input
              defaultValue={b}
              onChange={(e) => {
                const next = [...bullets];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ChevronUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move down"
              disabled={i === bullets.length - 1}
              onClick={() => move(i, 1)}
            >
              <ChevronDown />
            </Button>
            <Button
              variant="ghost-destructive"
              size="icon-sm"
              aria-label="Remove bullet"
              onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange([...bullets, ""])} className="mt-1">
          <Plus /> Add bullet
        </Button>
      </div>
    </Field>
  );
}

function AddEntryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      <Plus /> {label}
    </Button>
  );
}

function findById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}

/* ── sections ────────────────────────────────────────────────────────────── */

function BasicsSection({ store }: { store: EditorStore }) {
  const basics = store.getState().data.basics;
  const update = (fn: (d: ResumeData) => void) => store.getState().update(fn);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            defaultValue={basics.name}
            onChange={(e) => update((d) => void (d.basics.name = e.target.value))}
            placeholder="Ahqaf Ali"
          />
        </Field>
        <Field label="Professional title">
          <Input
            defaultValue={basics.label}
            onChange={(e) => update((d) => void (d.basics.label = e.target.value))}
            placeholder="Full-Stack Developer"
          />
        </Field>
        <Field label="Phone">
          <Input
            defaultValue={basics.phone}
            onChange={(e) => update((d) => void (d.basics.phone = e.target.value))}
            placeholder="+1 (555) 010-0100"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            defaultValue={basics.email}
            onChange={(e) => update((d) => void (d.basics.email = e.target.value))}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Location">
          <Input
            defaultValue={basics.location}
            onChange={(e) => update((d) => void (d.basics.location = e.target.value))}
            placeholder="San Francisco, CA"
          />
        </Field>
        <Field label="Website">
          <Input
            defaultValue={basics.url}
            onChange={(e) => update((d) => void (d.basics.url = e.target.value))}
            placeholder="yoursite.com"
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
            Social links
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              update((d) => {
                d.basics.profiles.push({ id: crypto.randomUUID(), network: "", username: "", url: "" });
              })
            }
          >
            <Plus /> Add link
          </Button>
        </div>
        <div className="space-y-2">
          {basics.profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Input
                defaultValue={p.network}
                onChange={(e) =>
                  update((d) => {
                    const row = findById(d.basics.profiles, p.id);
                    if (row) row.network = e.target.value;
                  })
                }
                placeholder="GitHub"
                className="w-36 shrink-0"
              />
              <Input
                defaultValue={p.url || p.username}
                onChange={(e) =>
                  update((d) => {
                    const row = findById(d.basics.profiles, p.id);
                    if (row) row.url = e.target.value;
                  })
                }
                placeholder="github.com/you"
              />
              <Button
                variant="ghost-destructive"
                size="icon-sm"
                aria-label="Remove link"
                onClick={() =>
                  update((d) => {
                    d.basics.profiles = d.basics.profiles.filter((x) => x.id !== p.id);
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummarySection({ store }: { store: EditorStore }) {
  return (
    <Field
      label="Professional summary"
      hint="2–4 sentences. Who you are, what you're strong at, what you're looking for."
    >
      <Textarea
        defaultValue={store.getState().data.summary}
        onChange={(e) => store.getState().update((d) => void (d.summary = e.target.value))}
        rows={6}
        placeholder="Full-stack developer with 4 years of experience shipping web products end to end…"
      />
    </Field>
  );
}

function EducationSection({ store, education }: { store: EditorStore; education: Education[] }) {
  const update = (fn: (d: ResumeData) => void) => store.getState().update(fn);
  const setRow = (id: string, fn: (row: Education) => void) =>
    update((d) => {
      const row = findById(d.education, id);
      if (row) fn(row);
    });

  return (
    <div className="space-y-3">
      <SortableList
        items={education}
        onReorder={(next) => update((d) => void (d.education = next as Education[]))}
        renderItem={(e) => (
          <div className="mb-3">
            <SortableEntry
              id={e.id}
              onRemove={() => update((d) => void (d.education = d.education.filter((x) => x.id !== e.id)))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="School">
                  <Input
                    defaultValue={e.school}
                    onChange={(ev) => setRow(e.id, (row) => void (row.school = ev.target.value))}
                    placeholder="New York University"
                  />
                </Field>
                <Field label="Degree">
                  <Input
                    defaultValue={e.degree}
                    onChange={(ev) => setRow(e.id, (row) => void (row.degree = ev.target.value))}
                    placeholder="Bachelor of Science"
                  />
                </Field>
                <Field label="Field of study">
                  <Input
                    defaultValue={e.field}
                    onChange={(ev) => setRow(e.id, (row) => void (row.field = ev.target.value))}
                    placeholder="Computer Science"
                  />
                </Field>
                <Field label="Grade (optional)">
                  <Input
                    defaultValue={e.grade}
                    onChange={(ev) => setRow(e.id, (row) => void (row.grade = ev.target.value))}
                    placeholder="GPA 3.8/4.0"
                  />
                </Field>
                <Field label="Start">
                  <MonthInput value={e.startDate} onChange={(v) => setRow(e.id, (row) => void (row.startDate = v))} />
                </Field>
                <Field label="End">
                  <MonthInput value={e.endDate} onChange={(v) => setRow(e.id, (row) => void (row.endDate = v))} />
                </Field>
              </div>
              <BulletsEditor
                label="Highlights (optional)"
                bullets={e.highlights}
                onChange={(next) => setRow(e.id, (row) => void (row.highlights = next))}
              />
            </SortableEntry>
          </div>
        )}
      />
      <AddEntryButton
        label="Add education"
        onClick={() =>
          update((d) => {
            d.education.push({
              id: crypto.randomUUID(),
              school: "",
              degree: "",
              field: "",
              startDate: "",
              endDate: "",
              grade: "",
              highlights: [],
            });
          })
        }
      />
    </div>
  );
}

function ExperienceSection({ store, experience }: { store: EditorStore; experience: Experience[] }) {
  const update = (fn: (d: ResumeData) => void) => store.getState().update(fn);
  const setRow = (id: string, fn: (row: Experience) => void) =>
    update((d) => {
      const row = findById(d.experience, id);
      if (row) fn(row);
    });

  return (
    <div className="space-y-3">
      <SortableList
        items={experience}
        onReorder={(next) => update((d) => void (d.experience = next as Experience[]))}
        renderItem={(e) => (
          <div className="mb-3">
            <SortableEntry
              id={e.id}
              onRemove={() => update((d) => void (d.experience = d.experience.filter((x) => x.id !== e.id)))}
              onDuplicate={() =>
                update((d) => {
                  const src = findById(d.experience, e.id);
                  if (src) {
                    const copy = { ...structuredClone(src), id: crypto.randomUUID() };
                    d.experience.splice(d.experience.findIndex((x) => x.id === e.id) + 1, 0, copy);
                  }
                })
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Position">
                  <Input
                    defaultValue={e.position}
                    onChange={(ev) => setRow(e.id, (row) => void (row.position = ev.target.value))}
                    placeholder="Software Engineer"
                  />
                </Field>
                <Field label="Company">
                  <Input
                    defaultValue={e.company}
                    onChange={(ev) => setRow(e.id, (row) => void (row.company = ev.target.value))}
                    placeholder="Northwind Labs"
                  />
                </Field>
                <Field label="Location">
                  <Input
                    defaultValue={e.location}
                    onChange={(ev) => setRow(e.id, (row) => void (row.location = ev.target.value))}
                    placeholder="San Francisco, CA"
                  />
                </Field>
                <div className="grid grid-cols-2 items-end gap-3">
                  <Field label="Start">
                    <MonthInput value={e.startDate} onChange={(v) => setRow(e.id, (row) => void (row.startDate = v))} />
                  </Field>
                  <Field label={e.current ? "End (present)" : "End"}>
                    <MonthInput
                      value={e.endDate}
                      disabled={e.current}
                      onChange={(v) => setRow(e.id, (row) => void (row.endDate = v))}
                    />
                  </Field>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink-2)]">
                <input
                  type="checkbox"
                  defaultChecked={e.current}
                  onChange={(ev) =>
                    setRow(e.id, (row) => {
                      row.current = ev.target.checked;
                      if (ev.target.checked) row.endDate = "";
                    })
                  }
                  className="size-4 rounded border-[var(--line-strong)] accent-[var(--accent)]"
                />
                I currently work here
              </label>
              <BulletsEditor
                bullets={e.bullets}
                onChange={(next) => setRow(e.id, (row) => void (row.bullets = next))}
              />
            </SortableEntry>
          </div>
        )}
      />
      <AddEntryButton
        label="Add experience"
        onClick={() =>
          update((d) => {
            d.experience.push({
              id: crypto.randomUUID(),
              company: "",
              position: "",
              location: "",
              startDate: "",
              endDate: "",
              current: false,
              bullets: [""],
            });
          })
        }
      />
    </div>
  );
}

function ProjectsSection({ store, projects }: { store: EditorStore; projects: Project[] }) {
  const update = (fn: (d: ResumeData) => void) => store.getState().update(fn);
  const setRow = (id: string, fn: (row: Project) => void) =>
    update((d) => {
      const row = findById(d.projects, id);
      if (row) fn(row);
    });

  return (
    <div className="space-y-3">
      <SortableList
        items={projects}
        onReorder={(next) => update((d) => void (d.projects = next as Project[]))}
        renderItem={(p) => (
          <div className="mb-3">
            <SortableEntry
              id={p.id}
              onRemove={() => update((d) => void (d.projects = d.projects.filter((x) => x.id !== p.id)))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Project name">
                  <Input
                    defaultValue={p.name}
                    onChange={(ev) => setRow(p.id, (row) => void (row.name = ev.target.value))}
                    placeholder="OpenLedger"
                  />
                </Field>
                <Field label="Link (optional)">
                  <Input
                    defaultValue={p.url}
                    onChange={(ev) => setRow(p.id, (row) => void (row.url = ev.target.value))}
                    placeholder="github.com/you/project"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                  <Field label="Start (optional)">
                    <MonthInput value={p.startDate} onChange={(v) => setRow(p.id, (row) => void (row.startDate = v))} />
                  </Field>
                  <Field label="End (optional)">
                    <MonthInput value={p.endDate} onChange={(v) => setRow(p.id, (row) => void (row.endDate = v))} />
                  </Field>
                </div>
              </div>
              <Field label="Short description">
                <Input
                  defaultValue={p.description}
                  onChange={(ev) => setRow(p.id, (row) => void (row.description = ev.target.value))}
                  placeholder="Self-hosted expense tracking for small teams"
                />
              </Field>
              <Field label="Technologies (comma-separated)">
                <Input
                  defaultValue={p.tech.join(", ")}
                  onChange={(ev) =>
                    setRow(p.id, (row) => {
                      row.tech = ev.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                    })
                  }
                  placeholder="TypeScript, FastAPI, PostgreSQL"
                />
              </Field>
              <BulletsEditor
                bullets={p.bullets}
                onChange={(next) => setRow(p.id, (row) => void (row.bullets = next))}
              />
            </SortableEntry>
          </div>
        )}
      />
      <AddEntryButton
        label="Add project"
        onClick={() =>
          update((d) => {
            d.projects.push({
              id: crypto.randomUUID(),
              name: "",
              description: "",
              url: "",
              tech: [],
              startDate: "",
              endDate: "",
              bullets: [""],
            });
          })
        }
      />
    </div>
  );
}

function SkillsSection({ store, skills }: { store: EditorStore; skills: SkillCategory[] }) {
  const update = (fn: (d: ResumeData) => void) => store.getState().update(fn);
  const setRow = (id: string, fn: (row: SkillCategory) => void) =>
    update((d) => {
      const row = findById(d.skills, id);
      if (row) fn(row);
    });

  return (
    <div className="space-y-3">
      <SortableList
        items={skills}
        onReorder={(next) => update((d) => void (d.skills = next as SkillCategory[]))}
        renderItem={(s) => (
          <div className="mb-3">
            <SortableEntry
              id={s.id}
              onRemove={() => update((d) => void (d.skills = d.skills.filter((x) => x.id !== s.id)))}
            >
              <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                <Field label="Category">
                  <Input
                    defaultValue={s.name}
                    onChange={(ev) => setRow(s.id, (row) => void (row.name = ev.target.value))}
                    placeholder="Languages"
                  />
                </Field>
                <Field label="Skills (comma-separated)">
                  <Input
                    defaultValue={s.keywords.join(", ")}
                    onChange={(ev) =>
                      setRow(s.id, (row) => {
                        row.keywords = ev.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                      })
                    }
                    placeholder="TypeScript, Python, SQL"
                  />
                </Field>
              </div>
            </SortableEntry>
          </div>
        )}
      />
      <AddEntryButton
        label="Add skill group"
        onClick={() =>
          update((d) => {
            d.skills.push({ id: crypto.randomUUID(), name: "", keywords: [] });
          })
        }
      />
    </div>
  );
}

function CustomSectionForm({ store, section }: { store: EditorStore; section: CustomSection }) {
  const update = (fn: (d: ResumeData) => void) => store.getState().update(fn);
  const findSection = (d: ResumeData) => findById(d.custom, section.id);

  return (
    <div className="space-y-3">
      <Field label="Section title">
        <Input
          defaultValue={section.title}
          onChange={(e) =>
            update((d) => {
              const row = findSection(d);
              if (row) row.title = e.target.value;
            })
          }
          placeholder="Awards"
        />
      </Field>
      <SortableList
        items={section.entries}
        onReorder={(next) =>
          update((d) => {
            const row = findSection(d);
            if (row) row.entries = next;
          })
        }
        renderItem={(e) => (
          <div className="mb-3">
            <SortableEntry
              id={e.id}
              onRemove={() =>
                update((d) => {
                  const row = findSection(d);
                  if (row) row.entries = row.entries.filter((x) => x.id !== e.id);
                })
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title">
                  <Input
                    defaultValue={e.title}
                    onChange={(ev) =>
                      update((d) => {
                        const entry = findSection(d)?.entries.find((x) => x.id === e.id);
                        if (entry) entry.title = ev.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Date range (optional)">
                  <Input
                    defaultValue={e.dateRange}
                    onChange={(ev) =>
                      update((d) => {
                        const entry = findSection(d)?.entries.find((x) => x.id === e.id);
                        if (entry) entry.dateRange = ev.target.value;
                      })
                    }
                    placeholder="2023 – Present"
                  />
                </Field>
                <Field label="Subtitle (optional)" className="sm:col-span-2">
                  <Input
                    defaultValue={e.subtitle}
                    onChange={(ev) =>
                      update((d) => {
                        const entry = findSection(d)?.entries.find((x) => x.id === e.id);
                        if (entry) entry.subtitle = ev.target.value;
                      })
                    }
                  />
                </Field>
              </div>
              <BulletsEditor
                bullets={e.bullets}
                onChange={(next) =>
                  update((d) => {
                    const entry = findSection(d)?.entries.find((x) => x.id === e.id);
                    if (entry) entry.bullets = next;
                  })
                }
              />
            </SortableEntry>
          </div>
        )}
      />
      <AddEntryButton
        label="Add entry"
        onClick={() =>
          update((d) => {
            const row = findSection(d);
            if (row)
              row.entries.push({
                id: crypto.randomUUID(),
                title: "",
                subtitle: "",
                dateRange: "",
                bullets: [""],
              });
          })
        }
      />
    </div>
  );
}

/* ── dispatcher ──────────────────────────────────────────────────────────── */

export function SectionForm({
  store,
  sectionKey,
  data,
}: {
  store: EditorStore;
  sectionKey: string;
  data: ResumeData;
}) {
  switch (sectionKey) {
    case "basics":
      return <BasicsSection store={store} />;
    case "summary":
      return <SummarySection store={store} />;
    case "education":
      return <EducationSection store={store} education={data.education} />;
    case "experience":
      return <ExperienceSection store={store} experience={data.experience} />;
    case "projects":
      return <ProjectsSection store={store} projects={data.projects} />;
    case "skills":
      return <SkillsSection store={store} skills={data.skills} />;
    default: {
      if (sectionKey.startsWith("custom:")) {
        const id = sectionKey.slice("custom:".length);
        const section = data.custom.find((c) => c.id === id);
        if (section) return <CustomSectionForm store={store} section={section} />;
      }
      return null;
    }
  }
}
