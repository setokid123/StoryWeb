// Link unlock (StoryWeb Core inc/unlock.php + Truyện → Mở khóa chương) against the LOCAL Playground (127.0.0.1 only).
// Needs a fresh site: it changes the settings (and switches unlock off again at the end) and uses up the
// per-IP grant limit for an hour.
//   WP_TEST_USER=admin WP_TEST_PASS=password node scripts/wp/check-unlock.mjs
import http from "node:http";

const B = process.env.BASE ?? "http://127.0.0.1:9400";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(B)) throw new Error("local only");
const S = "thanh-pho-sau-con-mua";
const marker = (n) => `SW-${S}-${n}-BODY`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };

/** Minimal cookie jar: name=value pairs from Set-Cookie. */
class Jar {
  constructor() { this.c = new Map(); }
  take(res) { for (const line of res.headers.getSetCookie?.() ?? []) { const [pair] = line.split(";"); const i = pair.indexOf("="); this.c.set(pair.slice(0, i).trim(), pair.slice(i + 1)); } }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join("; "); }
}
// GETs go through node:http: fetch() rewrites Sec-Fetch-Mode to "cors", so it cannot play a browser navigation.
const get = (path, { jar, headers = {} } = {}) => new Promise((resolve, reject) => {
  const req = http.get(B + path, { headers: { ...headers, ...(jar ? { cookie: jar.header() } : {}) } }, (res) => {
    let text = "";
    res.setEncoding("utf8");
    res.on("data", (d) => { text += d; });
    res.on("end", () => {
      const setCookie = [].concat(res.headers["set-cookie"] ?? []);
      jar?.take({ headers: { getSetCookie: () => setCookie } });
      resolve({ status: res.statusCode, text, headers: { get: (k) => res.headers[k.toLowerCase()] ?? null }, setCookie });
    });
  });
  req.on("error", reject);
});
const post = async (path, form, jar) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) for (const value of [].concat(v)) body.append(k, value);
  const res = await fetch(B + path, { method: "POST", redirect: "manual", body, headers: { cookie: jar.header(), "content-type": "application/x-www-form-urlencoded" } });
  jar.take(res);
  return { status: res.status, location: res.headers.get("location") ?? "", text: await res.text() };
};
const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&#038;", "&");
const gateLink = (html) => decode((html.match(/href="([^"]*\/mo-khoa\/[^"]*)"/) ?? [])[1] ?? "");
const click = { "sec-fetch-site": "same-origin", "sec-fetch-mode": "navigate", "sec-fetch-user": "?1", "sec-fetch-dest": "document" };

const LINKS = ["https://s.shopee.vn/aaa1", "https://shopee.vn/product/2", "https://s99s.net/G7RWK", "https://example-shop.vn/x?y=1&z=2"];
const BAD = ["http://shopee.vn/plain-http", "https://127.0.0.1/x", "https://localhost/x", "javascript:alert(1)", "https://shop.local/x"];

// ---- admin: log in and save the settings ----
const admin = new Jar();
await get("/wp-login.php", { jar: admin });
const login = await post("/wp-login.php", { log: process.env.WP_TEST_USER, pwd: process.env.WP_TEST_PASS, "wp-submit": "Log In", testcookie: "1", redirect_to: B + "/wp-admin/" }, admin);
ok("admin logged in", login.status === 302 && [...admin.c.keys()].some((k) => k.startsWith("wordpress_logged_in")));
const page = await get("/wp-admin/edit.php?post_type=story&page=storyweb-unlock", { jar: admin });
const nonce = (page.text.match(/name="_wpnonce" value="([^"]+)"/) ?? [])[1];
ok("settings page: Truyện → Mở khóa chương with 10 link fields", page.status === 200 && Boolean(nonce) && (page.text.match(/name="links\[\]"/g) ?? []).length === 10);
const save = (fields) => post("/wp-admin/admin-post.php", { action: "storyweb_unlock_save", _wpnonce: nonce, _wp_http_referer: "/wp-admin/edit.php?post_type=story&page=storyweb-unlock", ...fields }, admin);
const settings = {
  enabled: "1",
  minutes: "30",
  "links[]": [...LINKS, ...BAD],
  title: "Mở khóa thử nghiệm",
  before: "<p>Mời <strong>CLICK</strong> vào liên kết</p><script>alert('x')</script>",
  image: "https://cf.shopee.vn/file/test.jpg",
  show_link: "1",
  button: "Mở Shopee",
  after: "<p>Cảm ơn bạn!</p>",
};
let saved = await save(settings);
ok("save: good links kept, 5 bad links refused", saved.status === 302 && /saved=1/.test(saved.location) && /bad=5/.test(saved.location), saved.location);

const anonForm = await post("/wp-admin/admin-post.php", { action: "storyweb_unlock_save", enabled: "1" }, new Jar());
ok("save without login/nonce does nothing", !/saved=1/.test(anonForm.location), `status ${anonForm.status}`);

