import { randomBytes } from "node:crypto";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  defaultResumeConfig,
  emptyResumeData,
  ResumeConfigSchema,
  ResumeDataSchema,
} from "@airesume/templates";
import { db } from "./client";
import {
  exportJob,
  resume,
  resumeTag,
  resumeVersion,
  shareLink,
  tag,
  template,
} from "./schema";

/* ── errors ──────────────────────────────────────────────────────────────── */

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
export class ValidationError extends Error {
  constructor(message = "Invalid document") {
    super(message);
    this.name = "ValidationError";
  }
}
export class QuotaError extends Error {
  constructor(message = "Plan limit reached") {
    super(message);
    this.name = "QuotaError";
  }
}
export class ConflictError extends Error {
  readonly current: ResumeRow;
  constructor(current: ResumeRow) {
    super("Document changed since last save");
    this.name = "ConflictError";
    this.current = current;
  }
}

/* ── row types ───────────────────────────────────────────────────────────── */

export type ResumeRow = typeof resume.$inferSelect;
export type ExportRow = typeof exportJob.$inferSelect;
export type TagRow = typeof tag.$inferSelect;
export type VersionRow = typeof resumeVersion.$inferSelect;
export type TemplateRow = typeof template.$inferSelect;

export const VERSION_EDIT_THRESHOLD = 20;
export const VERSION_INTERVAL_MS = 5 * 60 * 1000;

/* ── resumes ─────────────────────────────────────────────────────────────── */

/** Free-plan limits (plan.md §13). Stripe enforcement lands in P2b. */
export const FREE_ACTIVE_RESUME_LIMIT = 5;

export async function createResume(
  userId: string,
  input: { title: string; templateId: string; data?: unknown },
): Promise<ResumeRow> {
  const tpl = await db.select().from(template).where(eq(template.id, input.templateId));
  if (tpl.length === 0) throw new ValidationError("Unknown template");

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(resume)
    .where(and(eq(resume.userId, userId), eq(resume.status, "active")));
  if (n >= FREE_ACTIVE_RESUME_LIMIT) {
    throw new QuotaError(
      `Free plan allows ${FREE_ACTIVE_RESUME_LIMIT} active resumes — archive one or upgrade to Pro.`,
    );
  }

  const data = input.data === undefined ? emptyResumeData() : input.data;
  const parsedData = ResumeDataSchema.safeParse(data);
  if (!parsedData.success) throw new ValidationError("Invalid resume data");

  const [row] = await db
    .insert(resume)
    .values({
      userId,
      title: input.title.trim() || "Untitled resume",
      templateId: input.templateId,
      data: parsedData.data,
      config: defaultResumeConfig(),
    })
    .returning();
  return row;
}

export async function duplicateResume(userId: string, id: string): Promise<ResumeRow> {
  const row = await requireResume(userId, id);
  const [copy] = await db
    .insert(resume)
    .values({
      userId,
      title: `${row.title} (copy)`,
      templateId: row.templateId,
      data: row.data,
      config: row.config,
    })
    .returning();
  return copy;
}

export interface ListResumesOptions {
  status?: "active" | "archived" | "trashed";
  q?: string;
  tagId?: string;
  limit?: number;
  offset?: number;
}

export async function listResumes(
  userId: string,
  options: ListResumesOptions = {},
): Promise<{ items: ResumeRow[]; total: number }> {
  const status = options.status ?? "active";
  const filters = [eq(resume.userId, userId), eq(resume.status, status)];
  if (options.q) filters.push(ilike(resume.title, `%${options.q}%`));
  if (options.tagId) {
    filters.push(
      sql`exists (select 1 from ${resumeTag} where ${resumeTag.resumeId} = ${resume.id} and ${resumeTag.tagId} = ${options.tagId})`,
    );
  }
  const where = and(...filters);
  const [items, count] = await Promise.all([
    db
      .select()
      .from(resume)
      .where(where)
      .orderBy(desc(resume.updatedAt))
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(resume).where(where),
  ]);
  return { items, total: count[0]?.n ?? 0 };
}

