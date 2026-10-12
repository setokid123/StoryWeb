// "Truyện → Đăng Facebook" (StoryWeb Core inc/facebook*.php) against the LOCAL Playground (127.0.0.1 only), with
// scripts/wp/mock-facebook.php installed as a must-use plugin in place of Facebook (see scripts/wp/README.md).
//   WP_TEST_USER=admin WP_TEST_PASS=password node scripts/wp/check-facebook.mjs
const B = process.env.BASE ?? "http://127.0.0.1:9400";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(B)) throw new Error("local only");
const ORIG = "thanh-pho-sau-con-mua"; // seeded slug: chapter markers use it; links use the story code since StoryWeb Core 0.4.0
const S = await (async () => { const r = await fetch(`${B}/truyen/${ORIG}/`, { redirect: "manual" }); return ((r.headers.get("location") ?? "").match(/\/truyen\/([a-z0-9-]+)\/?$/) ?? [])[1] ?? ORIG; })();
const marker = (n) => `SW-${ORIG}-${n}-BODY`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };

const jar = new Map();
const take = (res) => { for (const line of res.headers.getSetCookie?.() ?? []) { const [pair] = line.split(";"); const i = pair.indexOf("="); jar.set(pair.slice(0, i).trim(), pair.slice(i + 1)); } };
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
const get = async (path, withCookies = true) => { const r = await fetch(B + path, { headers: withCookies ? { cookie: cookie() } : {}, redirect: "follow" }); take(r); return { status: r.status, text: await r.text() }; };
const post = async (path, form, withCookies = true) => {
  const r = await fetch(B + path, { method: "POST", redirect: "manual", body: new URLSearchParams(form), headers: { ...(withCookies ? { cookie: cookie() } : {}), "content-type": "application/x-www-form-urlencoded" } });
  take(r);
  return { status: r.status, location: r.headers.get("location") ?? "", text: await r.text() };
};
const PAGE = "/wp-admin/edit.php?post_type=story&page=storyweb-facebook";
const nonceFor = (html, action) => (html.match(new RegExp(`name="action" value="${action}"[\\s\\S]*?name="_wpnonce" value="([^"]+)"`)) ?? [])[1];
const mock = async (reset = false) => JSON.parse((await get(`/wp-admin/admin-ajax.php?action=sw_fb_mock_log${reset ? "&reset=1" : ""}`)).text);
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// ---- log in ----
await get("/wp-login.php");
const login = await post("/wp-login.php", { log: process.env.WP_TEST_USER, pwd: process.env.WP_TEST_PASS, "wp-submit": "Log In", testcookie: "1", redirect_to: B + "/wp-admin/" });
ok("admin logged in", login.status === 302 && [...jar.keys()].some((k) => k.startsWith("wordpress_logged_in")));
await mock(true);

// ---- connect ----
let page = await get(PAGE);
ok("Truyện → Đăng Facebook: connect form (App ID, App Secret, user token)", page.status === 200 && /name="app_id"/.test(page.text) && /name="app_secret"/.test(page.text) && /name="user_token"/.test(page.text));
let r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_connect", _wpnonce: nonceFor(page.text, "storyweb_fb_connect"), app_id: "123", app_secret: "bad-secret", user_token: "SHORT-USER-TOKEN" });
page = await get(PAGE);
ok("wrong App Secret: Facebook's error shown, not connected", /Facebook báo lỗi 190/.test(page.text) && /name="app_id"/.test(page.text));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_connect", _wpnonce: nonceFor(page.text, "storyweb_fb_connect"), app_id: "123", app_secret: "good-secret", user_token: "SHORT-USER-TOKEN" });
page = await get(PAGE);
ok("connected to the one Page that can post (222 has no CREATE_CONTENT)", /Đã kết nối Page &quot;Trạm Truyện 2D&quot;|Đã kết nối Page "Trạm Truyện 2D"/.test(page.text) && /Đang đăng lên Page <strong>Trạm Truyện 2D<\/strong>/.test(page.text));
let calls = await mock();
ok("short token swapped for a long-lived one, Pages listed with it", calls.some((c) => c.path === "oauth/access_token" && c.params.fb_exchange_token === "SHORT-USER-TOKEN" && c.params.grant_type === "fb_exchange_token") && calls.some((c) => c.path === "me/accounts" && c.params.access_token === "LONG-USER-TOKEN"));
ok("no token or secret printed back in wp-admin", !/PAGE-TOKEN|LONG-USER-TOKEN|SHORT-USER-TOKEN|good-secret/.test(page.text));

