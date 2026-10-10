// Content + leak checks against the local Playground site (127.0.0.1 only).
const B = process.env.BASE ?? "http://127.0.0.1:9400";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(B)) throw new Error("local only");
const ORIG = "thanh-pho-sau-con-mua"; // seeded slug: chapter markers use it; links use the story code since StoryWeb Core 0.4.0
const S = await (async () => { const r = await fetch(`${B}/truyen/${ORIG}/`, { redirect: "manual" }); return ((r.headers.get("location") ?? "").match(/\/truyen\/([a-z0-9-]+)\/?$/) ?? [])[1] ?? ORIG; })();
const marker = (n, slug = ORIG) => `SW-${slug}-${n}-BODY`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const get = async (p, init = {}) => { const r = await fetch(B + p, { redirect: "manual", ...init }); return { status: r.status, text: await r.text(), headers: r.headers }; };
const count = (t, re) => (t.match(re) ?? []).length;

// The blueprint seeds after the server starts answering: wait until the last sample story has its 6 chapters,
// i.e. seeding finished (max 3 minutes).
const sampleData = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(new URL("./sample-stories.json", import.meta.url), "utf8")));
const sample = sampleData.stories;
const lastSlug = sample[sample.length - 1].slug;
for (let i = 0; ; i++) {
  // The seeded slug redirects to the story's code link (StoryWeb Core 0.4.0): follow it.
  const seeded = await get(`/truyen/${lastSlug}/`, { redirect: "follow" }).then((r) => r.text.includes("6 chương ·")).catch(() => false);
  if (seeded) break;
  if (i >= 90) throw new Error(`sample data not seeded (expected /truyen/${lastSlug}/ with 6 chapters)`);
  await new Promise((r) => setTimeout(r, 2000));
}

