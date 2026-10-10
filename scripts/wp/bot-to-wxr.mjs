// Converts the story bot's output (chapters/<story>/chuong-N.txt, optional stories.json) into WordPress WXR files
// for wp-admin → Công cụ → Nhập → WordPress (plugin WordPress Importer) and for the Playground importWxr step.
//
// - A story and all its chapters go in the same file: the importer only attaches a chapter to a story imported in
//   the same run.
// - Every item gets its own post date: the importer skips an item whose title and date match an existing post, and
//   every story has a "Chương 1". Re-importing the same file therefore skips what is already there.
//
// Usage: node scripts/wp/bot-to-wxr.mjs --out dist/wp/import [--free 1|all] [--max-chapters 300] <bot dir>...
// A bot dir holds chapters/ (and stories.json when the bot wrote one), e.g. chapter/output1, chapter/output/truyentop.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GENRES = {
  "co-trang": "Cổ trang", "do-thi": "Đô thị", "drama": "Drama", "gia-dinh": "Gia đình", "hai-huoc": "Hài hước",
  "hao-mon": "Hào môn", "he": "HE", "hien-dai": "Hiện đại", "kinh-di": "Kinh dị", "ngon-tinh": "Ngôn tình",
  "ngot": "Ngọt", "nguoc": "Ngược", "nu-cuong": "Nữ cường", "showbiz": "Showbiz", "sung": "Sủng",
  "tam-ly": "Tâm lý", "tra-thu": "Trả thù", "trong-sinh": "Trọng sinh", "va-mat": "Vả mặt",
};
const genreName = (slug) => GENRES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