// ---- pick a story ----
ok("story picker lists stories", /Chọn truyện/.test(page.text) && /&amp;story=\d+|&#038;story=\d+/.test(page.text));
const storyPage = (await get(`/truyen/${S}/`, false)).text;
const storyId = Number((storyPage.match(/postid-(\d+)/) ?? [])[1]);
const code = (storyPage.match(/TT2D\d+/) ?? [])[0];
ok("sample story has a code, and its link is the code", /^TT2D\d+$/.test(code ?? "") && S === code.toLowerCase(), `${code} ${S}`);
const list = await get("/wp-admin/edit.php?post_type=story");
ok("'Đăng Facebook' link under each story in Tất cả truyện", list.text.includes("page=storyweb-facebook&#038;story=") || list.text.includes("page=storyweb-facebook&amp;story="));
page = await get(`${PAGE}&story=${storyId}`);
const texts = JSON.parse(decode((page.text.match(/<script type="application\/json" id="sw-fb-texts">([\s\S]*?)<\/script>/) ?? [])[1] ?? "{}"));
ok("sources: description, opening of chapter 1, whole chapter 1 — not locked chapter 2", ["about", "start", "chapter-1"].every((k) => page.text.includes(`value="${k}"`)) && !page.text.includes('value="chapter-2"'));
ok("locked chapter 2 text is nowhere in the composer", !page.text.includes(marker(2)) && texts["chapter-1"]?.with.includes(marker(1)));
ok("default text: title, chapter, text, read-on link to chapter 2, hashtags", /^📖 .+ · Chương 1\n\n/.test(texts["chapter-1"]?.with ?? "") && texts["chapter-1"].with.includes(`👉 Đọc tiếp chương 2: ${B}/doc/${S}/2/`) && /#TrạmTruyện2D/.test(texts["chapter-1"].with));
ok("with a first comment the post has no read-on line (the comment has it)", !texts["chapter-1"]?.without.includes("👉") && texts["chapter-1"]?.without.includes(marker(1)) && /\n#TrạmTruyện2D[^\n]*$/.test(texts["chapter-1"]?.without ?? ""));
ok("opening of chapter 1 is a short excerpt", (texts.start?.with ?? "").length < (texts["chapter-1"]?.with ?? "").length && texts.start.with.includes("…"));
const textarea = (html, id) => decode((html.match(new RegExp(`<textarea id="${id}"[^>]*>([\\s\\S]*?)</textarea>`)) ?? [])[1] ?? "");
ok("first comment on by default, filled from the template with the read-on link", /id="sw-fb-comment-on"[^>]*checked/.test(page.text) && textarea(page.text, "sw-fb-comment").startsWith("👉 Đọc truyện: ") && /\{link_doc_tiep\}/.test(textarea(page.text, "sw-fb-comment-template")));
const comment1 = `👉 Đọc tiếp chương 2: ${B}/doc/${S}/2/\n📚 Theo dõi Trạm Truyện 2D để đọc truyện hay mỗi ngày!`;
const nonce = nonceFor(page.text, "storyweb_fb_publish");

// ---- publish ----
await mock(true);
const message = texts["chapter-1"].without + "\nThêm một dòng tự gõ <b>đậm</b> 50%";
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "chapter-1", message, with_cover: "1", hashtags_default: "#TrạmTruyện2D #ĐọcTruyện", when: "", comment_on: "1", comment: comment1, comment_template: textarea(page.text, "sw-fb-comment-template") });
page = await get(`${PAGE}&story=${storyId}`);
calls = await mock(true);
const photo = calls.find((c) => c.path === "111/photos");
const first = calls.find((c) => c.path === "111_9001/comments");
ok("right after the post: first comment on it, as the Page, with the read-on link", first?.method === "POST" && first.params.access_token === "PAGE-TOKEN-111" && first.params.message === comment1 && calls.indexOf(first) > calls.indexOf(photo));
ok("notice and history say the comment is there", page.text.includes("lên Page. Đã bình luận.") && /111_9001[\s\S]{0,40}|Đã bình luận/.test(page.text) && /<td>Đã bình luận<\/td>/.test(page.text));
ok("posted as a photo on Page 111 with the Page token", photo?.method === "POST" && photo.params.access_token === "PAGE-TOKEN-111" && !("published" in photo.params));
ok("caption = the edited text (tags stripped, % kept)", photo?.params.caption?.includes(marker(1)) && photo.params.caption.includes("Thêm một dòng tự gõ đậm 50%"));
ok("photo = the cover as a JPEG on this site", /\/wp-content\/uploads\/storyweb-fb\/cover-\d+-\d+-\d+\.jpg$/.test(photo?.params.url ?? ""), photo?.params.url);
const jpeg = photo?.params.url ? await fetch(photo.params.url) : null;
ok("that JPEG is served", jpeg?.status === 200 && /image\/jpeg/.test(jpeg.headers.get("content-type") ?? ""));
ok("success notice links to the Facebook post", page.text.includes("Đã đăng") && page.text.includes("https://www.facebook.com/111_9001"));
ok("history lists the post", /Đã đăng gần đây[\s\S]*Cả chương 1[\s\S]*111_9001/.test(page.text));
ok("hashtags remembered for the next posts", page.text.includes('value="#TrạmTruyện2D #ĐọcTruyện"'));

// ---- edit a post: new text from another source (the photo, comments and time stay) ----
ok("history and the story's post list link to 'Sửa'", page.text.includes("sua=111_9001") && /data-story-posts[\s\S]*Cả chương 1[\s\S]*sua=111_9001/.test(page.text));
await mock(true);
let editor = await get(`${PAGE}&sua=111_9001`);
calls = await mock(true);
const editTexts = JSON.parse(decode((editor.text.match(/id="sw-fb-edit-texts">([\s\S]*?)<\/script>/) ?? [])[1] ?? "{}"));
ok("editor shows the text Facebook has now (read from the post)", calls.some((c) => c.method === "GET" && c.path === "111_9001" && c.params.fields === "message") && textarea(editor.text, "sw-fb-edit-message").includes("Thêm một dòng tự gõ đậm 50%"));
ok("editor offers the free sources only", ["current", "about", "start", "chapter-1"].every((k) => editor.text.includes(`value="${k}"`)) && !editor.text.includes('value="chapter-2"') && !editor.text.includes(marker(2)));
ok("the link was in the first comment → link line off by default", !/id="sw-fb-edit-inline"[^>]*checked/.test(editor.text) && !editTexts.start?.without.includes("👉"));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_edit", _wpnonce: nonceFor(editor.text, "storyweb_fb_edit"), post_id: "111_9001", source: "start", message: editTexts.start.without });
calls = await mock(true);
editor = await get(`${PAGE}&sua=111_9001`);
const edited = calls.find((c) => c.method === "POST" && c.path === "111_9001");
ok("save → the post's text replaced on Facebook (same post, no new one)", edited?.params.message === editTexts.start.without && edited.params.access_token === "PAGE-TOKEN-111" && !calls.some((c) => /\/(photos|feed)$/.test(c.path)));
ok("notice, and the post now reads 'Đoạn mở đầu chương 1', edited", /Đã sửa nội dung bài/.test(editor.text) && /đang dùng: <strong>Đoạn mở đầu chương 1<\/strong>/.test(editor.text) && textarea(editor.text, "sw-fb-edit-message") === editTexts.start.without);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_edit", _wpnonce: nonceFor(editor.text, "storyweb_fb_edit"), post_id: "111_9001", source: "chapter-2", message: "x" });
ok("locked chapter as the new source → refused, nothing sent", /Nguồn nội dung không hợp lệ/.test((await get(`${PAGE}&sua=111_9001`)).text) && !(await mock(true)).some((c) => c.method === "POST"));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_edit", _wpnonce: nonceFor(editor.text, "storyweb_fb_edit"), post_id: "999_1", source: "current", message: "x" });
ok("a post not made from the site → refused", /Không tìm thấy bài này/.test((await get(PAGE)).text) && !(await mock(true)).some((c) => c.method === "POST"));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_edit", post_id: "111_9001", source: "current", message: "x" });
ok("edit without nonce → refused", r.status === 403 && !(await mock(true)).some((c) => c.method === "POST"));
page = await get(`${PAGE}&story=${storyId}`);

// ---- refused ----
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "chapter-2", message: "x", with_cover: "1" });
page = await get(`${PAGE}&story=${storyId}`);
ok("locked chapter 2 as source → refused, nothing sent", page.text.includes("Nguồn nội dung không hợp lệ") && (await mock(true)).length === 0);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", story: String(storyId), source: "chapter-1", message: "x" });
ok("no nonce → refused, nothing sent", r.status === 403 && (await mock(true)).length === 0, `status ${r.status}`);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "chapter-1", message: "x" }, false);
ok("logged out → nothing sent", r.status !== 200 && (await mock(true)).length === 0, `status ${r.status}`);
const local = (offsetMin) => new Date(Date.now() + offsetMin * 60000 + 7 * 3600000).toISOString().slice(0, 16); // Asia/Ho_Chi_Minh, no DST
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "about", message: texts.about.with, with_cover: "1", when: local(2) });
page = await get(`${PAGE}&story=${storyId}`);
ok("schedule 2 minutes ahead → refused (10 min to 30 days)", page.text.includes("Giờ hẹn phải") && (await mock(true)).length === 0);

