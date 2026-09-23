// M2 integration test: settings API permissions, off/link/rewarded matrix, 5-minute revision-bound grants,
// rewarded callback forgery/replay, missing provider, display slots. LOCAL/TEST database only.
//
// Instance 1 (STORYWEB_TEST_URL) must run with:
//   CLICK_UNLOCK_ENABLED=true CLICK_UNLOCK_SECRET=<32+> CLICK_UNLOCK_URL=https://example.com/storyweb-test SHOPEE_GATE_APPROVED=false
//   REWARDED_AD_PROVIDER=mock REWARDED_MOCK_SECRET=<32+> STORYWEB_ALLOW_MOCK_REWARDED=1 DISPLAY_AD_PROVIDER=mock STORYWEB_ALLOW_MOCK_ADS=1
// Instance 2 (STORYWEB_TEST_URL_2) same DB and secrets but WITHOUT REWARDED_AD_PROVIDER (missing provider case).
// This script needs the same CLICK_UNLOCK_SECRET / REWARDED_MOCK_SECRET / STORYWEB_TEST_ADMIN_PASSWORD / DATABASE_URL.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";
import pg from "pg";

const base = process.env.STORYWEB_TEST_URL ?? "http://127.0.0.1:3100";
const base2 = process.env.STORYWEB_TEST_URL_2;
// Optional instance whose DATABASE_URL points nowhere (DB outage → everything must fail closed).
const base3 = process.env.STORYWEB_TEST_URL_DB_DOWN;
const adminPassword = process.env.STORYWEB_TEST_ADMIN_PASSWORD;
const unlockSecret = process.env.CLICK_UNLOCK_SECRET;
const mockSecret = process.env.REWARDED_MOCK_SECRET;
for (const [name, value] of Object.entries({ STORYWEB_TEST_ADMIN_PASSWORD: adminPassword, CLICK_UNLOCK_SECRET: unlockSecret, REWARDED_MOCK_SECRET: mockSecret, DATABASE_URL: process.env.DATABASE_URL, STORYWEB_TEST_URL_2: base2 })) {
  if (!value) throw new Error(`Set ${name}.`);
}
if (new URL(process.env.DATABASE_URL).pathname.slice(1) === "railway") throw new Error("Refusing to run against the production database.");

