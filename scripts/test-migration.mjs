// Verifies that migration 0002 (B1) applies on a database that already ran 0000 + 0001 and has content,
// without losing users/stories/chapters. Needs an EMPTY scratch database:
//
//   STORYWEB_TEST_MIGRATION_DB_URL=postgres://localhost:5432/storyweb_migration_test node scripts/test-migration.mjs
//
// The script applies drizzle/*.sql directly (not via drizzle-kit), so use a throwaway DB only.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.STORYWEB_TEST_MIGRATION_DB_URL;
if (!url) throw new Error("Set STORYWEB_TEST_MIGRATION_DB_URL to an empty scratch database.");
if (new URL(url).pathname.slice(1) === "railway" || (/railway|rlwy.net/i.test(url) && process.env.STORYWEB_TEST_ALLOW_REMOTE !== "1")) throw new Error("Refusing to run against a production/Railway database without STORYWEB_TEST_ALLOW_REMOTE=1 and a separate test database.");

const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
const client = new pg.Client({ connectionString: url });
await client.connect();

async function apply(tag) {
  const text = await readFile(new URL(`../drizzle/${tag}.sql`, import.meta.url), "utf8");
  await client.query("BEGIN");
  for (const statement of text.split("--> statement-breakpoint")) if (statement.trim()) await client.query(statement);
  await client.query("COMMIT");
}

try {
  const { rows: existing } = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'");
  assert.equal(existing[0].n, 0, "Database must be empty");

  const tags = journal.entries.map((entry) => entry.tag);
  const b1 = tags.findIndex((tag) => tag.startsWith("0002_"));
  assert.ok(b1 > 0, "0002 migration missing");
  for (const tag of tags.slice(0, b1)) await apply(tag);

  // Pre-B1 production-shaped data.
  const { rows: [user] } = await client.query("INSERT INTO users (email, display_name, role) VALUES ('Legacy@Example.test', 'Người cũ', 'admin') RETURNING id");
  const { rows: [story] } = await client.query("INSERT INTO stories (slug, title, author, description, genre, status, tags, completed) VALUES ('truyen-cu', 'Truyện cũ', 'Tác giả', 'Mô tả', 'Đô thị', 'published', '[\"a\"]', false) RETURNING id");
  await client.query("INSERT INTO chapters (story_id, number, title, body, status) VALUES ($1, 1, 'C1', 'Nội dung 1', 'published'), ($1, 2, 'C2', 'Nội dung 2', 'published')", [story.id]);
  await client.query("INSERT INTO bookshelves (user_id, story_id) VALUES ($1, $2)", [user.id, story.id]);

  for (const tag of tags.slice(b1)) await apply(tag);

  const { rows: [counts] } = await client.query("SELECT (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM stories)::int AS stories, (SELECT count(*) FROM chapters)::int AS chapters, (SELECT count(*) FROM bookshelves)::int AS shelves");
  assert.deepEqual(counts, { users: 1, stories: 1, chapters: 2, shelves: 1 });
  const { rows: [after] } = await client.query("SELECT s.owner_id, s.title, u.password_hash, u.role, u.updated_at IS NOT NULL AS has_updated FROM stories s, users u");
  assert.equal(after.owner_id, null, "Legacy stories stay admin-managed");
  assert.equal(after.title, "Truyện cũ");
  assert.equal(after.password_hash, null, "Existing users keep working rows without credentials");
  assert.equal(after.role, "admin");
  assert.ok(after.has_updated);
  for (const table of ["user_sessions", "auth_rate_limits"]) {
    const { rows } = await client.query("SELECT to_regclass($1) AS t", [`public.${table}`]);
    assert.ok(rows[0].t, `${table} missing`);
  }
  // Deleting an owner must not delete their stories.
  const { rows: [editor] } = await client.query("INSERT INTO users (email, display_name, role) VALUES ('e@example.test', 'E', 'editor') RETURNING id");
  await client.query("UPDATE stories SET owner_id = $1", [editor.id]);
  await client.query("DELETE FROM users WHERE id = $1", [editor.id]);
  const { rows: [orphan] } = await client.query("SELECT owner_id FROM stories");
  assert.equal(orphan.owner_id, null);
  console.log(`Migration test passed: ${tags.slice(0, b1).join(", ")} + data → ${tags.slice(b1).join(", ")} kept all rows.`);
} finally {
  await client.end();
}
