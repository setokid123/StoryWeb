// M3: end-to-end check of the LINK unlock flow in a production-like test environment (no rewarded provider,
// no mocks, SHOPEE_GATE_APPROVED=false, destination https://example.com/). Separate TEST database only.
//
// App env:  CLICK_UNLOCK_ENABLED=true CLICK_UNLOCK_SECRET=<32+> CLICK_UNLOCK_URL=https://example.com/ SHOPEE_GATE_APPROVED=false
//           (REWARDED_AD_PROVIDER unset)
// Run:      STORYWEB_TEST_URL=http://127.0.0.1:3100 STORYWEB_TEST_ADMIN_PASSWORD=... CLICK_UNLOCK_SECRET=... \
//           DATABASE_URL=postgres://.../storyweb_test node scripts/test-unlock-link.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";

const base = process.env.STORYWEB_TEST_URL ?? "http://127.0.0.1:3100";
const adminPassword = process.env.STORYWEB_TEST_ADMIN_PASSWORD;
const unlockSecret = process.env.CLICK_UNLOCK_SECRET;
// Must equal the app instance CLICK_UNLOCK_URL.
const destination = process.env.STORYWEB_TEST_LINK_URL ?? "https://example.com/";
if (!adminPassword || !unlockSecret) throw new Error("Set STORYWEB_TEST_ADMIN_PASSWORD and CLICK_UNLOCK_SECRET (same as the app).");
if (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname.slice(1) === "railway") throw new Error("Refusing to run against the production database.");

const run = randomUUID().slice(0, 8);
const slug = `m3-link-${run}`;
const bodies = [1, 2, 3].map((n) => `Thân chương ${n} riêng tư ${run}`);
const NAV = { "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-User": "?1", "Sec-Fetch-Dest": "document" };
let adminCookie;
let storyId;
let passed = 0;

