import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Story } from "@/data/stories";
import { stories as sampleStories } from "@/data/stories";
import { getDb } from "@/db/client";
import { chapters, stories } from "@/db/schema";
import { getClickUnlockExpiration } from "@/lib/click-unlock";

export type ManagedChapter = { title: string; body: string };
export type ManagedStory = {
  id: string;
  slug: string;
  title: string;
  author: string;
  genre: string;
  tags: string[];
  description: string;
  visibility: "draft" | "published";
  completed: boolean;
  freeChapters: number;
  chapters: ManagedChapter[];
  createdAt: string;
  updatedAt: string;
};

export type StoryInput = Pick<ManagedStory, "slug" | "title" | "author" | "genre" | "tags" | "description" | "visibility" | "completed" | "freeChapters" | "chapters"> & { id?: string };

export class ManagedStoryError extends Error {}

const storyIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

type StoryRow = typeof stories.$inferSelect;
type ChapterRow = Pick<typeof chapters.$inferSelect, "storyId" | "number" | "title" | "body">;

function mapStory(row: StoryRow, chapterRows: ChapterRow[]): ManagedStory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    genre: row.genre,
    tags: row.tags,
    description: row.description,
    visibility: row.status === "draft" ? "draft" : "published",
    completed: row.completed || row.status === "completed",
    freeChapters: row.freeChapterCount,
    chapters: chapterRows.map(({ title, body }) => ({ title, body })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const publishedStatuses = ["published", "completed"] as const;

export async function readManagedStories(): Promise<ManagedStory[]> {
  const db = getDb();
  const rows = await db.select().from(stories).orderBy(desc(stories.updatedAt));
  if (rows.length === 0) return [];
  const chapterRows = await db.select({ storyId: chapters.storyId, number: chapters.number, title: chapters.title, body: chapters.body })
    .from(chapters).where(inArray(chapters.storyId, rows.map(({ id }) => id)))
    .orderBy(asc(chapters.storyId), asc(chapters.number));
  const byStory = new Map<string, ChapterRow[]>();
  for (const row of chapterRows) {
    const list = byStory.get(row.storyId) ?? [];
    list.push(row);
    byStory.set(row.storyId, list);
  }
  return rows.map((row) => mapStory(row, byStory.get(row.id) ?? []));
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; cause?: unknown };
  return value.code === "23505" || isUniqueViolation(value.cause);
}