const run = randomUUID().slice(0, 8);
const ip = `203.0.113.${Number.parseInt(run.slice(0, 2), 16)}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let passed = 0;
let adminCookie;
let storyId;
const createdEmails = [];
const slug = `m2-${run}`;
const bodies = [1, 2, 3].map((n) => `Nội dung chương ${n} bí mật ${run}`);

/** node:http instead of fetch: undici forces Sec-Fetch-Mode: cors, so browser navigations cannot be simulated. */
function rawRequest(target, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(target, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const out = new Headers();
        for (const [key, value] of Object.entries(res.headers)) for (const item of [].concat(value ?? [])) out.append(key, item);
        resolve({ status: res.statusCode, headers: out, text: Buffer.concat(chunks).toString("utf8") });
      });
    });
    request.on("error", reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}

async function call(path, { method = "GET", body, cookie, headers = {}, url = base, origin = true } = {}) {
  const response = await rawRequest(`${url}${path}`, {
    method,
    headers: { "X-Forwarded-For": ip, ...(origin && method !== "GET" ? { Origin: new URL(url).origin } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = response.text;
  for (const secret of [unlockSecret, mockSecret, adminPassword]) assert.ok(!text.includes(secret), `Secret leaked from ${method} ${path}`);
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: response.status, json, text, headers: response.headers };
}

const cookieFrom = (result, name) => result.headers.getSetCookie().find((value) => value.startsWith(`${name}=`))?.split(";")[0];
const join = (...cookies) => cookies.filter(Boolean).join("; ");

async function step(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function settings(url = base) {
  const result = await call("/api/admin/settings", { cookie: adminCookie, url });
  assert.equal(result.status, 200, result.text);
  return result.json;
}

async function put(changes, { url = base, cookie = adminCookie } = {}) {
  const current = await settings(url);
  return call("/api/admin/settings", { method: "PUT", cookie, url, body: { version: current.settings.version, unlockEnabled: current.settings.unlockEnabled, unlockMode: current.settings.unlockMode, unlockLinkUrl: current.settings.unlockLinkUrl, adSlots: current.settings.adSlots, ...changes } });
}

function forgeGrant(mode, revision, expiresAt) {
  const payload = `v2.${mode}.${revision}.${expiresAt}`;
  return `storyweb_unlock=${payload}.${createHmac("sha256", unlockSecret).update(`storyweb-unlock|${payload}`).digest("hex")}`;
}

async function chapterVisible(number, cookie, url = base) {
  const html = await call(`/doc/${slug}/${number}`, { cookie, url });
  const inHtml = html.text.includes(bodies[number - 1]);
  // Client-navigation payload (RSC) must not leak a body the HTML withholds.
  const rsc = await fetch(`${url}/doc/${slug}/${number}?_rsc=m2`, { headers: { RSC: "1", "X-Forwarded-For": ip, ...(cookie ? { Cookie: cookie } : {}) } });
  if (!inHtml) assert.ok(!(await rsc.text()).includes(bodies[number - 1]), "locked body leaked in RSC payload");
  return { visible: inHtml, html: html.text };
}
const NAV = { "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-User": "?1", "Sec-Fetch-Dest": "document" };

function mockSign(nonce, providerRef) {
  return createHmac("sha256", mockSecret).update(`${nonce}.${providerRef}`).digest("hex");
}

try {
  console.log(`M2 test (run ${run}) against ${base} + ${base2}`);

  await step("setup: admin, editor, reader, 3-chapter story", async () => {
    const login = await call("/api/admin/login", { method: "POST", body: { password: adminPassword } });
    assert.equal(login.status, 200);
    adminCookie = cookieFrom(login, "storyweb_admin");
    await put({ unlockEnabled: false, unlockMode: "link", unlockLinkUrl: null, adSlots: { home_feed: false, story_detail: false, reader_end: false, search_results: false } });
    const created = await call("/api/admin/stories", { method: "POST", cookie: adminCookie, body: { slug, title: `Truyện ${slug}`, author: "M2", genre: "Đô thị", description: "Kiểm thử M2", tags: [], visibility: "published", completed: false, freeChapters: 1, chapters: bodies.map((body, i) => ({ title: `Chương ${i + 1}`, body })) } });
    assert.equal(created.status, 200, created.text);
    assert.equal(created.headers.get("cache-control"), "no-store", "CMS response with bodies must not be cached");
    storyId = created.json.story.id;
    const allStories = await call("/api/admin/stories", { cookie: adminCookie });
    assert.equal(allStories.headers.get("cache-control"), "no-store", "CMS list with bodies must not be cached");
  });

  let editorCookie, readerCookie;
  await step("settings API: 401 anonymous, 403 reader/editor, admin only, no secrets", async () => {
    const editorEmail = `m2-editor-${run}@example.test`;
    const readerEmail = `m2-reader-${run}@example.test`;
    createdEmails.push(editorEmail, readerEmail);
    assert.equal((await call("/api/admin/users", { method: "POST", cookie: adminCookie, body: { email: editorEmail, displayName: "Editor", password: "matkhau-editor", role: "editor" } })).status, 201);
    editorCookie = cookieFrom(await call("/api/auth/login", { method: "POST", body: { email: editorEmail, password: "matkhau-editor" } }), "storyweb_session");
    readerCookie = cookieFrom(await call("/api/auth/register", { method: "POST", body: { email: readerEmail, displayName: "Reader", password: "matkhau-reader" } }), "storyweb_session");
    assert.equal((await call("/api/admin/settings")).status, 401);
    assert.equal((await call("/api/admin/settings", { cookie: readerCookie })).status, 403);
    assert.equal((await call("/api/admin/settings", { cookie: editorCookie })).status, 403);
    assert.equal((await put({ unlockEnabled: true }, { cookie: editorCookie })).status, 403);
    const page = await call("/panel/cai-dat", { cookie: editorCookie });
    assert.ok(!page.text.includes("Bảo vệ chương khóa"));
    assert.equal((await call("/panel/cai-dat")).status, 307);
    const admin = await settings();
    assert.equal(admin.readiness.link.state, "ready");
    assert.equal(admin.readiness.rewarded.state, "ready");
    assert.equal(admin.effectiveMode, "off");
    assert.ok((await call("/panel/cai-dat", { cookie: adminCookie })).text.includes("Bảo vệ chương khóa"));
  });

  await step("settings validation, CSRF, version conflict", async () => {
    const cross = await call("/api/admin/settings", { method: "PUT", cookie: adminCookie, headers: { Origin: "https://evil.example" }, origin: false, body: {} });
    assert.equal(cross.status, 403);
    for (const bad of [{ unlockLinkUrl: "http://example.com/x" }, { unlockLinkUrl: "javascript:alert(1)" }, { unlockLinkUrl: "https://user:pw@example.com" }, { unlockMode: "popup" }, { adSlots: { home_feed: true, evil: true } }, { adSlots: { home_feed: "<script>" } }]) {
      const result = await put(bad);
      assert.equal(result.status, 400, JSON.stringify(bad));
    }
    const shopee = await put({ unlockLinkUrl: "https://shopee.vn/some-product" });
    assert.equal(shopee.status, 400);
    assert.match(shopee.json.fields.linkUrl, /Shopee/);
    const current = await settings();
    const stale = await call("/api/admin/settings", { method: "PUT", cookie: adminCookie, body: { version: current.settings.version - 1, unlockEnabled: false, unlockMode: "link", unlockLinkUrl: null, adSlots: current.settings.adSlots } });
    assert.equal(stale.status, 409);
    assert.equal(stale.json.code, "conflict");
  });

  await step("mode off: chapter 1 free, chapter 2 locked in HTML and RSC, no grants", async () => {
    assert.ok((await chapterVisible(1)).visible);
    const locked = await chapterVisible(2);
    assert.ok(!locked.visible);
    assert.ok(!locked.html.includes("Mở liên kết giới thiệu") && !locked.html.includes("Xem quảng cáo mở khóa"));
    assert.equal((await call("/unlock/visit", { method: "POST", headers: NAV })).status, 405);
    assert.equal((await call("/api/unlock/rewarded/start", { method: "POST" })).status, 503);
  });

  let linkGrant, linkRevision;
  await step("link mode: GET navigation only, Fetch Metadata, 303 + 5-minute grant", async () => {
    const before = (await settings()).settings.unlockRevision;
    const enable = await put({ unlockEnabled: true, unlockMode: "link" });
    assert.equal(enable.status, 200, enable.text);
    linkRevision = enable.json.settings.unlockRevision;
    assert.equal(linkRevision, before + 1);
    assert.equal(enable.json.effectiveMode, "link");
    assert.ok((await chapterVisible(2)).html.includes("Mở liên kết giới thiệu"));
    // GET (U4 <a target=_blank>) needs Fetch Metadata of a user-activated same-origin navigation.
    assert.equal((await call("/unlock/visit")).status, 400, "GET without Fetch Metadata");
    assert.equal((await call("/unlock/visit", { headers: { ...NAV, "Sec-Fetch-Site": "cross-site" } })).status, 400, "cross-site link");
    assert.equal((await call("/unlock/visit", { headers: { ...NAV, "Sec-Fetch-User": "?0" } })).status, 400, "not user-activated");
    assert.equal((await call("/unlock/visit", { headers: { ...NAV, "Sec-Fetch-Dest": "image" } })).status, 400, "<img> request");
    assert.equal((await call("/unlock/visit", { headers: { ...NAV, "Sec-Purpose": "prefetch" } })).status, 400, "prefetch");
    const viaGet = await call("/unlock/visit", { headers: NAV });
    assert.equal(viaGet.status, 303);
    assert.ok(cookieFrom(viaGet, "storyweb_unlock"));
    assert.equal((await call("/unlock/visit", { method: "POST" })).status, 405, "bare POST cannot grant");
    assert.equal((await call("/unlock/visit", { method: "POST", headers: NAV })).status, 405, "POST with spoofed headers cannot grant");
    assert.equal(viaGet.headers.get("location"), "https://example.com/storyweb-test");
    assert.match(viaGet.headers.getSetCookie().find((value) => value.startsWith("storyweb_unlock=")), /Max-Age=300/i);
    linkGrant = cookieFrom(viaGet, "storyweb_unlock");
    assert.ok((await chapterVisible(2, linkGrant)).visible);
    assert.ok((await chapterVisible(3, linkGrant)).visible);
  });

  await step("grant checks: tampered, expired, wrong revision/mode, legacy cookie rejected", async () => {
    assert.ok(!(await chapterVisible(2, `${linkGrant}0`)).visible);
    assert.ok(!(await chapterVisible(2, forgeGrant("link", linkRevision, Date.now() - 1000))).visible, "expired grant");
    assert.ok(!(await chapterVisible(2, forgeGrant("link", linkRevision, Date.now() + 60 * 60 * 1000))).visible, "grant longer than 5 minutes");
    assert.ok(!(await chapterVisible(2, forgeGrant("link", linkRevision - 1, Date.now() + 60_000))).visible, "old revision");
    assert.ok(!(await chapterVisible(2, forgeGrant("rewarded", linkRevision, Date.now() + 60_000))).visible, "wrong mode");
    assert.ok((await chapterVisible(2, forgeGrant("link", linkRevision, Date.now() + 60_000))).visible, "control: valid signature works");
    assert.ok(!(await chapterVisible(2, `storyweb_click_unlock=${Date.now() + 60_000}.${"a".repeat(64)}`)).visible, "pre-M2 cookie");
  });

  let rewardedRevision;
  await step("switching to rewarded bumps revision and revokes link grants", async () => {
    const result = await put({ unlockMode: "rewarded" });
    assert.equal(result.status, 200, result.text);
    rewardedRevision = result.json.settings.unlockRevision;
    assert.equal(rewardedRevision, linkRevision + 1);
    assert.ok(!(await chapterVisible(2, linkGrant)).visible);
    assert.equal((await call("/unlock/visit", { headers: NAV })).status, 503);
    assert.ok((await chapterVisible(2)).html.includes("Xem quảng cáo mở khóa"));
  });

  await step("rewarded: forged/replayed callbacks, wrong reader, single claim", async () => {
    const start = await call("/api/unlock/rewarded/start", { method: "POST" });
    assert.equal(start.status, 200, start.text);
    const reader = cookieFrom(start, "storyweb_reader");
    const { nonce } = start.json;
    assert.match(nonce, /^[a-f0-9]{64}$/);
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", cookie: reader, body: { nonce } })).status, 202, "not verified yet");
    const ref = `ref-${run}-1`;
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce, providerRef: ref, signature: "0".repeat(64) } })).status, 401, "forged signature");
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce, providerRef: ref } })).status, 401, "missing signature");
    const ok = await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce, providerRef: ref, signature: mockSign(nonce, ref) } });
    assert.equal(ok.status, 200, ok.text);
    const replay = await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce, providerRef: ref, signature: mockSign(nonce, ref) } });
    assert.equal(replay.status, 200);
    assert.equal(replay.json.status, "already");
    const other = await call("/api/unlock/rewarded/start", { method: "POST" });
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce: other.json.nonce, providerRef: ref, signature: mockSign(other.json.nonce, ref) } })).status, 409, "providerRef reused");
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", cookie: cookieFrom(other, "storyweb_reader"), body: { nonce } })).status, 409, "other reader cannot claim");
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", body: { nonce } })).status, 409, "no reader cookie");
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", cookie: reader, origin: false, headers: { Origin: "https://evil.example" }, body: { nonce } })).status, 403);
    const claim = await call("/api/unlock/rewarded/claim", { method: "POST", cookie: reader, body: { nonce } });
    assert.equal(claim.status, 200, claim.text);
    assert.equal(claim.json.status, "granted");
    const grant = cookieFrom(claim, "storyweb_unlock");
    assert.ok((await chapterVisible(2, grant)).visible);
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", cookie: reader, body: { nonce } })).status, 409, "claim replay");
  });

  await step("rewarded: closed/no-fill/error never grants; revision change voids pending nonce", async () => {
    const start = await call("/api/unlock/rewarded/start", { method: "POST" });
    const reader = cookieFrom(start, "storyweb_reader");
    const { nonce } = start.json;
    assert.equal((await call("/api/unlock/rewarded/cancel", { method: "POST", cookie: reader, body: { nonce } })).status, 200);
    const ref = `ref-${run}-2`;
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce, providerRef: ref, signature: mockSign(nonce, ref) } })).status, 409, "cancelled nonce cannot be verified");
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", cookie: reader, body: { nonce } })).status, 409);

    const second = await call("/api/unlock/rewarded/start", { method: "POST", cookie: reader });
    await put({ unlockEnabled: false });
    await put({ unlockEnabled: true, unlockMode: "rewarded" });
    const ref3 = `ref-${run}-3`;
    await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce: second.json.nonce, providerRef: ref3, signature: mockSign(second.json.nonce, ref3) } });
    assert.equal((await call("/api/unlock/rewarded/claim", { method: "POST", cookie: reader, body: { nonce: second.json.nonce } })).status, 409, "nonce from old revision");
  });

  await step("missing provider: rewarded cannot be enabled; readers see mode off", async () => {
    const view = await settings(base2);
    assert.equal(view.readiness.rewarded.state, "unconfigured");
    assert.equal(view.effectiveMode, "off");
    const refuse = await put({ unlockEnabled: true, unlockMode: "rewarded" }, { url: base2 });
    assert.equal(refuse.status, 409);
    assert.equal(refuse.json.code, "mode_not_ready");
    const page = await chapterVisible(2, undefined, base2);
    assert.ok(!page.visible && !page.html.includes("Xem quảng cáo mở khóa"), "no fake rewarded button");
    assert.equal((await call("/api/unlock/rewarded/start", { method: "POST", url: base2 })).status, 503);
    assert.equal((await call("/api/unlock/rewarded/mock-complete", { method: "POST", url: base2, body: { nonce: "a".repeat(64) } })).status, 404);
    // Provider callback while no provider is configured → 503, never verified.
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, url: base2, body: { nonce: "a".repeat(64), providerRef: "ref-x-0000", signature: "0".repeat(64) } })).status, 503);
  });

  await step("provider errors: malformed callback bodies are rejected", async () => {
    const raw = await fetch(`${base}/api/unlock/rewarded/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
    assert.equal(raw.status, 400);
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce: "zz", providerRef: "x", signature: "y" } })).status, 401);
    assert.equal((await call("/api/unlock/rewarded/callback", { method: "POST", origin: false, body: { nonce: "b".repeat(64), providerRef: `ref-${run}-9`, signature: mockSign("b".repeat(64), `ref-${run}-9`) } })).status, 409, "unknown nonce");
  });

  if (base3) await step("database outage: unlock, grants and settings fail closed", async () => {
    const forged = forgeGrant("link", 1, Date.now() + 60_000);
    assert.equal((await call("/unlock/visit", { method: "POST", url: base3, headers: NAV })).status, 405);
    assert.equal((await call("/unlock/visit", { url: base3, headers: NAV })).status, 503);
    assert.equal((await call("/api/unlock/rewarded/start", { method: "POST", url: base3 })).status, 503);
    assert.equal((await call("/api/admin/settings", { cookie: adminCookie, url: base3 })).status, 503);
    const locked = await call("/doc/thanh-pho-sau-con-mua/3", { url: base3, cookie: forged });
    assert.ok(locked.status >= 500 || !locked.text.includes("reader-text"), "no chapter body while settings are unreadable");
  });

  await step("display slots: hidden when off, rendered when on, reader_end only on readable chapters", async () => {
    assert.ok(!(await call("/")).text.includes('data-ad-placement'));
    const on = await put({ unlockEnabled: false, adSlots: { home_feed: true, story_detail: true, reader_end: true, search_results: true } });
    assert.equal(on.status, 200, on.text);
    assert.equal(on.json.settings.unlockRevision, rewardedRevision + 3, "slot changes alone do not bump revision");
    assert.ok((await call("/")).text.includes('data-ad-placement="home_feed"'));
    assert.ok((await call(`/truyen/${slug}`)).text.includes('data-ad-placement="story_detail"'));
    assert.ok((await call(`/doc/${slug}/1`)).text.includes('data-ad-placement="reader_end"'));
    assert.ok(!(await call(`/doc/${slug}/2`)).text.includes('data-ad-placement="reader_end"'), "no reader_end ad on locked chapter");
    assert.ok(!(await call("/", { url: base2 })).text.includes("data-ad-placement"), "no provider on instance 2 → nothing rendered");
  });

  await step("audit trail records admin changes without secrets", async () => {
    const { rows } = await db.query("SELECT actor_label, before, after FROM site_settings_audit ORDER BY changed_at DESC LIMIT 5");
    assert.ok(rows.length >= 5);
    assert.ok(rows.every((row) => row.actor_label));
    const text = JSON.stringify(rows);
    assert.ok(!text.includes(unlockSecret) && !text.includes(mockSecret));
  });

  console.log(`M2 test passed (${passed} groups).`);
} finally {
  if (adminCookie) {
    await put({ unlockEnabled: false, unlockMode: "link", unlockLinkUrl: null, adSlots: { home_feed: false, story_detail: false, reader_end: false, search_results: false } }).catch(() => undefined);
    if (storyId) await call("/api/admin/stories", { method: "DELETE", cookie: adminCookie, body: { id: storyId } }).catch(() => undefined);
  }
  if (createdEmails.length) await db.query("DELETE FROM users WHERE email = ANY($1)", [createdEmails]);
  await db.end();
}
