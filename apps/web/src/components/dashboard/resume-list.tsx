"use client";

import {
  Archive,
  ArchiveRestore,
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TEMPLATES } from "@airesume/templates";
import {
  Badge,
  Button,
  Dialog,
  Dropdown,
  EmptyState,
  Input,
  MenuItem,
  MenuSeparator,
} from "@airesume/ui";
import { timeAgo } from "@/lib/format";

export interface ResumeListItem {
  id: string;
  title: string;
  templateId: string;
  updatedAt: string;
  tags: { id: string; name: string }[];
}

export function ResumeList({
  items,
  status,
  searchPlaceholder,
}: {
  items: ResumeListItem[];
  status: "active" | "archived" | "trashed";
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<ResumeListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ResumeListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;
  }, [items, query]);

  async function act(
    fn: () => Promise<Response>,
    successMessage: string,
  ) {
    const res = await fn();
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Something went wrong");
      return;
    }
    toast.success(successMessage);
    router.refresh();
  }

  const emptyCopy: Record<typeof status, { title: string; description: string; cta?: boolean }> = {
    active: {
      title: "No resumes yet",
      description:
        "Create your first resume from a template — the editor has structured forms and a live preview.",
      cta: true,
    },
    archived: {
      title: "Nothing archived",
      description: "Archived resumes stay out of your way but remain one click away.",
    },
    trashed: {
      title: "Trash is empty",
      description: "Deleted resumes rest here for 30 days before being removed for good.",
    },
  };

  return (
    <div className="space-y-4">
      {status === "active" ? (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? "Search resumes…"}
            className="pl-9"
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyCopy[status].title}
          description={emptyCopy[status].description}
          action={
            status === "active" ? (
              <Link href="/dashboard?new=1">
                <Button>New resume</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-(--radius-lg) border border-[var(--line)] bg-[var(--surface)] shadow-(--shadow-sm)">
          {/* desktop table */}
          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                <th className="px-4 py-2.5">Title</th>
                <th className="w-32 px-4 py-2.5">Template</th>
                <th className="w-48 px-4 py-2.5">Last modified</th>
                <th className="w-12 px-2 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--surface-2)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/resume/${item.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--accent)] hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.tags.length > 0 ? (
                      <span className="ml-2 inline-flex gap-1">
                        {item.tags.map((t) => (
                          <Badge key={t.id}>{t.name}</Badge>
                        ))}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--ink-2)]">
                    {TEMPLATES[item.templateId]?.name ?? item.templateId}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--ink-2)]">
                    {timeAgo(item.updatedAt)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <RowActions
                      item={item}
                      status={status}
                      onRename={() => {
                        setRenameTarget(item);
                        setRenameValue(item.title);
                      }}
                      onDelete={() => setConfirmDelete(item)}
                      act={act}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* mobile cards */}
          <ul className="divide-y divide-[var(--line)] md:hidden">
            {filtered.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-[var(--muted)]" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/resume/${item.id}`}
                    className="block truncate font-medium text-[var(--ink)]"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {TEMPLATES[item.templateId]?.name} · {timeAgo(item.updatedAt)}
                  </p>
                </div>
                <RowActions
                  item={item}
                  status={status}
                  onRename={() => {
                    setRenameTarget(item);
                    setRenameValue(item.title);
                  }}
                  onDelete={() => setConfirmDelete(item)}
                  act={act}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 ? (
        <p className="text-center text-xs text-[var(--muted)]">
          Showing {filtered.length} of {items.length} resumes.
        </p>
      ) : null}

      {/* rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename resume"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!renameTarget) return;
                await act(
                  () =>
                    fetch(`/api/resumes/${renameTarget.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: renameValue }),
                    }),
                  "Renamed",
                );
                setRenameTarget(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          data-autofocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
        />
      </Dialog>

      {/* delete-forever confirm */}
      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete forever?"
        description={`"${confirmDelete?.title ?? ""}" will be permanently deleted, including its version history. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmDelete) return;
                await act(
                  () => fetch(`/api/resumes/${confirmDelete.id}?permanent=true`, { method: "DELETE" }),
                  "Deleted forever",
                );
                setConfirmDelete(null);
              }}
            >
              <Trash2 /> Delete forever
            </Button>
          </>
        }
      />
    </div>
  );
}

function RowActions({
  item,
  status,
  onRename,
  onDelete,
  act,
}: {
  item: ResumeListItem;
  status: "active" | "archived" | "trashed";
  onRename: () => void;
  onDelete: () => void;
  act: (fn: () => Promise<Response>, msg: string) => Promise<void>;
}) {
  return (
    <Dropdown
      width={200}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Resume actions">
          <MoreHorizontal />
        </Button>
      }
    >
      {status === "active" ? (
        <>
          <MenuItem
            icon={<Pencil />}
            onSelect={() => (window.location.href = `/resume/${item.id}`)}
          >
            Open
          </MenuItem>
          <MenuItem icon={<Pencil />} onSelect={onRename}>
            Rename
          </MenuItem>
          <MenuItem
            icon={<Copy />}
            onSelect={() =>
              act(() => fetch(`/api/resumes/${item.id}/duplicate`, { method: "POST" }), "Duplicated")
            }
          >
            Duplicate
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Archive />}
            onSelect={() =>
              act(
                () =>
                  fetch(`/api/resumes/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "archived" }),
                  }),
                "Archived",
              )
            }
          >
            Archive
          </MenuItem>
          <MenuItem
            icon={<Trash2 />}
            danger
            onSelect={() =>
              act(
                () =>
                  fetch(`/api/resumes/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "trashed" }),
                  }),
                "Moved to trash",
              )
            }
          >
            Move to trash
          </MenuItem>
        </>
      ) : null}

      {status === "archived" ? (
        <>
          <MenuItem
            icon={<ArchiveRestore />}
            onSelect={() =>
              act(
                () =>
                  fetch(`/api/resumes/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "active" }),
                  }),
                "Restored",
              )
            }
          >
            Unarchive
          </MenuItem>
          <MenuItem
            icon={<Trash2 />}
            danger
            onSelect={() =>
              act(
                () =>
                  fetch(`/api/resumes/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "trashed" }),
                  }),
                "Moved to trash",
              )
            }
          >
            Move to trash
          </MenuItem>
        </>
      ) : null}

      {status === "trashed" ? (
        <>
          <MenuItem
            icon={<ArchiveRestore />}
            onSelect={() =>
              act(
                () =>
                  fetch(`/api/resumes/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "active" }),
                  }),
                "Restored",
              )
            }
          >
            Restore
          </MenuItem>
          <MenuItem icon={<X />} danger onSelect={onDelete}>
            Delete forever
          </MenuItem>
        </>
      ) : null}
    </Dropdown>
  );
}
