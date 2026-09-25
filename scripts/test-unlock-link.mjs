// M3/M4: end-to-end check of the LINK unlock flow in a production-like test environment (no rewarded provider,
// no mocks, SHOPEE_GATE_APPROVED=false, destination https://example.com/). Separate TEST database only.
//
// App env:  CLICK_UNLOCK_ENABLED=true CLICK_UNLOCK_SECRET=<32+> CLICK_UNLOCK_URL=https://example.com/ SHOPEE_GATE_APPROVED=false
//           (REWARDED_AD_PROVIDER unset)
// Run:      STORYWEB_TEST_URL=http://127.0.0.1:3100 STORYWEB_TEST_ADMIN_PASSWORD=... CLICK_UNLOCK_SECRET=... \
//           DATABASE_URL=postgres://.../storyweb_test node scripts/test-unlock-link.mjs
// Optional: STORYWEB_TEST_URL_FLAG_OFF=http://127.0.0.1:3103 (same DB, CLICK_UNLOCK_ENABLED=false) for the 409 check.
// M4 also saves https://www.wikipedia.org/... as the admin URL; the server never fetches it.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";

const base = process.env.STORYWEB_TEST_URL ?? "http://127.0.0.1:3100";
const adminPassword = process.env.STORYWEB_TEST_ADMIN_PASSWORD;
const unlockSecret = process.env.CLICK_UNLOCK_SECRET;
// Must equal the app instance CLICK_UNLOCK_URL.
const destination = process.env.STORYWEB_TEST_LINK_URL ?? "https://example.com/";
if (!adminPassword || !unlockSecret) throw new Error("Set STORYWEB_TEST_ADMIN_PASSWORD and CLICK_UNLOCK_SECRET (same as the app).");
const flagOffBase = process.env.STORYWEB_TEST_URL_FLAG_OFF;
for (const url of [base, flagOffBase].filter(Boolean)) {
  const target = new URL(url);
  if (target.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) throw new Error("This mutating test only runs against a local app URL.");
}
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to an isolated storyweb_test database.");
const databaseName = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));
if (!/^storyweb_(?:test(?:_[a-z0-9_]+)?|[mc]\d+_(?:[a-z0-9_]*_)?test(?:_[a-z0-9_]+)?)$/i.test(databaseName)) {
  throw new Error("This mutating test requires a test database named storyweb_test or storyweb_<task>_test (for example storyweb_c1_test).");
}

const run = randomUUID().slice(0, 8);
const slug = `m3-link-${run}`;
// M4: a public non-Shopee destination saved by the admin (the canonical form the server stores).
const genericUrl = "https://www.wikipedia.org/wiki/Truy%E1%BB%87n?ref=storyweb";
const bodies = [1, 2, 3].map((n) => `Thân chương ${n} riêng tư ${run}`);
const NAV = { "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-User": "?1", "Sec-Fetch-Dest": "document" };
let adminCookie;
let storyId;
let passed = 0;