// ---- first comment refused by Facebook (token without pages_manage_engagement) ----
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "about", message: texts.about.without, with_cover: "1", when: "", comment_on: "1", comment: "FAIL-COMMENT test" });
page = await get(`${PAGE}&story=${storyId}`);
calls = await mock(true);
ok("comment refused: the post stays, a warning says how to fix it", calls.some((c) => c.path === "111/photos") && calls.some((c) => c.path === "111_9001/comments") && /notice-warning[\s\S]*Nhưng chưa bình luận xong[\s\S]*pages_manage_engagement/.test(page.text) && /<td>Lỗi: /.test(page.text));

// ---- schedule (the first comment waits in WP-Cron) ----
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "about", message: texts.about.without, with_cover: "1", when: local(24 * 60), comment_on: "1", comment: "Bình luận hẹn giờ" });
calls = await mock(true);
const scheduled = calls.find((c) => c.path === "111/photos");
const expected = Math.floor((Date.now() + 24 * 3600000) / 60000) * 60;
ok("schedule tomorrow → unpublished photo with scheduled_publish_time", scheduled?.params.published === "false" && Math.abs(Number(scheduled.params.scheduled_publish_time) - expected) <= 120, `${scheduled?.params.scheduled_publish_time} vs ${expected}`);
ok("…and no comment yet (the post is not live)", !calls.some((c) => /\/comments$/.test(c.path)));
const cron = JSON.parse((await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron")).text);
const scheduledPost = cron[0]?.args[0] ?? "";
ok("first comment queued in WP-Cron for 2 minutes after the post goes live", cron.length === 1 && /^111_\d+$/.test(scheduledPost) && cron[0].args[1] === "Bình luận hẹn giờ" && Math.abs(cron[0].time - (expected + 120)) <= 120, JSON.stringify(cron));
await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron&run=1");
calls = await mock(true);
page = await get(`${PAGE}&story=${storyId}`);
ok("when WP-Cron runs: comment sent, history updated", calls.some((c) => c.path === `${scheduledPost}/comments` && c.params.message === "Bình luận hẹn giờ") && /hẹn [^<]*<\/span><\/td>\s*<td>[^<]*<\/td>\s*<td>[^<]*<\/td>\s*<td>Đã bình luận<\/td>/.test(page.text));

// ---- Facebook holds the app for a while (developer verification): the comment is retried, never doubled ----
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "about", message: texts.about.without, with_cover: "1", when: local(24 * 60), comment_on: "1", comment: "Bình luận thử lại" });
await mock(true);
let held = JSON.parse((await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron&down=1")).text);
const heldPost = held[0]?.args[0] ?? "";
await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron&run=1");
held = JSON.parse((await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron")).text);
page = await get(`${PAGE}&story=${storyId}`);
ok("comment refused while the app is held → retried 10 minutes later, history says so", held.length === 1 && held[0].args[0] === heldPost && held[0].args[1] === "Bình luận thử lại" && held[0].args[2] === 1 && Math.abs(held[0].time - (Date.now() / 1000 + 600)) <= 120 && /Lỗi, sẽ tự thử lại lúc/.test(page.text), JSON.stringify(held));
await mock(true); // forget the refused first try
await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron&down=0&run=1");
calls = await mock(true);
held = JSON.parse((await get("/wp-admin/admin-ajax.php?action=sw_fb_mock_cron")).text);
page = await get(`${PAGE}&story=${storyId}`);
ok("app back → the retry sends the comment once, nothing left waiting", calls.filter((c) => c.method === "POST" && c.path === `${heldPost}/comments`).length === 1 && held.length === 0 && /<td>Đã bình luận<\/td>/.test(page.text), JSON.stringify({ held, comments: calls.filter((c) => c.path.endsWith("/comments")).map((c) => `${c.method} ${c.path}`), lastRow: (page.text.match(/<td>(Đã bình luận|Lỗi[^<]*|[^<]*bình luận[^<]*)<\/td>/) ?? [""])[0] }));
// A retry that finds the comment already there (sent, but Facebook's answer was lost) does not post it again.
await get(`/wp-admin/admin-ajax.php?action=sw_fb_mock_cron&again=1&post=${encodeURIComponent(heldPost)}&msg=${encodeURIComponent("Bình luận thử lại")}`);
calls = await mock(true);
ok("a retry for a comment already on the post does not post it twice", calls.some((c) => c.method === "GET" && c.path === `${heldPost}/comments`) && !calls.some((c) => c.method === "POST" && c.path === `${heldPost}/comments`));

// ---- comment off, and a new template ----
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "about", message: texts.about.with, with_cover: "1", when: "", comment: "không gửi", comment_template: "Mẫu mới: {ten_truyen} → {link_truyen}" });
calls = await mock(true);
page = await get(`${PAGE}&story=${storyId}`);
ok("comment unticked → no comment sent", calls.some((c) => c.path === "111/photos") && !calls.some((c) => /\/comments$/.test(c.path)));
ok("choice and template remembered: box unticked, post text keeps its link, new template filled in", !/id="sw-fb-comment-on"[^>]*checked/.test(page.text) && textarea(page.text, "sw-fb-message").includes("👉 Đọc truyện: ") && textarea(page.text, "sw-fb-comment-template") === "Mẫu mới: {ten_truyen} → {link_truyen}" && textarea(page.text, "sw-fb-comment") === `Mẫu mới: ${code} – Thành Phố Sau Cơn Mưa → ${B}/truyen/${S}/`);

// ---- two comments ----
ok("second comment off by default, its template filled with the story code", !/id="sw-fb-comment2-on"[^>]*checked/.test(page.text) && textarea(page.text, "sw-fb-comment2").startsWith(`🔎 Mã truyện: ${code}.`));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonce, story: String(storyId), source: "about", message: texts.about.without, with_cover: "1", when: "", comment_on: "1", comment: "Bình luận một", comment2_on: "1", comment2: "Bình luận hai" });
calls = await mock(true);
page = await get(`${PAGE}&story=${storyId}`);
const both = calls.filter((c) => c.path === "111_9001/comments").map((c) => c.params.message);
ok("both boxes ticked → two comments, in order, after the post", both.length === 2 && both[0] === "Bình luận một" && both[1] === "Bình luận hai" && /<td>Đã bình luận 2 lần<\/td>/.test(page.text) && /id="sw-fb-comment2-on"[^>]*checked/.test(page.text), JSON.stringify(both));