// ---- reader: the gate ----
const ch2 = await get(`/doc/${S}/2/`);
const visit = gateLink(ch2.text);
ok("locked chapter: popup with the admin's title, text, link text, image and button", ch2.text.includes("Mở khóa thử nghiệm") && ch2.text.includes("<strong>CLICK</strong>") && ch2.text.includes("Mở Shopee") && ch2.text.includes("cf.shopee.vn/file/test.jpg") && ch2.text.includes("Cảm ơn bạn!") && /class="locked-panel__url"/.test(ch2.text));
ok("admin text is filtered (no <script>, not even its code as text)", !/<script>alert\('x'\)/.test(ch2.text) && !ch2.text.includes("alert('x')"));
ok("locked chapter: still no body", !ch2.text.includes(marker(2)) && !ch2.text.includes("data-reader-text"));
ok("gate links go through /mo-khoa/ with an index and a nonce", /\/mo-khoa\/\?i=\d+&n=[a-f0-9]+$/.test(visit), visit);
const seen = new Set();
for (let i = 0; i < 24; i++) seen.add((gateLink((await get(`/doc/${S}/2/`)).text).match(/i=(\d+)/) ?? [])[1]);
ok("a random link per page view", seen.size >= 3, `${seen.size} different links in 24 views`);

// ---- /mo-khoa/ refuses anything but a reader's click ----
const path = visit.replace(B, "");
let r = await get(path);
ok("no Fetch Metadata and no Referer → 400, no grant", r.status === 400 && !r.setCookie.some((c) => c.startsWith("storyweb_unlock=")), `status ${r.status}`);
r = await get(path, { headers: { ...click, "sec-fetch-site": "cross-site" } });
ok("click from another site → 400", r.status === 400 && !r.setCookie.length, `status ${r.status}`);
r = await get(path, { headers: { ...click, "sec-fetch-dest": "iframe" } });
ok("in an iframe → 400", r.status === 400, `status ${r.status}`);
r = await get(path.replace(/n=[a-f0-9]+/, "n=deadbeef00"), { headers: click });
ok("wrong nonce → 400", r.status === 400, `status ${r.status}`);
r = await get(path.replace(/i=\d+/, "i=99"), { headers: click });
ok("index out of range → 400 (no open redirect)", r.status === 400, `status ${r.status}`);

// ---- a real click: grant + redirect ----
const reader = new Jar();
r = await get(path, { jar: reader, headers: click });
const index = Number((path.match(/i=(\d+)/) ?? [])[1]);
const cookie = r.setCookie.find((c) => c.startsWith("storyweb_unlock=")) ?? "";
ok("reader's click → 303 to the chosen link", r.status === 303 && r.headers.get("location") === LINKS[index], `${r.status} → ${r.headers.get("location")}`);
ok("grant cookie: v3, HttpOnly, SameSite=Lax, ~30 min", /^storyweb_unlock=v3\.\d+\.\d{10}\.[a-f0-9]{64}/.test(cookie) && /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie) && /Max-Age=1[78]\d\d/.test(cookie), cookie.slice(0, 120));
ok("redirect page has no chapter text", !r.text.includes("-BODY"));
const read2 = await get(`/doc/${S}/2/`, { jar: reader });
const read3 = await get(`/doc/${S}/3/`, { jar: reader });
ok("with the grant: locked chapters 2 and 3 readable, expiry note shown", read2.text.includes(marker(2)) && read3.text.includes(marker(3)) && read2.text.includes("data-grant-note"));
const storyId = Number(((await get(`/truyen/${S}/`)).text.match(/postid-(\d+)/) ?? [])[1]);
const api = JSON.parse((await get(`/wp-json/thu-cac/v1/chapters?story=${storyId}`, { jar: reader })).text);
ok("chapter list API shows chapters unlocked for the grant", api.chapters?.[1]?.locked === false);
const old = new Jar();
r = await get(path, { jar: old, headers: { referer: `${B}/doc/${S}/2/` } });
ok("browser without Fetch Metadata: same-origin Referer accepted", r.status === 303 && old.c.has("storyweb_unlock"), `status ${r.status}`);

// ---- forged and revoked grants ----
const forged = new Jar();
const value = reader.c.get("storyweb_unlock");
forged.c.set("storyweb_unlock", value.slice(0, -1) + (value.endsWith("0") ? "1" : "0"));
ok("tampered cookie → locked", !(await get(`/doc/${S}/2/`, { jar: forged })).text.includes(marker(2)));
const longer = new Jar();
const [, rev, exp, mac] = value.split(".");
longer.c.set("storyweb_unlock", `v3.${rev}.${Number(exp) + 86400}.${mac}`);
ok("cookie with a later expiry (signature no longer matches) → locked", !(await get(`/doc/${S}/2/`, { jar: longer })).text.includes(marker(2)));
saved = await save({ ...settings, "links[]": LINKS, revoke: "1" });
ok("'Thu hồi' → the earlier grant stops working", /revoked=1/.test(saved.location) && !(await get(`/doc/${S}/2/`, { jar: reader })).text.includes(marker(2)));

// ---- per-IP rate limit (SEC1) ----
let limited = 0;
let grants = 2; // the two grants above
for (let i = 0; i < 20 && !limited; i++) {
  const g = await get(gateLink((await get(`/doc/${S}/2/`)).text).replace(B, ""), { headers: click });
  if (g.status === 429) limited = grants + 1; else if (g.status === 303) grants++;
}
ok("rate limit: grant number 16 from one IP within the hour → 429", limited === 16, `limited at grant ${limited}`);

// ---- switched off ----
saved = await save({ ...settings, "links[]": LINKS, enabled: "" });
const off = await get(`/doc/${S}/2/`);
ok("switched off: popup says 'tạm tắt', /mo-khoa/ → 404", off.text.includes("tạm tắt") && (await get(path, { headers: click })).status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
