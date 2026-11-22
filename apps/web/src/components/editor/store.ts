"use client";

import { createStore, useStore } from "zustand";
import type { ResumeConfig, ResumeData } from "@airesume/templates";

export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export interface EditorDoc {
  title: string;
  templateId: string;
  data: ResumeData;
  config: ResumeConfig;
}

interface Snapshot extends EditorDoc {}

export interface EditorState extends EditorDoc {
  resumeId: string;
  updatedAt: string;
  saveState: SaveState;
  /** Server copy available after a 409 — used by the resolve bar. */
  conflictServer: Snapshot & { updatedAt: string } | null;
  past: Snapshot[];
  future: Snapshot[];
  /**
   * Bumped only on non-typing document replacements (undo/redo/conflict
   * resolve) so uncontrolled form inputs remount with fresh values.
   */
  revision: number;
}

export interface EditorActions {
  setTitle: (title: string) => void;
  setTemplate: (templateId: string) => void;
  /** Content mutation: mutator edits a deep clone; autosave + undo follow. */
  update: (mutator: (draft: ResumeData) => void) => void;
  patchConfig: (patch: Partial<ResumeConfig>) => void;
  undo: () => void;
  redo: () => void;
  flush: () => Promise<void>;
  resolveConflict: (mode: "mine" | "theirs") => void;
  /** Replace the whole document from a version snapshot (History → Restore). */
  restoreSnapshot: (snapshot: { title: string; data: ResumeData; config: ResumeConfig }) => void;
}

const SAVE_DEBOUNCE_MS = 1500;
const UNDO_COALESCE_MS = 600;
const HISTORY_CAP = 60;
const MAX_RETRIES = 3;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createEditorStore(init: { resumeId: string; doc: EditorDoc; updatedAt: string }) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  let lastHistoryPush = 0;

  const store = createStore<EditorState & EditorActions>()((set, get) => {
    function scheduleSave() {
      set({ saveState: "dirty" });
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void doSave(), SAVE_DEBOUNCE_MS);
    }

    async function doSave(): Promise<void> {
      const { resumeId, title, data, config, updatedAt, saveState } = get();
      if (saveState === "conflict") return;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      set({ saveState: "saving" });
      try {
        const res = await fetch(`/api/resumes/${resumeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, data, config, baseUpdatedAt: updatedAt }),
        });
        if (res.status === 409) {
          const body = await res.json();
          set({
            saveState: "conflict",
            conflictServer: {
              title: body.resume.title,
              templateId: get().templateId,
              data: body.resume.data,
              config: body.resume.config,
              updatedAt: body.updatedAt,
            },
          });
          return;
        }
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        const body = await res.json();
        retryCount = 0;
        // A change may have landed while we were saving — keep the dirty chain going.
        const stillDirty = get().saveState === "dirty";
        set({ updatedAt: body.updatedAt, saveState: stillDirty ? "dirty" : "saved" });
        if (get().saveState === "dirty") scheduleSave();
      } catch {
        retryCount += 1;
        if (retryCount <= MAX_RETRIES) {
          setTimeout(() => void doSave(), 2000 * retryCount);
        } else {
          set({ saveState: "error" });
        }
      }
    }

    function pushHistory() {
      const now = Date.now();
      const { past, title, data, config } = get();
      // Rapid keystrokes coalesce into a single undo step.
      if (now - lastHistoryPush < UNDO_COALESCE_MS && past.length > 0) return;
      lastHistoryPush = now;
      const snapshot: Snapshot = {
        title,
        templateId: get().templateId,
        data: clone(data),
        config: clone(config),
      };
      set({ past: [...past.slice(-(HISTORY_CAP - 1)), snapshot], future: [] });
    }

    return {
      resumeId: init.resumeId,
      title: init.doc.title,
      templateId: init.doc.templateId,
      data: init.doc.data,
      config: init.doc.config,
      updatedAt: init.updatedAt,
      saveState: "saved",
      conflictServer: null,
      past: [],
      future: [],
      revision: 0,

      setTitle: (title) => {
        set({ title });
        pushHistory();
        scheduleSave();
      },

      setTemplate: (templateId) => {
        set({ templateId });
        pushHistory();
        scheduleSave();
      },

      update: (mutator) => {
        const draft = clone(get().data);
        mutator(draft);
        set({ data: draft });
        pushHistory();
        scheduleSave();
      },

      patchConfig: (patch) => {
        set({ config: { ...get().config, ...patch } });
        pushHistory();
        scheduleSave();
      },

      undo: () => {
        const { past, future, title, templateId, data, config, saveState, revision } = get();
        if (past.length === 0 || saveState === "conflict") return;
        const previous = past[past.length - 1];
        set({
          past: past.slice(0, -1),
          future: [...future, { title, templateId, data: clone(data), config: clone(config) }],
          title: previous.title,
          templateId: previous.templateId,
          data: previous.data,
          config: previous.config,
          revision: revision + 1,
        });
        scheduleSave();
      },

      redo: () => {
        const { past, future, title, templateId, data, config, saveState, revision } = get();
        if (future.length === 0 || saveState === "conflict") return;
        const next = future[future.length - 1];
        set({
          future: future.slice(0, -1),
          past: [...past, { title, templateId, data: clone(data), config: clone(config) }],
          title: next.title,
          templateId: next.templateId,
          data: next.data,
          config: next.config,
          revision: revision + 1,
        });
        scheduleSave();
      },

      flush: async () => {
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        if (get().saveState !== "saved") await doSave();
      },

      restoreSnapshot: (snapshot) => {
        const { revision } = get();
        set({
          title: snapshot.title,
          data: clone(snapshot.data),
          config: clone(snapshot.config),
          revision: revision + 1,
        });
        scheduleSave();
      },

      resolveConflict: (mode) => {
        const { conflictServer, revision } = get();
        if (!conflictServer) return;
        if (mode === "theirs") {
          set({
            title: conflictServer.title,
            data: conflictServer.data,
            config: conflictServer.config,
            updatedAt: conflictServer.updatedAt,
            saveState: "saved",
            conflictServer: null,
            past: [],
            future: [],
            revision: revision + 1,
          });
        } else {
          // Keep my document; force-write over the server copy.
          set({ updatedAt: conflictServer.updatedAt, conflictServer: null, saveState: "dirty" });
          void doSave();
        }
      },
    };
  });

  return store;
}

export type EditorStoreApi = ReturnType<typeof createEditorStore>;

/** Convenience hook bound to a store api instance. */
export function useEditor<T>(store: EditorStoreApi, selector: (s: EditorState & EditorActions) => T): T {
  return useStore(store, selector);
}