/** Single ownership gate — every resume mutation/fetch goes through here. */
export async function requireResume(userId: string, id: string): Promise<ResumeRow> {
  const rows = await db.select().from(resume).where(eq(resume.id, id));
  const row = rows[0];
  if (!row) throw new NotFoundError("Resume not found");
  if (row.userId !== userId) throw new ForbiddenError();
  return row;
}

export interface ResumePatch {
  title?: string;
  data?: unknown;
  config?: unknown;
}

/**
 * Autosave write with optimistic concurrency + rolling version snapshots
 * (snapshot the pre-patch state every VERSION_EDIT_THRESHOLD edits or
 * VERSION_INTERVAL_MS, whichever comes first).
 */
export async function patchResume(
  userId: string,
  id: string,
  patch: ResumePatch,
  baseUpdatedAt?: string,
): Promise<ResumeRow> {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(resume).where(eq(resume.id, id)).for("update");
    const row = rows[0];
    if (!row) throw new NotFoundError("Resume not found");
    if (row.userId !== userId) throw new ForbiddenError();

    if (baseUpdatedAt) {
      const base = new Date(baseUpdatedAt).getTime();
      if (Number.isNaN(base) || base !== row.updatedAt.getTime()) {
        throw new ConflictError(row);
      }
    }

    const update: Partial<typeof resume.$inferInsert> = { updatedAt: new Date() };
    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) throw new ValidationError("Title cannot be empty");
      update.title = title;
    }
    if (patch.data !== undefined) {
      const parsed = ResumeDataSchema.safeParse(patch.data);
      if (!parsed.success) throw new ValidationError("Invalid resume data");
      update.data = parsed.data;
    }
    if (patch.config !== undefined) {
      const parsed = ResumeConfigSchema.safeParse(patch.config);
      if (!parsed.success) throw new ValidationError("Invalid resume config");
      update.config = parsed.data;
    }

    const snapshotDue =
      row.editsSinceVersion >= VERSION_EDIT_THRESHOLD ||
      Date.now() - row.lastVersionAt.getTime() >= VERSION_INTERVAL_MS;

    if (snapshotDue) {
      await tx.insert(resumeVersion).values({
        resumeId: id,
        snapshot: { title: row.title, data: row.data, config: row.config },
        auto: true,
      });
    }

    update.editsSinceVersion = snapshotDue ? 1 : row.editsSinceVersion + 1;
    if (snapshotDue) update.lastVersionAt = new Date();

    const [updated] = await tx.update(resume).set(update).where(eq(resume.id, id)).returning();
    return updated;
  });
}

export async function setResumeStatus(
  userId: string,
  id: string,
  status: "active" | "archived" | "trashed",
): Promise<ResumeRow> {
  await requireResume(userId, id);
  const [row] = await db
    .update(resume)
    .set({ status, trashedAt: status === "trashed" ? new Date() : null, updatedAt: new Date() })
    .where(eq(resume.id, id))
    .returning();
  return row;
}

export async function deleteResumeForever(userId: string, id: string): Promise<void> {
  await requireResume(userId, id);
  await db.delete(resume).where(eq(resume.id, id));
}

export async function purgeTrashedOlderThan(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(resume)
    .where(and(eq(resume.status, "trashed"), sql`${resume.trashedAt} < ${cutoff}`))
    .returning({ id: resume.id });
  return deleted.length;
}

/* ── versions ────────────────────────────────────────────────────────────── */

export async function listVersions(resumeId: string, limit = 50): Promise<VersionRow[]> {
  return db
    .select()
    .from(resumeVersion)
    .where(eq(resumeVersion.resumeId, resumeId))
    .orderBy(desc(resumeVersion.createdAt))
    .limit(limit);
}