/** node:http (fetch cannot send Sec-Fetch-Mode: navigate). */
function request(path, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${path}`, { method, headers: { "X-Forwarded-For": `198.18.0.${Number.parseInt(run.slice(0, 2), 16)}`, ...(body !== undefined ? { "Content-Type": "application/json", Origin: new URL(base).origin } : {}), ...headers } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        assert.ok(!text.includes(unlockSecret) && !text.includes(adminPassword), `secret leaked from ${path}`);
        let json;
        try { json = JSON.parse(text); } catch { json = undefined; }
        resolve({ status: res.statusCode, headers: res.headers, text, json, cookies: [].concat(res.headers["set-cookie"] ?? []) });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

const cookieValue = (res, name) => res.cookies.find((c) => c.startsWith(`${name}=`))?.split(";")[0];

async function step(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function settings() {
  const res = await request("/api/admin/settings", { headers: { Cookie: adminCookie } });
  assert.equal(res.status, 200, res.text);
  return res.json;
}

async function put(changes) {
  const current = await settings();
  return request("/api/admin/settings", { method: "PUT", headers: { Cookie: adminCookie }, body: { version: current.settings.version, unlockEnabled: current.settings.unlockEnabled, unlockMode: current.settings.unlockMode, unlockLinkUrl: current.settings.unlockLinkUrl, adSlots: current.settings.adSlots, ...changes } });
}

/** Chapter body visibility in both the HTML document and the RSC payload used by client navigation/refresh. */
async function chapter(number, cookie) {
  const headers = cookie ? { Cookie: cookie } : {};
  const html = await request(`/doc/${slug}/${number}`, { headers });
  // Next 16 answers RSC requests on `?_rsc` (a mismatching value is redirected there).
  const rsc = await request(`/doc/${slug}/${number}?_rsc`, { headers: { ...headers, RSC: "1" } });
  assert.equal(rsc.status, 200, `RSC ${number} status`);
  const body = bodies[number - 1];
  return { status: html.status, html: html.text, inHtml: html.text.includes(body), inRsc: rsc.status === 200 && rsc.text.includes(body), rscStatus: rsc.status };
}

function signedGrant(revision, expiresAt) {
  const payload = `v2.link.${revision}.${expiresAt}`;
  return `storyweb_unlock=${payload}.${createHmac("sha256", unlockSecret).update(`storyweb-unlock|${payload}`).digest("hex")}`;
}

try {
  console.log(`M3 link unlock test (run ${run}) against ${base}`);

  await step("setup: admin login, unlock off, 3-chapter story (chapter 1 free)", async () => {
    const login = await request("/api/admin/login", { method: "POST", body: { password: adminPassword } });
    assert.equal(login.status, 200, login.text);
    adminCookie = cookieValue(login, "storyweb_admin");
    assert.equal((await put({ unlockEnabled: false, unlockMode: "link", unlockLinkUrl: null })).status, 200);
    const created = await request("/api/admin/stories", { method: "POST", headers: { Cookie: adminCookie }, body: { slug, title: `Thử mở khóa ${run}`, author: "M3", genre: "Đô thị", description: "Truyện thử luồng mở khóa link", tags: [], visibility: "published", completed: false, freeChapters: 1, chapters: bodies.map((body, i) => ({ title: `Chương ${i + 1}`, body })) } });
    assert.equal(created.status, 200, created.text);
    storyId = created.json.story.id;
  });

  await step("unlock off: chapter 1 readable, chapter 2 body absent from HTML and RSC", async () => {
    const c1 = await chapter(1);
    assert.ok(c1.inHtml && c1.inRsc, "chapter 1 is free");
    const c2 = await chapter(2);
    assert.equal(c2.status, 200);
    assert.ok(!c2.inHtml && !c2.inRsc, "locked body must not be sent");
    assert.equal((await request("/unlock/visit", { headers: NAV })).status, 503, "no grant while unlock is off");
  });

  await step("server blocks invalid destinations and Shopee without approval; rewarded stays unconfigured", async () => {
    const before = (await settings()).settings.unlockRevision;
    const cases = [
      ["http://example.com/", /https/],
      ["javascript:alert(1)", /./],
      ["https://user:pw@example.com/", /đăng nhập/],
      ["https://127.0.0.1/", /tên miền/],
      ["https://evil.example.net/", /Shopee/],
      ["https://shopee.vn/product/1", /chấp thuận/],
      ["https://shp.ee/abc", /chấp thuận/],
    ];
    for (const [url, reason] of cases) {
      const res = await put({ unlockEnabled: true, unlockMode: "link", unlockLinkUrl: url });
      assert.equal(res.status, 400, `${url} → ${res.status}`);
      assert.match(res.json.fields.linkUrl, reason, url);
    }
    const view = await settings();
    assert.equal(view.settings.unlockRevision, before, "rejected saves do not change the revision");
    assert.equal(view.readiness.link.state, "ready");
    assert.equal(view.readiness.rewarded.state, "unconfigured");
    const rewarded = await put({ unlockEnabled: true, unlockMode: "rewarded" });
    assert.equal(rewarded.status, 409);
    assert.equal(rewarded.json.code, "mode_not_ready");
    assert.equal((await request("/api/unlock/rewarded/mock-complete", { method: "POST", body: { nonce: "a".repeat(64) } })).status, 404, "no mock outside dev/test");
  });

  let revision;
  await step("admin enables link mode (env CLICK_UNLOCK_URL, example.com); locked page shows only the link action", async () => {
    const res = await put({ unlockEnabled: true, unlockMode: "link", unlockLinkUrl: null });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.json.effectiveMode, "link");
    revision = res.json.settings.unlockRevision;
    const c2 = await chapter(2);
    assert.ok(!c2.inHtml && !c2.inRsc, "still locked before the reader clicks");
    assert.match(c2.html, /href="\/unlock\/visit"/);
    assert.match(c2.html, /target="_blank"/);
    assert.ok(!c2.html.includes("Xem quảng cáo mở khóa"), "no rewarded button");
  });

  let grant;
  await step("only a user-initiated same-origin click grants: 303 to example.com + 5-minute HttpOnly cookie", async () => {
    assert.equal((await request("/unlock/visit")).status, 400, "no Fetch Metadata");
    assert.equal((await request("/unlock/visit", { headers: { ...NAV, "Sec-Fetch-Site": "cross-site" } })).status, 400);
    assert.equal((await request("/unlock/visit", { headers: { ...NAV, "Sec-Fetch-User": "?0" } })).status, 400);
    assert.equal((await request("/unlock/visit", { headers: { ...NAV, "Sec-Purpose": "prefetch" } })).status, 400);
    assert.equal((await request("/unlock/visit", { method: "POST", headers: NAV })).status, 405);
    const visit = await request("/unlock/visit", { headers: NAV });
    assert.equal(visit.status, 303);
    assert.equal(visit.headers.location, destination);
    const setCookie = visit.cookies.find((c) => c.startsWith("storyweb_unlock="));
    assert.match(setCookie, /Max-Age=300/i);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    grant = cookieValue(visit, "storyweb_unlock");
  });

  await step("with the grant: chapter 2 and the next chapter read; RSC refresh (tab focus) returns the body", async () => {
    for (const n of [2, 3]) {
      const c = await chapter(n, grant);
      assert.ok(c.inHtml, `chapter ${n} HTML`);
      assert.ok(c.inRsc, `chapter ${n} RSC (router.refresh after returning to the tab)`);
    }
    assert.ok(!(await chapter(2, `${grant}0`)).inHtml, "tampered cookie");
  });

  await step("expiry: a grant that runs out locks the chapter again (HTML and RSC)", async () => {
    const shortGrant = signedGrant(revision, Date.now() + 2000);
    assert.ok((await chapter(2, shortGrant)).inHtml, "valid before expiry");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const after = await chapter(2, shortGrant);
    assert.ok(!after.inHtml && !after.inRsc, "expired grant must not return the body");
    assert.ok(!(await chapter(2, signedGrant(revision, Date.now() + 10 * 60 * 1000))).inHtml, "grants longer than 5 minutes are rejected");
  });

  await step("turning unlock off revokes existing grants immediately", async () => {
    assert.equal((await put({ unlockEnabled: false })).status, 200);
    const c2 = await chapter(2, grant);
    assert.ok(!c2.inHtml && !c2.inRsc);
    assert.ok((await chapter(1, grant)).inHtml, "chapter 1 stays free");
  });

  console.log(`M3 link unlock test passed (${passed} groups).`);
} finally {
  if (adminCookie) {
    await put({ unlockEnabled: false, unlockMode: "link", unlockLinkUrl: null }).catch(() => undefined);
    if (storyId) await request("/api/admin/stories", { method: "DELETE", headers: { Cookie: adminCookie }, body: { id: storyId } }).catch(() => undefined);
  }
}