// The bot saved slugs as titles. Until it saves real titles, show the slug as words (no diacritics), without the
// "top-284" style prefixes some sources glue to the slug.
function storyTitle(title, slug) {
  if (title && title !== slug) return title;
  const words = slug.replace(/^[a-z]+-\d+(?=[a-z])/, "").replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function parseChapter(raw, number) {
  const text = raw.replace(/\r\n?/g, "\n");
  const sep = text.search(/^={20,}$/m);
  const head = sep >= 0 ? text.slice(0, sep) : "";
  const body = sep >= 0 ? text.slice(sep).replace(/^=+\n/, "") : text;
  const header = Object.fromEntries(
    head.split("\n").map((l) => l.match(/^([A-Z_]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
  );
  // Site furniture, not story text: the source's "Bạn đang xem chương N" footer and its Shopee unlock prompt.
  const paragraphs = body.split("\n").map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^Bạn đang xem chương \d+$/i.test(l) && !/MỞ ỨNG DỤNG SHOPEE/i.test(l));
  const label = header.CHAPTER ?? "";
  return {
    number,
    title: /^Chương\s+\d+(\s*[:.\-–]\s*\S.*)?$/i.test(label) ? label : `Chương ${number}`,
    // The source showed an unlock popup: the bot only got the part before it.
    truncated: header.HAS_POPUP === "True",
    paragraphs,
  };
}

/** Stories with their chapters (sorted by number) from one bot output directory. */
export function readBotDir(dir) {
  const chaptersDir = join(dir, "chapters");
  const meta = existsSync(join(dir, "stories.json")) ? JSON.parse(readFileSync(join(dir, "stories.json"), "utf8")) : [];
  const bySlug = new Map(meta.map((s) => [s.slug, s]));
  const stories = [];
  for (const slug of readdirSync(chaptersDir).sort()) {
    const files = readdirSync(join(chaptersDir, slug)).filter((f) => /^chuong-\d+\.txt$/.test(f));
    const chapters = files
      .map((f) => parseChapter(readFileSync(join(chaptersDir, slug, f), "utf8"), Number(f.match(/\d+/)[0])))
      .filter((c) => c.paragraphs.length)
      .sort((a, b) => a.number - b.number);
    if (!chapters.length) continue;
    const m = bySlug.get(slug) ?? {};
    stories.push({
      slug,
      title: storyTitle(m.title, slug),
      hasRealTitle: Boolean(m.title && m.title !== slug),
      description: m.description ?? "",
      author: m.author ?? "",
      categories: m.categories ?? [],
      chapters,
    });
  }
  return stories;
}

const cdata = (s) => `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
const html = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SITE = "https://import.invalid";

function item({ id, title, name, type, parent = 0, order = 0, date, content, terms = [], meta = {} }) {
  const local = new Date(date.getTime() + 7 * 3600e3).toISOString().slice(0, 19).replace("T", " "); // Asia/Ho_Chi_Minh
  const gmt = date.toISOString().slice(0, 19).replace("T", " ");
  return `\t<item>
\t\t<title>${cdata(title)}</title>
\t\t<link>${SITE}/?p=${id}</link>
\t\t<dc:creator>${cdata("thu-cac-import")}</dc:creator>
\t\t<guid isPermaLink="false">${SITE}/?p=${id}</guid>
\t\t<description></description>
\t\t<content:encoded>${cdata(content)}</content:encoded>
\t\t<excerpt:encoded>${cdata("")}</excerpt:encoded>
\t\t<wp:post_id>${id}</wp:post_id>
\t\t<wp:post_date>${cdata(local)}</wp:post_date>
\t\t<wp:post_date_gmt>${cdata(gmt)}</wp:post_date_gmt>
\t\t<wp:comment_status>${cdata("closed")}</wp:comment_status>
\t\t<wp:ping_status>${cdata("closed")}</wp:ping_status>
\t\t<wp:post_name>${cdata(name)}</wp:post_name>
\t\t<wp:status>${cdata("publish")}</wp:status>
\t\t<wp:post_parent>${parent}</wp:post_parent>
\t\t<wp:menu_order>${order}</wp:menu_order>
\t\t<wp:post_type>${cdata(type)}</wp:post_type>
\t\t<wp:post_password>${cdata("")}</wp:post_password>
\t\t<wp:is_sticky>0</wp:is_sticky>
${terms.map((t) => `\t\t<category domain="the_loai" nicename="${t}">${cdata(genreName(t))}</category>\n`).join("")}${Object.entries(meta).map(([k, v]) => `\t\t<wp:postmeta>\n\t\t\t<wp:meta_key>${cdata(k)}</wp:meta_key>\n\t\t\t<wp:meta_value>${cdata(v)}</wp:meta_value>\n\t\t</wp:postmeta>\n`).join("")}\t</item>
`;
}

function wxr(items, genres) {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
\txmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
\txmlns:content="http://purl.org/rss/1.0/modules/content/"
\txmlns:wfw="http://wellformedweb.org/CommentAPI/"
\txmlns:dc="http://purl.org/dc/elements/1.1/"
\txmlns:wp="http://wordpress.org/export/1.2/">
<channel>
\t<title>Thư Các</title>
\t<link>${SITE}</link>
\t<description></description>
\t<language>vi</language>
\t<wp:wxr_version>1.2</wp:wxr_version>
\t<wp:base_site_url>${SITE}</wp:base_site_url>
\t<wp:base_blog_url>${SITE}</wp:base_blog_url>
\t<wp:author><wp:author_id>1</wp:author_id><wp:author_login>${cdata("thu-cac-import")}</wp:author_login><wp:author_email>${cdata("")}</wp:author_email><wp:author_display_name>${cdata("Thư Các")}</wp:author_display_name><wp:author_first_name>${cdata("")}</wp:author_first_name><wp:author_last_name>${cdata("")}</wp:author_last_name></wp:author>
${[...genres].sort().map((g, i) => `\t<wp:term><wp:term_id>${i + 1}</wp:term_id><wp:term_taxonomy>${cdata("the_loai")}</wp:term_taxonomy><wp:term_slug>${cdata(g)}</wp:term_slug><wp:term_parent>${cdata("")}</wp:term_parent><wp:term_name>${cdata(genreName(g))}</wp:term_name></wp:term>\n`).join("")}${items.join("")}</channel>
</rss>
`;
}

/** Writes WXR files (whole stories, at most maxChapters chapters per file unless one story is bigger). */
export function writeWxr(stories, { out, free = "1", maxChapters = 300, start = new Date() }) {
  mkdirSync(out, { recursive: true });
  const files = [];
  let batch = [];
  let count = 0;
  const flush = () => { if (batch.length) { files.push(batch); batch = []; count = 0; } };
  for (const s of stories) {
    if (count && count + s.chapters.length > maxChapters) flush();
    batch.push(s);
    count += s.chapters.length;
  }
  flush();

  // One second apart, all in the past: a future date would import the item as scheduled, not published.
  const items = stories.reduce((n, s) => n + 1 + s.chapters.length, 0);
  const first = start.getTime() - 1000 * (items + 3600);
  let id = 900000;
  let second = 0;
  const at = () => new Date(first + 1000 * second++);
  return files.map((group, i) => {
    const genres = new Set(group.flatMap((s) => s.categories));
    const items = [];
    for (const s of group) {
      const storyId = id++;
      const meta = { _sw_free_chapters: free === "all" ? String(s.chapters.length) : String(Number(free) || 1) };
      if (s.author) meta._sw_author = s.author;
      items.push(item({ id: storyId, title: s.title, name: s.slug, type: "story", date: at(), content: html(s.description), terms: s.categories, meta }));
      for (const c of s.chapters) {
        items.push(item({
          id: id++, title: c.title, name: `${s.slug}-${c.number}`, type: "chapter", parent: storyId, order: c.number,
          date: at(), content: c.paragraphs.map(html).join("\n\n"),
        }));
      }
    }
    const file = join(out, `thu-cac-import-${String(i + 1).padStart(2, "0")}.xml`);
    writeFileSync(file, wxr(items, genres));
    return { file, stories: group.length, chapters: group.reduce((n, s) => n + s.chapters.length, 0) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const opt = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const [v] = args.splice(i, 2).slice(1); return v; };
  const out = opt("--out", "dist/wp/import");
  const free = opt("--free", "1");
  const maxChapters = Number(opt("--max-chapters", "300"));
  if (!args.length) throw new Error("usage: node scripts/wp/bot-to-wxr.mjs --out <dir> [--free 1|all] [--max-chapters 300] <bot dir>...");

  const seen = new Set();
  const stories = [];
  for (const dir of args) {
    for (const s of readBotDir(dir)) {
      if (seen.has(s.slug)) { console.warn(`skip duplicate story slug ${s.slug} (${dir})`); continue; }
      seen.add(s.slug);
      stories.push(s);
    }
  }
  const files = writeWxr(stories, { out, free, maxChapters });
  const chapters = stories.flatMap((s) => s.chapters);
  for (const f of files) console.log(`${f.file}: ${f.stories} stories, ${f.chapters} chapters`);
  console.log(`total: ${stories.length} stories, ${chapters.length} chapters; free chapters per story: ${free}`);
  console.log(`no real title (slug used): ${stories.filter((s) => !s.hasRealTitle).length} stories`);
  console.log(`cut short by the source's unlock popup: ${chapters.filter((c) => c.truncated).length} chapters`);
  // The bot follows only the chapter links on a story's page: missing numbers mean it skipped part of the list.
  const gaps = stories.filter((s) => s.chapters.length !== s.chapters[s.chapters.length - 1].number);
  console.log(`missing chapters (numbers skip, e.g. 1-10 then 25): ${gaps.length} stories${gaps.length ? `, e.g. ${gaps.slice(0, 3).map((s) => `${s.slug} [${s.chapters.map((c) => c.number).join(",")}]`).join("; ")}` : ""}`);
  const sizes = new Map();
  for (const s of stories) sizes.set(s.chapters.length, (sizes.get(s.chapters.length) ?? 0) + 1);
  const [common, many] = [...sizes].sort((a, b) => b[1] - a[1])[0];
  if (many > stories.length / 2) console.log(`warning: ${many} of ${stories.length} stories have exactly ${common} chapters, looks like a limit in the bot or on the source page`);
  console.log(`no genre: ${stories.filter((s) => !s.categories.length).length} stories`);
}
