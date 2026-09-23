// Backend integration test for B1: accounts, sessions, role/owner matrix, rate limits, legacy admin.
// Runs against a running app (`npm run build && npm start`) on a LOCAL/TEST database — never production.
//
//   STORYWEB_TEST_URL=http://127.0.0.1:3000 \
//   STORYWEB_TEST_URL_2=http://127.0.0.1:3001 \        # optional second instance on the same DB
//   STORYWEB_TEST_ADMIN_PASSWORD=... DATABASE_URL=postgres://.../storyweb_test \
//   node scripts/test-auth.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const base = process.env.STORYWEB_TEST_URL ?? "http://127.0.0.1:3000";
const base2 = process.env.STORYWEB_TEST_URL_2 ?? base;
const adminPassword = process.env.STORYWEB_TEST_ADMIN_PASSWORD;
if (!adminPassword) throw new Error("Set STORYWEB_TEST_ADMIN_PASSWORD.");
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the same local/test DB the app uses.");
if (/railway|rlwy\.net/i.test(process.env.DATABASE_URL) && process.env.STORYWEB_TEST_ALLOW_REMOTE !== "1") throw new Error("Refusing to run against a Railway database.");

const run = randomUUID().slice(0, 8);
// Unique client address per run so the per-IP limits of earlier runs do not interfere.
const ip = `198.51.100.${Number.parseInt(run.slice(0, 2), 16)}-${run}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const createdStories = [];
const createdEmails = [];
let adminCookie;
let passed = 0;

async function call(path, { method = "GET", body, cookie, headers = {}, url = base } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { "X-Forwarded-For": ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  assert.ok(!/scrypt\$|password_hash|passwordHash|token_hash/.test(text), `Secret material leaked from ${method} ${path}`);
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: response.status, json, text, headers: response.headers };
}

function cookieFrom(result, name) {
  const header = result.headers.getSetCookie?.() ?? [result.headers.get("set-cookie") ?? ""];
  const line = header.find((value) => value.startsWith(`${name}=`));
  return line?.split(";")[0];
}

async function step(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function story(slug, extra = {}) {
  return { slug, title: `Truyện ${slug}`, author: "Bút danh", genre: "Đô thị", description: "Mô tả", tags: [], visibility: "draft", completed: false, freeChapters: 1, chapters: [{ title: "Chương một", body: `Nội dung bí mật ${slug}` }], ...extra };
}

async function makeAccount(role) {
  const email = `b1-${role}-${run}-${createdEmails.length}@example.test`;
  const password = `Pw-${randomUUID()}`;
  createdEmails.push(email);
  const created = await call("/api/admin/users", { method: "POST", cookie: adminCookie, body: { email, displayName: `${role} ${run}`, password, role } });
  assert.equal(created.status, 201, created.text);
  assert.equal(created.json.user.role, role);
  const login = await call("/api/auth/login", { method: "POST", body: { email: email.toUpperCase(), password } });
  assert.equal(login.status, 200, login.text);
  const cookie = cookieFrom(login, "storyweb_session");
  assert.ok(cookie);
  return { id: created.json.user.id, email, password, cookie };
}

try {
  console.log(`B1 auth test (run ${run}) against ${base}${base2 !== base ? ` + ${base2}` : ""}`);

  await step("anonymous is 401 on CMS and admin APIs", async () => {
    assert.equal((await call("/api/admin/stories")).status, 401);
    assert.equal((await call("/api/admin/users")).status, 401);
    const session = await call("/api/auth/session");
    assert.equal(session.status, 200);
    assert.equal(session.json.user, null);
  });

  await step("legacy ADMIN_PANEL_PASSWORD login still works", async () => {
    assert.equal((await call("/api/admin/login", { method: "POST", body: { password: `${adminPassword}x` } })).status, 401);
    const login = await call("/api/admin/login", { method: "POST", body: { password: adminPassword } });
    assert.equal(login.status, 200);
    assert.deepEqual(login.json, { ok: true });
    adminCookie = cookieFrom(login, "storyweb_admin");
    assert.ok(adminCookie);
    assert.equal((await call("/api/admin/stories", { cookie: adminCookie })).status, 200);
    const legacy = await call("/api/admin/stories", { method: "POST", cookie: adminCookie, body: story(`b1-legacy-${run}`) });
    assert.equal(legacy.status, 200, legacy.text);
    assert.equal(legacy.json.story.ownerId, null);
    createdStories.push(legacy.json.story.id);
  });

  let reader;
  await step("public registration creates a reader and ignores role", async () => {
    const email = `b1-reader-${run}@example.test`;
    createdEmails.push(email);
    const password = `Pw-${randomUUID()}`;
    const bad = await call("/api/auth/register", { method: "POST", body: { email: "không-phải-email", displayName: "", password: "123" } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.code, "invalid_input");
    assert.ok(bad.json.fields.email && bad.json.fields.password && bad.json.fields.displayName);
    const created = await call("/api/auth/register", { method: "POST", body: { email: ` ${email.toUpperCase()} `, displayName: "Độc giả", password, role: "admin" } });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.json.user.role, "reader");
    assert.equal(created.json.user.email, email);
    const setCookie = created.headers.getSetCookie().find((value) => value.startsWith("storyweb_session="));
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    reader = { email, password, cookie: cookieFrom(created, "storyweb_session") };
    const duplicate = await call("/api/auth/register", { method: "POST", body: { email, displayName: "Khác", password } });
    assert.equal(duplicate.status, 409);
    const session = await call("/api/auth/session", { cookie: reader.cookie });
    assert.equal(session.json.user.email, email);
    assert.equal(session.json.canManageStories, false);
  });

  await step("reader cannot use the CMS or admin APIs (403)", async () => {
    assert.equal((await call("/api/admin/stories", { cookie: reader.cookie })).status, 403);
    assert.equal((await call("/api/admin/stories", { method: "POST", cookie: reader.cookie, body: story(`b1-reader-${run}`) })).status, 403);
    assert.equal((await call("/api/admin/users", { cookie: reader.cookie })).status, 403);
    assert.equal((await call("/api/admin/users", { method: "POST", cookie: reader.cookie, body: { email: `x-${run}@example.test`, displayName: "x", password: "12345678", role: "admin" } })).status, 403);
    const panel = await call("/panel", { cookie: reader.cookie });
    assert.ok(!panel.text.includes(`Nội dung bí mật b1-legacy-${run}`));
  });

  await step("reader login, logout and revoked cookie", async () => {
    const wrong = await call("/api/auth/login", { method: "POST", body: { email: reader.email, password: "sai-mat-khau" } });
    const unknown = await call("/api/auth/login", { method: "POST", body: { email: `khong-ton-tai-${run}@example.test`, password: "sai-mat-khau" } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.json, unknown.json, "Login error must not reveal whether the account exists");
    const login = await call("/api/auth/login", { method: "POST", body: { email: reader.email, password: reader.password } });
    assert.equal(login.status, 200);
    const cookie = cookieFrom(login, "storyweb_session");
    assert.equal((await call("/api/auth/logout", { method: "POST", cookie })).status, 200);
    assert.equal((await call("/api/auth/session", { cookie })).json.user, null, "Logged-out session must be rejected server-side");
    assert.equal((await call("/api/auth/session", { cookie: reader.cookie })).json.user.email, reader.email, "Other sessions stay valid");
  });

  let editorA, editorB, storyA, storyB;
  await step("two editors create stories; owner comes from the session", async () => {
    editorA = await makeAccount("editor");
    editorB = await makeAccount("editor");
    const a = await call("/api/admin/stories", { method: "POST", cookie: editorA.cookie, body: story(`b1-a-${run}`, { ownerId: editorB.id }) });
    assert.equal(a.status, 200, a.text);
    assert.equal(a.json.story.ownerId, editorA.id, "ownerId from the body must be ignored");
    storyA = a.json.story.id;
    createdStories.push(storyA);
    const b = await call("/api/admin/stories", { method: "POST", cookie: editorB.cookie, body: story(`b1-b-${run}`) });
    assert.equal(b.status, 200, b.text);
    storyB = b.json.story.id;
    createdStories.push(storyB);
  });

  await step("editor A cannot see, edit or delete B's draft or legacy stories", async () => {
    const list = await call("/api/admin/stories", { cookie: editorA.cookie });
    assert.equal(list.status, 200);
    assert.ok(list.json.stories.every((item) => item.ownerId === editorA.id));
    assert.ok(list.json.stories.some((item) => item.id === storyA));
    assert.ok(!list.text.includes(`b1-b-${run}`) && !list.text.includes(`b1-legacy-${run}`));
    const edit = await call("/api/admin/stories", { method: "POST", cookie: editorA.cookie, body: story(`b1-b-${run}`, { id: storyB, title: "Chiếm quyền" }) });
    assert.equal(edit.status, 403, edit.text);
    assert.ok(!edit.text.includes(`Nội dung bí mật b1-b-${run}`));
    assert.equal((await call("/api/admin/stories", { method: "DELETE", cookie: editorA.cookie, body: { id: storyB } })).status, 403);
    assert.equal((await call("/api/admin/stories", { method: "DELETE", cookie: editorA.cookie, body: { id: createdStories[0] } })).status, 403);
    assert.equal((await call("/api/admin/stories", { method: "DELETE", cookie: editorA.cookie, body: { id: randomUUID() } })).status, 404);
    const { rows } = await db.query("SELECT title, owner_id FROM stories WHERE id = $1", [storyB]);
    assert.equal(rows[0].title, `Truyện b1-b-${run}`);
    assert.equal(rows[0].owner_id, editorB.id);
    assert.equal((await call("/api/admin/stories/owner", { method: "POST", cookie: editorA.cookie, body: { storyId: storyB, ownerId: editorA.id } })).status, 403);
    assert.equal((await call("/api/admin/users", { cookie: editorA.cookie })).status, 403);
    assert.equal((await call(`/api/admin/users/${editorA.id}`, { method: "PATCH", cookie: editorA.cookie, body: { role: "admin" } })).status, 403);
  });

  await step("editor can update own story; owner stays fixed", async () => {
    const update = await call("/api/admin/stories", { method: "POST", cookie: editorA.cookie, body: story(`b1-a-${run}`, { id: storyA, title: "Đã sửa", ownerId: null }) });
    assert.equal(update.status, 200, update.text);
    assert.equal(update.json.story.ownerId, editorA.id);
  });

  await step("legacy admin and account admin manage every story", async () => {
    const list = await call("/api/admin/stories", { cookie: adminCookie });
    const ids = new Set(list.json.stories.map((item) => item.id));
    assert.ok(createdStories.every((id) => ids.has(id)));
    const admin = await makeAccount("admin");
    const accountList = await call("/api/admin/stories", { cookie: admin.cookie });
    assert.ok(createdStories.every((id) => accountList.json.stories.some((item) => item.id === id)));
    const edit = await call("/api/admin/stories", { method: "POST", cookie: admin.cookie, body: story(`b1-b-${run}`, { id: storyB, title: "Admin sửa" }) });
    assert.equal(edit.status, 200, edit.text);
    assert.equal(edit.json.story.ownerId, editorB.id, "Admin edits keep the owner");
    const transfer = await call("/api/admin/stories/owner", { method: "POST", cookie: admin.cookie, body: { storyId: createdStories[0], ownerId: editorA.id } });
    assert.equal(transfer.status, 200, transfer.text);
    assert.ok((await call("/api/admin/stories", { cookie: editorA.cookie })).json.stories.some((item) => item.id === createdStories[0]));
    assert.equal((await call("/api/admin/stories/owner", { method: "POST", cookie: admin.cookie, body: { storyId: createdStories[0], ownerId: null } })).status, 200);
    assert.equal((await call(`/api/admin/users/${admin.id}`, { method: "PATCH", cookie: admin.cookie, body: { role: "reader" } })).status, 400, "Admin cannot change own role");
  });

  await step("role change is enforced immediately and revokes sessions", async () => {
    const demote = await call(`/api/admin/users/${editorA.id}`, { method: "PATCH", cookie: adminCookie, body: { role: "reader" } });
    assert.equal(demote.status, 200, demote.text);
    assert.equal((await call("/api/admin/stories", { cookie: editorA.cookie })).status, 401);
    const login = await call("/api/auth/login", { method: "POST", body: { email: editorA.email, password: editorA.password } });
    assert.equal((await call("/api/admin/stories", { cookie: cookieFrom(login, "storyweb_session") })).status, 403);
  });

  await step("expired session is rejected", async () => {
    await db.query("UPDATE user_sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1", [editorB.id]);
    assert.equal((await call("/api/admin/stories", { cookie: editorB.cookie })).status, 401);
    assert.equal((await call("/api/auth/session", { cookie: editorB.cookie })).json.user, null);
  });

  await step("password change requires current password and signs out other sessions", async () => {
    const other = cookieFrom(await call("/api/auth/login", { method: "POST", body: { email: reader.email, password: reader.password } }), "storyweb_session");
    const wrong = await call("/api/auth/account", { method: "PATCH", cookie: reader.cookie, body: { currentPassword: "sai", newPassword: "mat-khau-moi-123" } });
    assert.equal(wrong.status, 400);
    const ok = await call("/api/auth/account", { method: "PATCH", cookie: reader.cookie, body: { currentPassword: reader.password, newPassword: "mat-khau-moi-123", displayName: "Tên mới", role: "admin" } });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.json.user.role, "reader");
    assert.equal((await call("/api/auth/session", { cookie: other })).json.user, null);
    assert.equal((await call("/api/auth/session", { cookie: reader.cookie })).json.user.displayName, "Tên mới");
    reader.password = "mat-khau-moi-123";
  });

  await step("input limits, CSRF origin check", async () => {
    assert.equal((await call("/api/auth/login", { method: "POST", body: "{bad json" })).status, 400);
    assert.equal((await call("/api/auth/login", { method: "POST", body: { email: reader.email, password: "x".repeat(5000) } })).status, 401);
    assert.equal((await call("/api/auth/register", { method: "POST", body: { email: "a@b.cd", displayName: "x", password: "y".repeat(20000) } })).status, 413);
    const cross = await call("/api/auth/login", { method: "POST", headers: { Origin: "https://evil.example" }, body: { email: reader.email, password: reader.password } });
    assert.equal(cross.status, 403);
    assert.equal(cross.json.code, "cross_origin");
    assert.equal((await call("/api/admin/stories", { method: "DELETE", cookie: adminCookie, headers: { Origin: "https://evil.example" }, body: { id: storyB } })).status, 403);
    const same = await call("/api/auth/login", { method: "POST", headers: { Origin: new URL(base).origin }, body: { email: reader.email, password: reader.password } });
    assert.equal(same.status, 200);
  });

  await step("failed logins are limited across instances (shared PostgreSQL counter)", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await call("/api/auth/login", { url: attempt % 2 ? base2 : base, method: "POST", body: { email: reader.email, password: `sai-${attempt}` } });
      assert.equal(result.status, 401, `attempt ${attempt + 1}`);
    }
    const blocked = await call("/api/auth/login", { url: base2, method: "POST", body: { email: reader.email, password: reader.password } });
    assert.equal(blocked.status, 429, "Correct password is still blocked after the threshold");
    assert.equal(blocked.json.code, "rate_limited");
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    const other = await call("/api/auth/login", { url: base, method: "POST", body: { email: reader.email, password: reader.password } });
    assert.equal(other.status, 429);
  });

  console.log(`B1 auth test passed (${passed} groups).`);
} finally {
  if (adminCookie) {
    for (const id of createdStories) await call("/api/admin/stories", { method: "DELETE", cookie: adminCookie, body: { id } }).catch(() => undefined);
  }
  if (createdEmails.length) await db.query("DELETE FROM users WHERE email = ANY($1)", [createdEmails]);
  await db.end();
}