export async function createManualVersion(userId: string, id: string, label: string) {
  const row = await requireResume(userId, id);
  const [version] = await db
    .insert(resumeVersion)
    .values({
      resumeId: id,
      snapshot: { title: row.title, data: row.data, config: row.config },
      label,
      auto: false,
    })
    .returning();
  await db.update(resume).set({ lastVersionAt: new Date() }).where(eq(resume.id, id));
  return version;
}

/* ── exports ─────────────────────────────────────────────────────────────── */

export async function createExport(userId: string, resumeId: string): Promise<ExportRow> {
  await requireResume(userId, resumeId);
  const [row] = await db.insert(exportJob).values({ resumeId }).returning();
  return row;
}

export async function getExport(exportId: string): Promise<ExportRow> {
  const rows = await db.select().from(exportJob).where(eq(exportJob.id, exportId));
  if (!rows[0]) throw new NotFoundError("Export not found");
  return rows[0];
}

export async function requireExportForUser(userId: string, exportId: string): Promise<ExportRow> {
  const rows = await db
    .select({ e: exportJob })
    .from(exportJob)
    .innerJoin(resume, eq(resume.id, exportJob.resumeId))
    .where(eq(exportJob.id, exportId));
  const row = rows[0]?.e;
  if (!row) throw new NotFoundError("Export not found");
  if (
    !(await db
      .select({ userId: resume.userId })
      .from(resume)
      .where(and(eq(resume.id, row.resumeId), eq(resume.userId, userId)))
      .then((r) => r.length))
  ) {
    throw new ForbiddenError();
  }
  return row;
}

export async function updateExport(
  exportId: string,
  update: Partial<typeof exportJob.$inferInsert>,
): Promise<void> {
  await db.update(exportJob).set(update).where(eq(exportJob.id, exportId));
}

export async function pruneExports(resumeId: string, keep = 10): Promise<string[]> {
  const stale = await db
    .select({ id: exportJob.id, key: exportJob.storageKey })
    .from(exportJob)
    .where(eq(exportJob.resumeId, resumeId))
    .orderBy(desc(exportJob.requestedAt))
    .offset(keep);
  if (stale.length > 0) {
    await db.delete(exportJob).where(
      sql`${exportJob.id} in (${sql.join(
        stale.map((s) => sql`${s.id}::uuid`),
        sql`, `,
      )})`,
    );
  }
  return stale.filter((s) => s.key).map((s) => s.key as string);
}

/* ── tags ────────────────────────────────────────────────────────────────── */

export async function listTags(userId: string): Promise<TagRow[]> {
  return db.select().from(tag).where(eq(tag.userId, userId)).orderBy(tag.name);
}

export async function createTag(userId: string, name: string, color?: string): Promise<TagRow> {
  const [row] = await db.insert(tag).values({ userId, name: name.trim(), color }).returning();
  return row;
}

export async function deleteTag(userId: string, tagId: string): Promise<void> {
  const rows = await db.select().from(tag).where(eq(tag.id, tagId));
  if (!rows[0]) throw new NotFoundError("Tag not found");
  if (rows[0].userId !== userId) throw new ForbiddenError();
  await db.delete(tag).where(eq(tag.id, tagId));
}

export async function addTagToResume(userId: string, resumeId: string, tagId: string) {
  await requireResume(userId, resumeId);
  const rows = await db.select().from(tag).where(eq(tag.id, tagId));
  if (!rows[0] || rows[0].userId !== userId) throw new ForbiddenError();
  await db.insert(resumeTag).values({ resumeId, tagId }).onConflictDoNothing();
}

export async function removeTagFromResume(userId: string, resumeId: string, tagId: string) {
  await requireResume(userId, resumeId);
  await db
    .delete(resumeTag)
    .where(and(eq(resumeTag.resumeId, resumeId), eq(resumeTag.tagId, tagId)));
}

