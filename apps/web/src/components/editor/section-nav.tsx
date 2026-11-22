"use client";

import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
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
import { CORE_SECTION_KEYS, resolveSectionOrder, sectionTitle, type ResumeData } from "@airesume/templates";
import { Button } from "@airesume/ui";
import type { EditorStoreApi } from "./store";
import { useEditor } from "./store";

function completion(key: string, data: ResumeData): "empty" | "partial" | "full" {
  switch (key) {
    case "basics":
      return data.basics.name || data.basics.email ? (data.basics.name && data.basics.email ? "full" : "partial") : "empty";
    case "summary":
      return data.summary ? "full" : "empty";
    case "education":
      return data.education.length ? "full" : "empty";
    case "experience":
      return data.experience.length ? "full" : "empty";
    case "projects":
      return data.projects.length ? "full" : "empty";
    case "skills":
      return data.skills.length ? "full" : "empty";
    default: {
      const id = key.replace("custom:", "");
      return data.custom.find((c) => c.id === id)?.entries.length ? "full" : "empty";
    }
  }
}

const DOT: Record<"empty" | "partial" | "full", string> = {
  empty: "bg-[var(--line-strong)]",
  partial: "bg-[var(--warning)]",
  full: "bg-[var(--accent)]",
};

function NavRow({
  id,
  active,
  dimmed,
  label,
  dot,
  onSelect,
  trailing,
}: {
  id: string;
  active: boolean;
  dimmed: boolean;
  label: string;
  dot: "empty" | "partial" | "full";
  onSelect: () => void;
  trailing?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group flex items-center gap-1.5 rounded-(--radius) px-1.5 py-1 transition-colors",
        active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]",
        isDragging ? "z-10 shadow-(--shadow-md)" : "",
      ].join(" ")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label="Reorder section"
        className="cursor-grab touch-none rounded-(--radius-sm) p-0.5 text-[var(--muted)] opacity-0 transition-opacity hover:text-[var(--ink-2)] group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={[
          "flex min-w-0 flex-1 items-center gap-2 rounded-(--radius-sm) px-1 py-1 text-left text-[13px]",
          dimmed ? "text-[var(--muted)]" : active ? "font-medium text-[var(--accent)]" : "text-[var(--ink)]",
        ].join(" ")}
      >
        <span className={`size-1.5 shrink-0 rounded-full ${DOT[dot]}`} />
        <span className="truncate">{label}</span>
      </button>
      {trailing}
    </div>
  );
}

export function SectionNav({
  store,
  activeKey,
  onSelect,
}: {
  store: EditorStoreApi;
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const data = useEditor(store, (s) => s.data);
  const config = useEditor(store, (s) => s.config);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ordered = resolveSectionOrder(data, config);
  const hidden = new Set(config.hiddenSections);
  // nav shows hidden sections too (dimmed) so they can be restored
  const allKeys = [
    ...ordered,
    ...[...CORE_SECTION_KEYS, ...data.custom.map((c) => `custom:${c.id}`)].filter(
      (k) => !ordered.includes(k),
    ),
  ];

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = allKeys.indexOf(String(active.id));
    const newIndex = allKeys.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(allKeys, oldIndex, newIndex);
    store.getState().patchConfig({ sectionOrder: next });
  }

  function toggleHidden(key: string) {
    const next = hidden.has(key)
      ? config.hiddenSections.filter((k) => k !== key)
      : [...config.hiddenSections, key];
    store.getState().patchConfig({ hiddenSections: next });
  }

  function addCustomSection() {
    const id = crypto.randomUUID();
    store.getState().update((d) => {
      d.custom.push({ id, title: "New section", entries: [] });
    });
    onSelect(`custom:${id}`);
  }

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Sections
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Add section" onClick={addCustomSection}>
          <Plus />
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={allKeys} strategy={verticalListSortingStrategy}>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {allKeys.map((key) => (
              <NavRow
                key={key}
                id={key}
                active={activeKey === key}
                dimmed={hidden.has(key)}
                label={sectionTitle(key, data)}
                dot={completion(key, data)}
                onSelect={() => onSelect(key)}
                trailing={
                  <span className="flex items-center">
                    <button
                      type="button"
                      aria-label={hidden.has(key) ? "Show section" : "Hide section"}
                      onClick={() => toggleHidden(key)}
                      className="rounded-(--radius-sm) p-1 text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--surface-2)] hover:text-[var(--ink-2)] group-hover:opacity-100"
                    >
                      {hidden.has(key) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                    {key.startsWith("custom:") ? (
                      <button
                        type="button"
                        aria-label="Delete section"
                        onClick={() => {
                          store.getState().update((d) => {
                            d.custom = d.custom.filter((c) => c.id !== key.slice("custom:".length));
                          });
                        }}
                        className="rounded-(--radius-sm) p-1 text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </span>
                }
              />
            ))}
          </nav>
        </SortableContext>
      </DndContext>
      <p className="border-t border-[var(--line)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
        Drag to reorder. Hidden sections stay in your data but don&apos;t render.
      </p>
    </div>
  );
}
