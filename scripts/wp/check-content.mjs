// Content + leak checks against the local Playground site (127.0.0.1 only).
const B = process.env.BASE ?? "http://127.0.0.1:9400";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(B)) throw new Error("local only");
const S = "thanh-pho-sau-con-mua";
const marker = (n, slug = S) => `SW-${slug}-${n}-BODY`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const get = async (p, init = {}) => { const r = await fetch(B + p, { redirect: "manual", ...init }); return { status: r.status, text: await r.text(), headers: r.headers }; };
const count = (t, re) => (t.match(re) ?? []).length;

// The blueprint seeds after the server starts answering: wait until the last sample story has its 6 chapters,
// i.e. seeding finished (max 3 minutes).
const { stories: sample } = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(new URL("./sample-stories.json", import.meta.url), "utf8")));
const lastSlug = sample[sample.length - 1].slug;
for (let i = 0; ; i++) {
  const seeded = await get(`/truyen/${lastSlug}/`).then((r) => r.text.includes("6 chương ·")).catch(() => false);
  if (seeded) break;
  if (i >= 90) throw new Error(`sample data not seeded (expected /truyen/${lastSlug}/ with 6 chapters)`);
  await new Promise((r) => setTimeout(r, 2000));
}

// ---- catalogue ----
const home = await get("/");
ok("home: hero + 4 story cards + updates list", count(home.text, /class="story-card"/g) === 4 && home.text.includes("hero-art__cover") && count(home.text, /class="update-row"/g) === 4, `cards=${count(home.text, /class="story-card"/g)} updates=${count(home.text, /class="update-row"/g)}`);
ok("home: stats show 8 stories", /<strong>08<\/strong><span>Câu chuyện/.test(home.text));
ok("home: genre strip lists genres", count(home.text, /the-loai=/g) >= 5, `${count(home.text, /the-loai=/g)} links`);
const all = await get("/tim-kiem/");
ok("discover: 8 stories, '8 truyện'", count(all.text, /class="story-card"/g) === 8 && all.text.includes("<span>8 truyện</span>"));
const rain = await get("/tim-kiem/?q=" + encodeURIComponent("mưa"));
ok("discover: search 'mưa' finds Thành Phố Sau Cơn Mưa", rain.text.includes("Thành Phố Sau Cơn Mưa") && rain.text.includes("Kết quả cho"), `${count(rain.text, /class="story-card"/g)} result(s)`);
const author = await get("/tim-kiem/?q=" + encodeURIComponent("Lâm Hạ"));
ok("discover: search by author 'Lâm Hạ'", author.text.includes("Thành Phố Sau Cơn Mưa"), `${count(author.text, /class="story-card"/g)} result(s)`);
const genre = await get("/tim-kiem/?the-loai=do-thi");
ok("discover: genre filter Đô thị selected", genre.text.includes('filter-chip is-selected') && genre.text.includes("Truyện Đô thị"));
const oldGenre = await get("/tim-kiem/?the-loai=" + encodeURIComponent("Đô thị"));
ok("discover: old Next.js genre link (by name) still filters", oldGenre.text.includes("Truyện Đô thị"));

// ---- story detail ----
const story = await get(`/truyen/${S}/`);
ok("story: 100 chapter rows on page 1", count(story.text, /class="chapter-row"/g) === 100, `${count(story.text, /class="chapter-row"/g)}`);
ok("story: '120 chương · 1 chương miễn phí'", story.text.includes("120 chương · 1 chương miễn phí"));
ok("story: chapter 1 free, chapter 2 locked", /chapter-row__index">01<\/span><span class="chapter-row__name">[^<]*<\/span>\s*<span class="chapter-row__status">Miễn phí/.test(story.text.replace(/\n\t*/g, "")) && story.text.includes("chapter-row__status--locked"));
ok("story: pager to page 2", story.text.includes("trang-chuong=2"));
const story2 = await get(`/truyen/${S}/?trang-chuong=2`);
ok("story: page 2 has 20 rows", count(story2.text, /class="chapter-row"/g) === 20, `${count(story2.text, /class="chapter-row"/g)}`);
ok("story: no chapter body on story page", !story.text.includes("-BODY"));

// ---- reader ----
const ch1 = await get(`/doc/${S}/1/`);
ok("reader ch1 (free): body served", ch1.text.includes(marker(1)) && ch1.text.includes('data-reader-text'));
ok("reader ch1: prev disabled, next = /doc/.../2/", /reader-nav__prev" aria-label="Chương trước" disabled/.test(ch1.text) && ch1.text.includes(`/doc/${S}/2/`));
ok("reader ch1: noindex + no-store", /noindex/.test(ch1.text) && /no-store|no-cache/.test(ch1.headers.get("cache-control") ?? ""), ch1.headers.get("cache-control") ?? "");
const ch2 = await get(`/doc/${S}/2/`);
ok("reader ch2 (locked): NO body in HTML", !ch2.text.includes(marker(2)) && !ch2.text.includes("data-reader-text"));
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
];
for (const [name, path] of doors) {
  const r = await get(path);
  const leaked = r.text.includes(marker(2)) || /SW-[a-z0-9-]+-([2-9]|\d{2,})-BODY/.test(r.text);
  ok(`no locked text via ${name}`, !leaked, `status ${r.status}`);
}
const types = await get("/wp-json/wp/v2/types");
ok("REST types do not list chapter", !/"chapter"\s*:/.test(types.text));
const sm = await get("/wp-sitemap.xml");
ok("sitemap has no chapter sitemap", !sm.text.includes("chapter"));

// ---- theme REST ----
const storyId = Number((story.text.match(/postid-(\d+)/) ?? [])[1]);
const list = await get(`/wp-json/thu-cac/v1/chapters?story=${storyId}`);
const lj = JSON.parse(list.text);
ok("chapters API: 120 items, titles only, ch1 free / ch2 locked", lj.chapters?.length === 120 && lj.chapters[0].locked === false && lj.chapters[1].locked === true && !list.text.includes("BODY"));
const cards = await get(`/wp-json/thu-cac/v1/cards?slugs=${S},duoi-tan-trang-cu,<script>`);
const cj = JSON.parse(cards.text);
ok("cards API: 2 cards, bad slug ignored", cj.count === 2 && !cards.text.includes("<script>"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