export async function listTagsForResume(resumeId: string): Promise<TagRow[]> {
  return db
    .select({ t: tag })
    .from(resumeTag)
    .innerJoin(tag, eq(tag.id, resumeTag.tagId))
    .where(eq(resumeTag.resumeId, resumeId))
    .then((rows) => rows.map((r) => r.t));
}

/** All tags for every resume of a user — one query (avoids dashboard N+1). */
export async function listTagsForAllResumes(userId: string): Promise<Map<string, TagRow[]>> {
  const rows = await db
    .select({ resumeId: resumeTag.resumeId, tag })
    .from(resumeTag)
    .innerJoin(tag, eq(tag.id, resumeTag.tagId))
    .innerJoin(resume, eq(resume.id, resumeTag.resumeId))
    .where(eq(resume.userId, userId));
  const map = new Map<string, TagRow[]>();
  for (const row of rows) {
    const list = map.get(row.resumeId) ?? [];
    list.push(row.tag);
    map.set(row.resumeId, list);
  }
  return map;
}

export async function setResumeTags(
  userId: string,
  resumeId: string,
  tagIds: string[],
): Promise<void> {
  await requireResume(userId, resumeId);
  await db.transaction(async (tx) => {
    await tx.delete(resumeTag).where(eq(resumeTag.resumeId, resumeId));
    if (tagIds.length > 0) {
      // keep only tags owned by this user
      const owned = await tx
        .select({ id: tag.id })
        .from(tag)
        .where(and(eq(tag.userId, userId), sql`${tag.id} = any(${tagIds}::uuid[])`));
      if (owned.length > 0) {
        await tx
          .insert(resumeTag)
          .values(owned.map((o) => ({ resumeId, tagId: o.id })))
          .onConflictDoNothing();
      }
    }
  });
}

/* ── share links ─────────────────────────────────────────────────────────── */

export type ShareLinkRow = typeof shareLink.$inferSelect;

export async function createShareLink(
  userId: string,
  resumeId: string,
  options: { expiresAt?: Date } = {},
): Promise<ShareLinkRow> {
  await requireResume(userId, resumeId);
  const [row] = await db
    .insert(shareLink)
    .values({
      resumeId,
      token: randomBytes(18).toString("base64url"), // 24 chars, URL-safe
      expiresAt: options.expiresAt ?? null,
    })
    .returning();
  return row;
}

export async function listShareLinks(userId: string, resumeId: string): Promise<ShareLinkRow[]> {
  await requireResume(userId, resumeId);
  return db
    .select()
    .from(shareLink)
    .where(eq(shareLink.resumeId, resumeId))
    .orderBy(desc(shareLink.createdAt));
}

export async function revokeShareLink(
  userId: string,
  resumeId: string,
  shareId: string,
): Promise<void> {
  await requireResume(userId, resumeId);
  const rows = await db.select().from(shareLink).where(eq(shareLink.id, shareId));
  const row = rows[0];
  if (!row || row.resumeId !== resumeId) throw new NotFoundError("Share link not found");
  await db.update(shareLink).set({ revoked: true }).where(eq(shareLink.id, shareId));
}

/** Public lookup — no auth, by token. Only active, non-revoked, unexpired. */
export async function getActiveShareByToken(token: string): Promise<{
  share: ShareLinkRow;
  resume: ResumeRow;
} | null> {
  const rows = await db
    .select({ s: shareLink, r: resume })
    .from(shareLink)
    .innerJoin(resume, eq(resume.id, shareLink.resumeId))
    .where(eq(shareLink.token, token));
  const row = rows[0];
  if (!row) return null;
  if (row.s.revoked) return null;
  if (row.s.expiresAt && row.s.expiresAt.getTime() < Date.now()) return null;
  if (row.r.status === "trashed") return null;
  return { share: row.s, resume: row.r };
}

/* ── templates ───────────────────────────────────────────────────────────── */

export async function listTemplates(): Promise<TemplateRow[]> {
  return db
    .select()
    .from(template)
    .where(eq(template.active, true))
    .orderBy(template.sortOrder);
}
