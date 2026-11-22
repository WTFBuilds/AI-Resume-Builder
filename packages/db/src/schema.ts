import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ── better-auth core tables ──────────────────────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── app core ─────────────────────────────────────────────────────────────── */

export const resumeStatus = pgEnum("resume_status", ["active", "archived", "trashed"]);
export const exportStatus = pgEnum("export_status", ["queued", "rendering", "done", "failed"]);

export const template = pgTable("template", {
  // P1: template id IS the slug ("classic", "modern", …) — registry-driven.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  previewAssetKey: text("preview_asset_key"),
  isPremium: boolean("is_premium").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resume = pgTable(
  "resume",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled resume"),
    templateId: text("template_id")
      .notNull()
      .references(() => template.id),
    data: jsonb("data").notNull(),
    config: jsonb("config").notNull(),
    status: resumeStatus("status").notNull().default("active"),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    // version snapshot bookkeeping (snapshot every 20 edits or 5 minutes)
    editsSinceVersion: integer("edits_since_version").notNull().default(0),
    lastVersionAt: timestamp("last_version_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resume_user_updated_idx").on(t.userId, t.status, t.updatedAt)],
);

export const resumeVersion = pgTable(
  "resume_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    snapshot: jsonb("snapshot").notNull(),
    label: text("label"),
    auto: boolean("auto").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resume_version_resume_idx").on(t.resumeId, t.createdAt)],
);

export const exportJob = pgTable(
  "export_job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    status: exportStatus("status").notNull().default("queued"),
    storageKey: text("storage_key"),
    mime: text("mime").notNull().default("application/pdf"),
    error: text("error"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("export_job_resume_idx").on(t.resumeId, t.requestedAt)],
);

export const tag = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tag_user_name_idx").on(t.userId, t.name)],
);

export const resumeTag = pgTable(
  "resume_tag",
  {
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resumeId, t.tagId] })],
);

export const shareLink = pgTable(
  "share_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    revoked: boolean("revoked").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("share_link_resume_idx").on(t.resumeId, t.createdAt)],
);

/* Later-phase shapes are specified in plan.md §7; tables are created when
   needed: user_plan (Stripe, P2b), ai_job (P3) */
