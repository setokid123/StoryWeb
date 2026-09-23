import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.STORYWEB_TEST_URL ?? "http://127.0.0.1:3000";
const password = process.env.STORYWEB_TEST_ADMIN_PASSWORD;
const gateMode = process.env.STORYWEB_TEST_GATE_MODE ?? "example";
if (!password) throw new Error("Set STORYWEB_TEST_ADMIN_PASSWORD before running this smoke test.");
if (!["example", "disabled"].includes(gateMode)) throw new Error("STORYWEB_TEST_GATE_MODE must be example or disabled.");

const slug = `smoke-${randomUUID().slice(0, 8)}`;
const firstText = `Nội dung chương một ${slug}`;
const secondText = `Nội dung chương hai ${slug}`;
const thirdText = `Nội dung chương ba ${slug}`;
let id;
let adminCookie;

try {
  const unauthorized = await fetch(`${base}/api/admin/stories`);
  assert.equal(unauthorized.status, 401);

  const login = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  assert.equal(login.status, 200);
  adminCookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(adminCookie?.startsWith("storyweb_admin="));

  const draft = await fetch(`${base}/api/admin/stories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ slug, title: "Truyện kiểm thử", author: "", genre: "Đô thị", description: "", tags: [], visibility: "draft", completed: false, freeChapters: 1, chapters: [{ title: "", body: "" }] }),
  });
  if (!draft.ok) throw new Error(`Draft failed ${draft.status}: ${await draft.text()}`);
  id = (await draft.json()).story.id;
  assert.equal((await fetch(`${base}/truyen/${slug}`)).status, 404);

  const create = await fetch(`${base}/api/admin/stories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ id, slug, title: "Truyện kiểm thử", author: "Smoke Test", genre: "Đô thị", description: "Kiểm tra luồng xuất bản và khóa chương.", tags: ["test"], visibility: "published", completed: false, freeChapters: 1, chapters: [{ title: "Chương một", body: firstText }, { title: "Chương hai", body: secondText }, { title: "Chương ba", body: thirdText }] }),
  });
  if (!create.ok) throw new Error(`Create failed ${create.status}: ${await create.text()}`);
  id = (await create.json()).story.id;

  const detail = await fetch(`${base}/truyen/${slug}`);
  assert.equal(detail.status, 200);
  assert.match(await detail.text(), /Truyện kiểm thử/);

  const first = await fetch(`${base}/doc/${slug}/1`);
  assert.match(await first.text(), new RegExp(firstText));
  const secondLocked = await fetch(`${base}/doc/${slug}/2`);
  const lockedHtml = await secondLocked.text();
  assert.match(lockedHtml, /Mở trang truyện tiếp theo/);
  assert.ok(!lockedHtml.includes(secondText), "Locked chapter body leaked into HTML");

  // Link unlock is a same-origin POST from the reader's click (GET never grants).
  assert.equal((await fetch(`${base}/unlock/visit`, { redirect: "manual" })).status, 405);
  if (gateMode === "example") {
    // Admin enables link mode through the settings API (requires CLICK_UNLOCK_ENABLED=true + example.com URL on the server).
    const current = await (await fetch(`${base}/api/admin/settings`, { headers: { Cookie: adminCookie } })).json();
    const enable = await fetch(`${base}/api/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: adminCookie }, body: JSON.stringify({ version: current.settings.version, unlockEnabled: true, unlockMode: "link", unlockLinkUrl: null, adSlots: current.settings.adSlots }) });
    if (!enable.ok) throw new Error(`Enable link mode failed ${enable.status}: ${await enable.text()}`);
  }
  const visit = await fetch(`${base}/unlock/visit`, { method: "POST", redirect: "manual", headers: { Origin: new URL(base).origin } });
  if (gateMode === "disabled") {
    assert.equal(visit.status, 503);
    assert.equal(visit.headers.get("set-cookie"), null);
    console.log("Smoke test passed: admin auth, PostgreSQL publication, free chapter, locked chapter, disabled gate.");
  } else {
    assert.equal(visit.status, 303);
    assert.equal(visit.headers.get("location"), "https://example.com/storyweb-test");
    const unlockHeader = visit.headers.getSetCookie().find((value) => value.startsWith("storyweb_unlock=")) ?? "";
    assert.match(unlockHeader, /Max-Age=300/i);
    const unlockCookie = unlockHeader.split(";")[0];

    const secondOpen = await fetch(`${base}/doc/${slug}/2`, { headers: { Cookie: unlockCookie } });
    assert.match(await secondOpen.text(), new RegExp(secondText));
    const thirdOpen = await fetch(`${base}/doc/${slug}/3`, { headers: { Cookie: unlockCookie } });
    assert.match(await thirdOpen.text(), new RegExp(thirdText));

    const tampered = await fetch(`${base}/doc/${slug}/2`, { headers: { Cookie: `${unlockCookie}x` } });
    assert.ok(!(await tampered.text()).includes(secondText));
    console.log("Smoke test passed: admin auth, publication, locked chapter, 5-minute cookie, next chapter, tamper check.");
  }
} finally {
  if (id && adminCookie) {
    const cleanup = await fetch(`${base}/api/admin/stories`, { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: adminCookie }, body: JSON.stringify({ id }) });
    if (!cleanup.ok) throw new Error(`Smoke cleanup failed ${cleanup.status}: ${await cleanup.text()}`);
  }
}
