// One-time import for the former local CMS file. Run after `npm run db:migrate`.
// Usage: node scripts/import-stories.mjs [path/to/published-stories.json]
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const source = path.resolve(process.argv[2] ?? "content/published-stories.json");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for import.");
const entries = JSON.parse(await readFile(source, "utf8"));
if (!Array.isArray(entries)) throw new Error("Expected a JSON array of managed stories.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
let imported = 0;
let skipped = 0;
try {
  await client.query("BEGIN");
  for (const item of entries) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.slug !== "string" ||
      typeof item.title !== "string" || typeof item.author !== "string" || typeof item.genre !== "string" ||
      typeof item.description !== "string" || !Array.isArray(item.tags) || !Array.isArray(item.chapters) ||
      !item.chapters.every((chapter) => typeof chapter?.title === "string" && typeof chapter?.body === "string") ||
      !Number.isInteger(item.freeChapters) || item.freeChapters < 1 || item.freeChapters > Math.max(item.chapters.length, 1) ||
      !["draft", "published"].includes(item.visibility)) {
      throw new Error(`Invalid story entry: ${item?.slug ?? "unknown"}`);
    }
    const status = item.visibility === "draft" ? "draft" : item.completed ? "completed" : "published";
    const result = await client.query(
      `INSERT INTO stories (id, slug, title, author, description, genre, tags, status, completed, free_chapter_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING RETURNING id`,
      [item.id, item.slug, item.title, item.author, item.description, item.genre, JSON.stringify(item.tags), status,
        Boolean(item.completed), item.freeChapters, item.createdAt ?? new Date().toISOString(), item.updatedAt ?? new Date().toISOString()],
    );
    if (result.rowCount === 0) {
      skipped++;
      continue;
    }
    for (const [index, chapter] of item.chapters.entries()) {
      await client.query(
        `INSERT INTO chapters (story_id, number, title, body, status, published_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [item.id, index + 1, chapter.title, chapter.body, item.visibility,
          item.visibility === "published" ? item.updatedAt ?? new Date().toISOString() : null],
      );
    }
    imported++;
  }
  await client.query("COMMIT");
  console.log(`Imported ${imported} stories; skipped ${skipped} existing entries.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