export async function saveManagedStory(input: StoryInput): Promise<ManagedStory> {
  if (sampleStories.some((story) => story.slug === input.slug)) throw new ManagedStoryError("Đường dẫn truyện đã được dùng.");
  if (input.id && !storyIdPattern.test(input.id)) throw new ManagedStoryError("ID truyện không hợp lệ.");
  const db = getDb();
  const id = input.id ?? randomUUID();
  const now = new Date();
  const status: StoryRow["status"] = input.visibility === "draft" ? "draft" : input.completed ? "completed" : "published";
  try {
    return await db.transaction(async (tx) => {
      let row: StoryRow;
      const values = {
        slug: input.slug,
        title: input.title,
        author: input.author,
        description: input.description,
        genre: input.genre,
        tags: input.tags,
        status,
        completed: input.completed,
        freeChapterCount: input.freeChapters,
        updatedAt: now,
      };
      if (input.id) {
        const [updated] = await tx.update(stories).set(values).where(eq(stories.id, input.id)).returning();
        if (!updated) throw new ManagedStoryError("Không tìm thấy truyện cần sửa.");
        row = updated;
      } else {
        const [inserted] = await tx.insert(stories).values({ id, ...values, createdAt: now }).returning();
        row = inserted;
      }

      // Keep chapter IDs stable for future per-chapter access grants.
      await tx.delete(chapters).where(and(eq(chapters.storyId, id), gt(chapters.number, input.chapters.length)));
      if (input.chapters.length > 0) {
        const chapterValues = input.chapters.map((chapter, index) => ({
          storyId: id,
          number: index + 1,
          title: chapter.title,
          body: chapter.body,
          status: input.visibility,
          publishedAt: input.visibility === "published" ? now : null,
        }));
        await tx.insert(chapters).values(chapterValues).onConflictDoUpdate({
          target: [chapters.storyId, chapters.number],
          set: {
            title: sql`excluded.title`,
            body: sql`excluded.body`,
            status: sql`excluded.status`,
            publishedAt: sql`CASE WHEN excluded.status = 'published' THEN COALESCE(${chapters.publishedAt}, excluded.published_at) ELSE NULL END`,
          },
        });
      }
      return mapStory(row, input.chapters.map((chapter, index) => ({ ...chapter, storyId: id, number: index + 1 })));
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ManagedStoryError("Đường dẫn truyện đã được dùng.");
    throw error;
  }
}

export async function removeManagedStory(id: string): Promise<void> {
  if (!storyIdPattern.test(id)) throw new ManagedStoryError("ID truyện không hợp lệ.");
  const [removed] = await getDb().delete(stories).where(eq(stories.id, id)).returning({ id: stories.id });
  if (!removed) throw new ManagedStoryError("Không tìm thấy truyện cần xóa.");
}

const palettes: Record<string, [string, string]> = {
  "Tình cảm": ["#c47d79", "#6e4c66"],
  "Cổ đại": ["#703c53", "#271d37"],
  "Kỳ ảo": ["#3d5277", "#17233f"],
  "Đời thường": ["#a96b46", "#4d302e"],
  "Đô thị": ["#304e5c", "#152633"],
};

export function toPublicStory(story: ManagedStory): Story {
  return {
    slug: story.slug,
    title: story.title,
    author: story.author,
    genre: story.genre,
    tags: story.tags,
    status: story.completed ? "Hoàn thành" : "Đang ra",
    blurb: story.description,
    rating: "Mới",
    reads: "Mới",
    chapters: story.chapters.length,
    freeChapters: story.freeChapters,
    updated: new Date(story.updatedAt).toLocaleDateString("vi-VN"),
    palette: palettes[story.genre] ?? ["#46645f", "#263a42"],
    symbol: "✦",
  };
}

export async function getCatalogStories(): Promise<Story[]> {
  const db = getDb();
  const rows = await db.select().from(stories).where(inArray(stories.status, publishedStatuses)).orderBy(desc(stories.updatedAt));
  if (rows.length === 0) return sampleStories;
  const counts = await db.select({ storyId: chapters.storyId, count: sql<number>`count(*)::int` }).from(chapters)
    .where(and(inArray(chapters.storyId, rows.map((row) => row.id)), eq(chapters.status, "published"))).groupBy(chapters.storyId);
  const countByStory = new Map(counts.map((row) => [row.storyId, row.count]));
  const managed = rows.map((row) => {
    const item = toPublicStory(mapStory(row, []));
    item.chapters = countByStory.get(row.id) ?? 0;
    return item;
  });
  return [...managed, ...sampleStories.filter((story) => !managed.some((item) => item.slug === story.slug))];
}

/** Public metadata only; chapter bodies are deliberately omitted. */
export async function getCatalogStory(slug: string): Promise<{ story: Story; managed?: ManagedStory } | undefined> {
  const db = getDb();
  const [row] = await db.select().from(stories)
    .where(and(eq(stories.slug, slug), inArray(stories.status, publishedStatuses))).limit(1);
  if (row) {
    const chapterRows = await db.select({ storyId: chapters.storyId, number: chapters.number, title: chapters.title })
      .from(chapters).where(and(eq(chapters.storyId, row.id), eq(chapters.status, "published"))).orderBy(asc(chapters.number));
    const managed = mapStory(row, chapterRows.map((chapter) => ({ ...chapter, body: "" })));
    return { story: toPublicStory(managed), managed };
  }
  const story = sampleStories.find((item) => item.slug === slug);
  return story ? { story } : undefined;
}

/** Rechecks the server-side unlock before fetching a protected chapter body. */
export async function getManagedChapterBody(slug: string, chapterNumber: number): Promise<string | undefined> {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) return undefined;
  const db = getDb();
  const [story] = await db.select({ id: stories.id, freeChapterCount: stories.freeChapterCount }).from(stories)
    .where(and(eq(stories.slug, slug), inArray(stories.status, publishedStatuses))).limit(1);
  if (!story || (chapterNumber > story.freeChapterCount && await getClickUnlockExpiration() === null)) return undefined;
  const [chapter] = await db.select({ body: chapters.body }).from(chapters)
    .where(and(eq(chapters.storyId, story.id), eq(chapters.number, chapterNumber), eq(chapters.status, "published"))).limit(1);
  return chapter?.body;
}