// ---- story without a cover ----
const picker = await get(PAGE);
const ids = [...picker.text.matchAll(/story=(\d+)/g)].map((m) => Number(m[1]));
let bare = 0;
for (const id of new Set(ids)) { const p = await get(`${PAGE}&story=${id}`); if (!/name="with_cover"/.test(p.text) && /name="source"/.test(p.text)) { bare = id; page = p; break; } }
if (bare) {
  const t = JSON.parse(decode((page.text.match(/id="sw-fb-texts">([\s\S]*?)<\/script>/) ?? [])[1] ?? "{}"));
  const key = Object.keys(t)[0];
  r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_publish", _wpnonce: nonceFor(page.text, "storyweb_fb_publish"), story: String(bare), source: key, message: t[key].without, when: "", comment_on: "1", comment: "Bình luận bài không ảnh" });
  calls = await mock(true);
  const feed = calls.find((c) => c.path === "111/feed");
  ok("story without a cover → text post with the story link, then its first comment", feed?.params.message === t[key].without && /\/truyen\/[a-z0-9-]+\/$/.test(feed?.params.link ?? "") && !calls.some((c) => c.path === "111/photos") && calls.some((c) => c.path === "111_9002/comments" && c.params.message === "Bình luận bài không ảnh"));
} else ok("story without a cover found in the sample", false);