// ---- catalogue ----
const home = await get("/");
ok("home: featured ticket + 7 picks (all but the featured) + 6-row departure board", count(home.text, /class="story-card"/g) === 7 && home.text.includes("ticket__cover") && count(home.text, /class="board-row"/g) === 6, `cards=${count(home.text, /class="story-card"/g)} board=${count(home.text, /class="board-row"/g)}`);
ok("home: stats show 8 stories", /<strong>8<\/strong> câu chuyện/.test(home.text));
ok("home: visitors see no Đăng truyện / wp-admin link", !home.text.includes("Đăng truyện") && !home.text.includes("edit.php?post_type=story"));
ok("home: genre strip lists genres", count(home.text, /the-loai=/g) >= 5, `${count(home.text, /the-loai=/g)} links`);
const all = await get("/tim-kiem/");
ok("discover: 8 stories, '8 truyện'", count(all.text, /class="story-card"/g) === 8 && all.text.includes(">8 truyện</span>"));
const rain = await get("/tim-kiem/?q=" + encodeURIComponent("mưa"));
ok("discover: search 'mưa' finds Thành Phố Sau Cơn Mưa", rain.text.includes("Thành Phố Sau Cơn Mưa") && rain.text.includes("Kết quả cho"), `${count(rain.text, /class="story-card"/g)} result(s)`);
const author = await get("/tim-kiem/?q=" + encodeURIComponent("Lâm Hạ"));
ok("discover: search by author 'Lâm Hạ'", author.text.includes("Thành Phố Sau Cơn Mưa"), `${count(author.text, /class="story-card"/g)} result(s)`);
const genre = await get("/tim-kiem/?the-loai=do-thi");
ok("discover: genre filter Đô thị selected", /filter-chip[^"]*is-selected/.test(genre.text) && genre.text.includes("Truyện Đô thị"));
const oldGenre = await get("/tim-kiem/?the-loai=" + encodeURIComponent("Đô thị"));
ok("discover: old Next.js genre link (by name) still filters", oldGenre.text.includes("Truyện Đô thị"));

// ---- story codes: links by code, old links and capitals redirect, search by code ----
const code = S.toUpperCase();
ok("story link is its code (/truyen/tt2d…/)", /^tt2d\d{5}$/.test(S), S);
let moved = await get(`/truyen/${ORIG}/`);
ok("old story link → 301 to the code link", moved.status === 301 && moved.headers.get("location") === `${B}/truyen/${S}/`, `${moved.status} ${moved.headers.get("location")}`);
moved = await get(`/doc/${ORIG}/2/`);
ok("old chapter link → 301 to the code link, same chapter", moved.status === 301 && moved.headers.get("location") === `${B}/doc/${S}/2/`, `${moved.status} ${moved.headers.get("location")}`);
moved = await get(`/doc/${code}/2/`);
ok("chapter link with the code in capitals → 301 to lower case", moved.status === 301 && moved.headers.get("location") === `${B}/doc/${S}/2/`, `${moved.status} ${moved.headers.get("location")}`);
ok("redirects never carry the locked body", !moved.text.includes(marker(2)));
const byCode = await get(`/tim-kiem/?q=${code}`);
ok("search by code finds the story", byCode.text.includes(`${code} &#8211; Thành Phố Sau Cơn Mưa`) && count(byCode.text, /class="story-card"/g) === 1, `${count(byCode.text, /class="story-card"/g)} result(s)`);

// ---- story detail ----
const story = await get(`/truyen/${S}/`);
const stops = (t) => count(t, /class="stop( is-locked)?"/g);
ok("story: 100 chapter stops on page 1", stops(story.text) === 100, `${stops(story.text)}`);
ok("story: '120 chương · 1 chương miễn phí'", story.text.includes("120 chương · 1 chương miễn phí"));
const compact = story.text.replace(/>\s+</g, "><"); // whitespace/line endings between tags do not matter
ok("story: chapter 1 free, chapters 2–100 locked", /stop__index">01<\/span><span class="stop__name">[^<]*<\/span><span class="stop__status">Miễn phí/.test(compact) && count(compact, /class="stop is-locked"/g) === 99, `${count(compact, /class="stop is-locked"/g)} locked`);
ok("story: pager to page 2", story.text.includes("trang-chuong=2"));
const story2 = await get(`/truyen/${S}/?trang-chuong=2`);
ok("story: page 2 has 20 stops", stops(story2.text) === 20, `${stops(story2.text)}`);
ok("story: no chapter body on story page", !story.text.includes("-BODY"));

// ---- reader ----
const ch1 = await get(`/doc/${S}/1/`);
ok("reader ch1 (free): body served", ch1.text.includes(marker(1)) && ch1.text.includes('data-reader-text'));
ok("reader ch1: prev disabled, next = /doc/.../2/", /reader-nav__prev" aria-label="Chương trước" disabled/.test(ch1.text) && ch1.text.includes(`/doc/${S}/2/`));
ok("reader ch1: noindex + no-store", /noindex/.test(ch1.text) && /no-store|no-cache/.test(ch1.headers.get("cache-control") ?? ""), ch1.headers.get("cache-control") ?? "");
const ch2 = await get(`/doc/${S}/2/`);
ok("reader ch2 (locked): NO body in HTML", !ch2.text.includes(marker(2)) && !ch2.text.includes("data-reader-text"));
// The marker sits at the end of the body; SEO plugins quote the opening words (meta description, og:description).
// Compare letters only, so entities and curly quotes in <head> can't hide a match.
const words = (t) => t
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .normalize("NFC").replace(/&[a-z]+;|[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
const opening = words(sampleData.paragraphs[0]).split(" ").slice(0, 8).join(" ");
const hasChapterText = (t) => words(t).includes(opening);
ok("leak detector finds the text of free ch1 (control)", hasChapterText(ch1.text));
ok("reader ch2: no chapter text anywhere, <head> included", opening.split(" ").length === 8 && !hasChapterText(ch2.text), `"${opening}"`);
ok("reader ch2: noindex", /<meta name=['"]robots['"][^>]*noindex/.test(ch2.text));
ok("reader ch2: gate shown (mode off)", ch2.text.includes("data-unlock-gate") && ch2.text.includes("tạm tắt"));
ok("reader ch2: title still shown", ch2.text.includes("Một lá thư chưa gửi"));

// ---- side doors for locked chapter text ----
const chId = Number((ch2.text.match(/postid-(\d+)/) ?? [])[1]);
ok("found chapter 2 post id", chId > 0, String(chId));
const doors = [
  ["REST /wp/v2/chapter", "/wp-json/wp/v2/chapter"],
  ["REST /wp/v2/chapter/<id>", `/wp-json/wp/v2/chapter/${chId}`],
  ["REST ?rest_route=/wp/v2/chapter", "/?rest_route=/wp/v2/chapter"],
  ["REST search subtype=chapter", "/wp-json/wp/v2/search?search=SW&subtype=chapter"],
  ["REST search (any)", "/wp-json/wp/v2/search?search=SW-"],
  ["REST posts?search", "/wp-json/wp/v2/posts?search=SW-"],
  ["feed ?post_type=chapter", "/?post_type=chapter&feed=rss2"],
  ["feed /feed/", "/feed/"],
  ["WP search ?s=", "/?s=SW-"],
  ["WP search ?s=&post_type=chapter", "/?s=SW-&post_type=chapter"],
  ["direct ?p=<id>", `/?p=${chId}`],
  ["direct ?post_type=chapter&p=<id>", `/?post_type=chapter&p=${chId}`],
  ["embed /doc/.../2/embed/", `/doc/${S}/2/embed/`],
  ["oEmbed JSON", `/wp-json/oembed/1.0/embed?url=${encodeURIComponent(B + `/doc/${S}/2/`)}`],
  ["oEmbed ?p", `/wp-json/oembed/1.0/embed?url=${encodeURIComponent(B + `/?p=${chId}`)}`],
  ["sitemap index", "/wp-sitemap.xml"],
  ["theme chapters API", "/wp-json/thu-cac/v1/chapters?story=" + ((home.text.match(/postid-(\d+)/) ?? [])[1] ?? "0")],
  ["comments feed", "/comments/feed/"],
  // Plugin side doors (404 when the plugin is not installed).
  ["Yoast REST head of ch2", `/wp-json/yoast/v1/get_head?url=${encodeURIComponent(B + `/doc/${S}/2/`)}`],
  ["SEO sitemap index", "/sitemap_index.xml"],
  ["SEO chapter sitemap", "/chapter-sitemap.xml"],
];
for (const [name, path] of doors) {
  const r = await get(path);
  const leaked = r.text.includes(marker(2)) || /SW-[a-z0-9-]+-([2-9]|\d{2,})-BODY/.test(r.text) || hasChapterText(r.text);
  ok(`no locked text via ${name}`, !leaked, `status ${r.status}`);
}
const types = await get("/wp-json/wp/v2/types");
ok("REST types do not list chapter", !/"chapter"\s*:/.test(types.text));
const sm = await get("/wp-sitemap.xml");
ok("sitemap has no chapter sitemap", !sm.text.includes("chapter"));
const seoIndex = await get("/sitemap_index.xml");
ok("SEO sitemap index (if any) lists no chapters", seoIndex.status !== 200 || !/chapter/i.test(seoIndex.text), `status ${seoIndex.status}`);
const seoChapters = await get("/chapter-sitemap.xml");
ok("SEO chapter sitemap (if any) lists no reader URLs", seoChapters.status !== 200 || !seoChapters.text.includes("/doc/"), `status ${seoChapters.status}`);

// ---- theme REST ----
const storyId = Number((story.text.match(/postid-(\d+)/) ?? [])[1]);
const list = await get(`/wp-json/thu-cac/v1/chapters?story=${storyId}`);
const lj = JSON.parse(list.text);
ok("chapters API: 120 items, titles only, ch1 free / ch2 locked", lj.chapters?.length === 120 && lj.chapters[0].locked === false && lj.chapters[1].locked === true && !list.text.includes("BODY"));
const S2 = ((await get("/truyen/duoi-tan-trang-cu/")).headers.get("location")?.match(/\/truyen\/([a-z0-9-]+)\/?$/) ?? [])[1];
const cards = await get(`/wp-json/thu-cac/v1/cards?slugs=${S},${S2},<script>`);
const cj = JSON.parse(cards.text);
ok("cards API: 2 cards, bad slug ignored", cj.count === 2 && !cards.text.includes("<script>"));
const old = JSON.parse((await get(`/wp-json/thu-cac/v1/cards?slugs=${S},duoi-tan-trang-cu`)).text);
ok("cards API: a slug from before story codes → its current slug, for the bookshelf", old.count === 0 && old.renamed?.["duoi-tan-trang-cu"] === S2, JSON.stringify(old.renamed));

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
