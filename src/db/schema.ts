import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["reader", "editor", "admin"]);
export const storyStatus = pgEnum("story_status", ["draft", "published", "completed"]);
export const chapterStatus = pgEnum("chapter_status", ["draft", "published"]);
export const accessSource = pgEnum("access_source", ["rewarded_ad", "points", "subscription", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  role: userRole("role").notNull().default("reader"),
  // Nullable so rows created before B1 stay valid; such users cannot sign in until a password is set.
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Server-side sessions; the cookie holds a random token and only its SHA-256 is stored. */
export const userSessions = pgTable("user_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [index("user_sessions_user_idx").on(table.userId), index("user_sessions_expires_idx").on(table.expiresAt)]);

/** Fixed-window counters shared by every app instance (login, registration, password change). */
export const authRateLimits = pgTable("auth_rate_limits", {
  key: varchar("key", { length: 100 }).primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
}, (table) => [index("auth_rate_limits_window_idx").on(table.windowStart)]);

export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 160 }).notNull(),
  description: text("description").notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  coverUrl: text("cover_url"),
  status: storyStatus("status").notNull().default("draft"),
  completed: boolean("completed").notNull().default(false),
  freeChapterCount: integer("free_chapter_count").notNull().default(1),
  // NULL = legacy/admin-managed story; only admins can see or change it.
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("stories_genre_idx").on(table.genre), index("stories_updated_idx").on(table.updatedAt), index("stories_owner_idx").on(table.ownerId)]);

export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: chapterStatus("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [uniqueIndex("chapters_story_number_idx").on(table.storyId, table.number)]);

export const bookshelves = pgTable("bookshelves", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.storyId] })]);

export const readingProgress = pgTable("reading_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.storyId] })]);

export const chapterAccess = pgTable("chapter_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  source: accessSource("source").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  providerReference: varchar("provider_reference", { length: 255 }),
}, (table) => [uniqueIndex("chapter_access_user_chapter_idx").on(table.userId, table.chapterId)]);

export const affiliateLinks = pgTable("affiliate_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: varchar("label", { length: 160 }).notNull(),
  destinationUrl: text("destination_url").notNull(),
  placement: varchar("placement", { length: 80 }).notNull(),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outboundClicks = pgTable("outbound_clicks", {
  id: uuid("id").defaultRandom().primaryKey(),
  linkId: uuid("link_id").notNull().references(() => affiliateLinks.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("outbound_clicks_link_time_idx").on(table.linkId, table.clickedAt)]);

export const unlockMode = pgEnum("unlock_mode", ["link", "rewarded"]);

/**
 * Single-row site configuration (id = "default"). `unlock_revision` is part of every unlock cookie/grant, so bumping it
 * (on any unlock enable/mode/link change) invalidates access minted under the previous configuration immediately.
 */
export const siteSettings = pgTable("site_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  unlockEnabled: boolean("unlock_enabled").notNull().default(false),
  unlockMode: unlockMode("unlock_mode").notNull().default("link"),
  unlockLinkUrl: text("unlock_link_url"),
  unlockRevision: integer("unlock_revision").notNull().default(1),
  adSlots: jsonb("ad_slots").$type<Record<string, boolean>>().notNull().default({}),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedByLabel: varchar("updated_by_label", { length: 160 }),
});

/** Minimal audit trail: who changed settings, when, and the before/after values (never secrets). */
export const siteSettingsAudit = pgTable("site_settings_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorLabel: varchar("actor_label", { length: 160 }).notNull(),
  before: jsonb("before").notNull(),
  after: jsonb("after").notNull(),
}, (table) => [index("site_settings_audit_changed_idx").on(table.changedAt)]);

/**
 * Rewarded-ad challenges: one nonce per "watch ad" attempt, bound to the reader cookie and unlock revision.
 * A provider's server-side callback marks it verified; the reader then claims it once (replay-safe).
 */
export const unlockChallenges = pgTable("unlock_challenges", {
  nonce: varchar("nonce", { length: 64 }).primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull(),
  readerHash: varchar("reader_hash", { length: 64 }).notNull(),
  revision: integer("revision").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  providerRef: varchar("provider_ref", { length: 255 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
}, (table) => [index("unlock_challenges_expires_idx").on(table.expiresAt)]);