// ---- story picker: codes smallest first, exact code on top, pages ----
const pickerCodes = (html) => [...html.matchAll(/<strong>(TT2D\d+) &#8211; /g)].map((m) => m[1]);
page = await get(PAGE);
ok("picker lists every story by code, smallest first", pickerCodes(page.text).join(",") === "TT2D1,TT2D2,TT2D3,TT2D4,TT2D5,TT2D6,TT2D7,TT2D8" && /8 truyện/.test(page.text), pickerCodes(page.text).join(","));
for (const typed of ["TT2D1", "tt2d01", "1"]) {
  const found = pickerCodes((await get(`${PAGE}&q=${typed}`)).text);
  ok(`picker search "${typed}" → TT2D1 first (then codes starting with 1)`, found[0] === "TT2D1" && found.length === 1, found.join(","));
}
const byTitle = pickerCodes((await get(`${PAGE}&q=${encodeURIComponent("Trăng")}`)).text);
ok("picker search by title words", byTitle.includes("TT2D2"), byTitle.join(","));

// ---- automatic posting by code: every post scheduled on Facebook when the run is confirmed ----
const queueState = async (q = "") => JSON.parse((await get(`/wp-admin/admin-ajax.php?action=sw_fb_mock_queue${q}`)).text);
const cronEvents = async (run = false) => JSON.parse((await get(`/wp-admin/admin-ajax.php?action=sw_fb_mock_cron${run ? "&run=1" : ""}`)).text);
await cronEvents(true); // nothing left over from the manual posts above
page = await get(PAGE);
ok("automatic posting form under the story picker", /Tự động đăng theo mã truyện/.test(page.text) && /name="from"/.test(page.text) && /name="every"/.test(page.text) && /id="sw-fb-auto-comment2-template"/.test(page.text) && /Lên lịch trên Facebook/.test(page.text));
const auto = (fields) => post("/wp-admin/admin-post.php", { action: "storyweb_fb_queue_start", _wpnonce: nonceFor(page.text, "storyweb_fb_queue_start"), every: "2", unit: "hour", start: "", auto_source: "start", with_cover: "1", hashtags_default: "#TrạmTruyện2D", comment_on: "1", comment_template: "Đọc tiếp {ma_truyen}: {link_doc_tiep}", comment2_on: "1", comment2_template: "Mã {ma_truyen}", ...fields });
r = await auto({ from: "abc", to: "TT2D00003" });
ok("range that is not a code → refused", /Nhập mã bắt đầu và mã kết thúc/.test((await get(PAGE)).text) && !(await queueState()).queue);
r = await auto({ from: "TT2D1", to: "TT2D3", every: "2", unit: "minute" });
ok("gap under 5 minutes → refused", /ít nhất 5 phút/.test((await get(PAGE)).text) && !(await queueState()).queue);
await mock(true);
const confirmedAt = Date.now() / 1000;
r = await auto({ from: "tt2d1", to: "TT2D00003" });
page = await get(PAGE);
calls = await mock(true);
let state = await queueState();
const photos = calls.filter((c) => c.path === "111/photos");
const t0 = state.queue?.start ?? 0;
ok("confirming sends all 3 posts to Facebook as scheduled posts, 2 hours apart", photos.length === 3 && photos.every((c, i) => c.params.published === "false" && Number(c.params.scheduled_publish_time) === t0 + i * 7200) && state.queue.status === "scheduled", JSON.stringify(photos.map((c) => c.params.scheduled_publish_time)));
ok("no start time → first post 15 minutes after confirming (Facebook needs 10)", t0 >= confirmedAt + 14 * 60 && t0 <= confirmedAt + 16 * 60, `${t0 - confirmedAt}s`);
ok("in code order, read-on link moved to the comment", photos.every((c, i) => c.params.caption.startsWith(`📖 TT2D${i + 1} – `) && !c.params.caption.includes("👉")), photos.map((c) => c.params.caption.split("\n")[0]).join(" | "));
ok("no comment yet: Facebook cannot schedule comments", !calls.some((c) => /\/comments$/.test(c.path)));
let events = await cronEvents();
ok("each post's 2 comments wait in WP-Cron, 2 and 3 minutes after it goes live", events.length === 6 && [0, 1, 2].every((i) => events.some((e) => e.time === t0 + i * 7200 + 120 && e.args[1] === `Đọc tiếp TT2D${i + 1}: ${B}/doc/tt2d${i + 1}/1/`) && events.some((e) => e.time === t0 + i * 7200 + 180 && e.args[1] === `Mã TT2D${i + 1}`)), JSON.stringify(events.map((e) => [e.time - t0, e.args[1]])));
ok("page: all scheduled, with cancel", /Đã lên lịch hết trên Facebook/.test(page.text) && /Hủy và xóa các bài chưa đăng/.test(page.text) && state.scheduled === 0);
const stepped = JSON.parse((await post("/wp-admin/admin-ajax.php", { action: "storyweb_fb_queue_step", _ajax_nonce: "bad" })).text || "null");
ok("batch endpoint refuses a bad nonce", stepped === -1 || stepped === null);
await cronEvents(true);
calls = await mock(true);
ok("when WP-Cron runs, the comments go on their posts", calls.filter((c) => /^111_\d+\/comments$/.test(c.path)).length === 6);
page = await get(PAGE);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_queue_control", _wpnonce: nonceFor(page.text, "storyweb_fb_queue_control"), do: "cancel" });
calls = await mock(true);
ok("cancel → the 3 posts not yet live deleted on Facebook, run gone", calls.filter((c) => c.method === "DELETE").length === 3 && !(await queueState()).queue && /Đã xóa 3 bài chưa đăng/.test((await get(PAGE)).text));

// ---- longer than Facebook's 75 days: the rest waits ----
page = await get(PAGE);
r = await auto({ from: "TT2D4", to: "TT2D8", every: "720", unit: "hour", comment2_on: "" });
state = await queueState();
calls = await mock(true);
page = await get(PAGE);
ok("a post every 30 days: 3 scheduled (0, 30, 60 days), the rest waits for Facebook's 75-day window", calls.filter((c) => c.path === "111/photos").length === 3 && state.queue.status === "running" && state.queue.waiting === true && /chỉ nhận lịch trong 75 ngày/.test(page.text) && Math.abs(state.scheduled - (state.queue.start + 90 * 86400 - (75 * 86400 - 3600) + 60)) < 5);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_queue_control", _wpnonce: nonceFor(page.text, "storyweb_fb_queue_control"), do: "cancel" });
await mock(true);
await cronEvents(true);
await mock(true);

// ---- skip posted, Facebook error, resume ----
page = await get(PAGE);
r = await auto({ from: "TT2D1", to: "TT2D3", skip_posted: "1" });
ok("'skip stories already posted' → nothing left in that range", /đều đã được đăng/.test((await get(PAGE)).text));
await queueState("&break=1");
page = await get(PAGE);
r = await auto({ from: "TT2D7", to: "TT2D8", skip_posted: "" });
state = await queueState();
page = await get(PAGE);
ok("Facebook error → run paused with the error, nothing skipped", state.queue.status === "paused" && state.queue.pos === 0 && /Tạm dừng vì lỗi/.test(page.text));
await queueState("&fix=1");
await mock(true);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_queue_control", _wpnonce: nonceFor(page.text, "storyweb_fb_queue_control"), do: "resume" });
state = await queueState();
calls = await mock(true);
const scheduledCalls = (list) => list.filter((c) => (c.path === "111/photos" || c.path === "111/feed") && c.params.published === "false");
ok("resume → both scheduled on Facebook (no covers: text posts with the link)", state.queue.status === "scheduled" && scheduledCalls(calls).length === 2);

// ---- a run made before Facebook scheduling: switch it ----
await queueState("&legacy=1");
page = await get(PAGE);
ok("old WP-Cron run shows 'Chuyển sang lịch Facebook'", /Đang tự động đăng/.test(page.text) && /value="to_facebook"/.test(page.text));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_queue_control", _wpnonce: nonceFor(page.text, "storyweb_fb_queue_control"), do: "to_facebook" });
state = await queueState();
calls = await mock(true);
const switched = scheduledCalls(calls);
ok("switched: its posts scheduled on Facebook from its next time (tomorrow)", state.queue.status === "scheduled" && switched.length === 2 && Math.abs(Number(switched[0].params.scheduled_publish_time) - (Date.now() / 1000 + 86400)) < 120, JSON.stringify(switched.map((c) => c.params.scheduled_publish_time)));
page = await get(PAGE);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_queue_control", _wpnonce: nonceFor(page.text, "storyweb_fb_queue_control"), do: "cancel" });
await cronEvents(true);
await mock(true);
ok("cancel → nothing left", !(await queueState()).queue);

// ---- disconnect, then a pasted Page token ----
page = await get(PAGE);
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_disconnect", _wpnonce: nonceFor(page.text, "storyweb_fb_disconnect") });
page = await get(PAGE);
ok("disconnect → connect form again", /name="app_id"/.test(page.text) && !/Đang đăng lên Page/.test(page.text));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_connect", _wpnonce: nonceFor(page.text, "storyweb_fb_connect"), page_id: "111", page_token: "WRONG" });
page = await get(PAGE);
ok("pasted Page token that Facebook rejects → error, not connected", /Facebook báo lỗi 190/.test(page.text) && /name="app_id"/.test(page.text));
r = await post("/wp-admin/admin-post.php", { action: "storyweb_fb_connect", _wpnonce: nonceFor(page.text, "storyweb_fb_connect"), page_id: "111", page_token: "PAGE-TOKEN-111" });
page = await get(PAGE);
ok("pasted Page ID + token → connected", /Đang đăng lên Page <strong>Trạm Truyện 2D<\/strong>/.test(page.text) && !page.text.includes("PAGE-TOKEN-111"));
await mock(true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