/** node:http (fetch cannot send Sec-Fetch-Mode: navigate). */
function request(path, { method = "GET", headers = {}, body, origin = base } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${origin}${path}`, { method, headers: { "X-Forwarded-For": `198.18.0.${Number.parseInt(run.slice(0, 2), 16)}`, ...(body !== undefined ? { "Content-Type": "application/json", Origin: new URL(origin).origin } : {}), ...headers } }, (res) => {
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
      ["javascript:alert(1)", /https/],
      ["data:text/html,hi", /https/],
      ["file:///etc/passwd", /https/],
      ["https://user:pw@example.com/", /đăng nhập/],
      ["https://127.0.0.1/", /tên miền công khai/],
      ["https://0x7f.1/", /tên miền công khai/],
      ["https://[::1]/", /tên miền công khai/],
      ["https://localhost/", /tên miền công khai/],
      ["https://app.localhost/", /tên miền công khai/],
      ["https://intranet/", /tên miền công khai/],
      ["https://storyweb.internal/", /tên miền công khai/],
      ["https://nas.local/", /tên miền công khai/],
      ["https://exa mple.com/", /không hợp lệ/],
      ["https://", /không hợp lệ/],
      [`https://example.com/${"a".repeat(2050)}`, /quá dài/],
      ["https://shopee.vn/product/1", /chấp thuận/],
      ["https://SHOPEE.VN./product/1", /chấp thuận/],
      ["https://m.shopee.vn/x", /chấp thuận/],
      ["https://shp.ee/abc", /chấp thuận/],
      ["https://shope.ee/abc", /chấp thuận/],
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

  // M4: any public https domain, saved with the switch off, then enabled.
  let genericGrant;
  await step("M4: a non-Shopee public URL is saved (normalized) with the switch off, reloads, then enables link mode", async () => {
    const saved = await put({ unlockEnabled: false, unlockMode: "link", unlockLinkUrl: "  https://WWW.Wikipedia.org./wiki/Truy%E1%BB%87n?ref=storyweb  " });
    assert.equal(saved.status, 200, saved.text);
    assert.equal(saved.json.settings.unlockLinkUrl, genericUrl, "stored in canonical form");
    assert.equal(saved.json.effectiveMode, "off");
    const reloaded = await settings();
    assert.equal(reloaded.settings.unlockLinkUrl, genericUrl, "persisted");
    assert.equal(reloaded.readiness.link.state, "ready");
    assert.equal((await request("/unlock/visit", { headers: NAV })).status, 503, "no grant while the switch is off");
    assert.ok(!(await chapter(2)).inHtml, "still locked while off");
    const enabled = await put({ unlockEnabled: true });
    assert.equal(enabled.status, 200, enabled.text);
    assert.equal(enabled.json.effectiveMode, "link");
    assert.equal(enabled.json.settings.unlockLinkUrl, genericUrl);
    const c2 = await chapter(2);
    assert.ok(!c2.inHtml && !c2.inRsc, "locked before the click");
    const visit = await request("/unlock/visit", { headers: NAV });
    assert.equal(visit.status, 303);
    assert.equal(visit.headers.location, genericUrl, "redirects to the admin URL, not CLICK_UNLOCK_URL");
    assert.match(visit.cookies.find((c) => c.startsWith("storyweb_unlock=")), /Max-Age=300/i);
    genericGrant = cookieValue(visit, "storyweb_unlock");
    for (const n of [2, 3]) {
      const c = await chapter(n, genericGrant);
      assert.ok(c.inHtml && c.inRsc, `chapter ${n} readable with the grant`);
    }
    assert.ok(!(await chapter(2, grant)).inHtml, "grant from an older revision stays invalid");
  });

  await step("M4: changing the URL bumps the revision and revokes grants; example.com still works; Shopee stays gated", async () => {
    const before = (await settings()).settings.unlockRevision;
    const changed = await put({ unlockLinkUrl: "https://example.com/" });
    assert.equal(changed.status, 200, changed.text);
    assert.equal(changed.json.settings.unlockRevision, before + 1);
    assert.equal(changed.json.effectiveMode, "link");
    const c2 = await chapter(2, genericGrant);
    assert.ok(!c2.inHtml && !c2.inRsc, "grant for the previous URL is revoked");
    const visit = await request("/unlock/visit", { headers: NAV });
    assert.equal(visit.status, 303);
    assert.equal(visit.headers.location, "https://example.com/");
    assert.ok((await chapter(2, cookieValue(visit, "storyweb_unlock"))).inHtml);
    const shopee = await put({ unlockLinkUrl: "https://shopee.vn/product/1" });
    assert.equal(shopee.status, 400);
    assert.match(shopee.json.fields.linkUrl, /chấp thuận/);
    assert.equal((await settings()).settings.unlockLinkUrl, "https://example.com/", "a rejected save keeps the stored URL");
    const lookalike = await put({ unlockLinkUrl: "https://shopee.vn.evil-example.com/x" });
    assert.equal(lookalike.status, 200, "shopee.vn.<other>.com is not Shopee and is not gated");
    assert.equal((await put({ unlockEnabled: false, unlockLinkUrl: null })).status, 200);
  });

  if (flagOffBase) {
    await step("M4: with CLICK_UNLOCK_ENABLED=false the URL still saves; enabling returns 409 on unlockMode (not the URL field)", async () => {
      const login = await request("/api/admin/login", { method: "POST", body: { password: adminPassword }, origin: flagOffBase });
      assert.equal(login.status, 200, login.text);
      const cookie = cookieValue(login, "storyweb_admin");
      const current = (await request("/api/admin/settings", { headers: { Cookie: cookie }, origin: flagOffBase })).json;
      const body = { version: current.settings.version, unlockEnabled: false, unlockMode: "link", unlockLinkUrl: "https://www.wikipedia.org/", adSlots: current.settings.adSlots };
      const saved = await request("/api/admin/settings", { method: "PUT", headers: { Cookie: cookie }, body, origin: flagOffBase });
      assert.equal(saved.status, 200, saved.text);
      assert.equal(saved.json.readiness.link.state, "blocked");
      assert.match(saved.json.readiness.link.reason, /CLICK_UNLOCK_ENABLED/);
      const enable = await request("/api/admin/settings", { method: "PUT", headers: { Cookie: cookie }, body: { ...body, version: saved.json.settings.version, unlockEnabled: true }, origin: flagOffBase });
      assert.equal(enable.status, 409);
      assert.equal(enable.json.code, "mode_not_ready");
      assert.match(enable.json.fields.unlockMode, /CLICK_UNLOCK_ENABLED/);
      assert.equal(enable.json.fields.linkUrl, undefined, "the URL is fine; only the server flag is missing");
      const after = (await request("/api/admin/settings", { headers: { Cookie: cookie }, origin: flagOffBase })).json;
      assert.equal(after.settings.unlockEnabled, false);
      assert.equal(after.settings.unlockLinkUrl, "https://www.wikipedia.org/", "the URL saved earlier is kept");
      const reset = await request("/api/admin/settings", { method: "PUT", headers: { Cookie: cookie }, body: { ...body, version: after.settings.version, unlockLinkUrl: null }, origin: flagOffBase });
      assert.equal(reset.status, 200);
    });
  } else {
    console.log("  - skipped flag-off check (set STORYWEB_TEST_URL_FLAG_OFF to an instance with CLICK_UNLOCK_ENABLED=false on the same test DB)");
  }

  console.log(`M3 link unlock test passed (${passed} groups).`);
} finally {
  if (adminCookie) {
    await put({ unlockEnabled: false, unlockMode: "link", unlockLinkUrl: null }).catch(() => undefined);
    if (storyId) await request("/api/admin/stories", { method: "DELETE", headers: { Cookie: adminCookie }, body: { id: storyId } }).catch(() => undefined);
  }
}
