// Converts the story bot's output (chapters/<story>/chuong-N.txt, optional stories.json) into WordPress WXR files
// for wp-admin → Công cụ → Nhập → WordPress (plugin WordPress Importer) and for the Playground importWxr step.
//
// - A story and all its chapters go in the same file: the importer only attaches a chapter to a story imported in
//   the same run.
// - Every item gets its own post date: the importer skips an item whose title and date match an existing post, and
//   every story has a "Chương 1". Re-importing the same file therefore skips what is already there.
//
// Usage: node scripts/wp/bot-to-wxr.mjs --out dist/wp/import [--free 1|all] [--completed] [--min-chars 2000]
//          [--max-chapters 300] <bot dir>...
// A bot dir holds chapters/ (and stories.json / index.csv when the bot wrote them), e.g. chapter/output_truyentop,
// chapter/output_full/nhatruyenhay. Give all dirs in one run: the same story found twice is imported once.
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
// "top-284" style code some sources glue to the slug. `code` is that code as the source prints it ("TOP 166",
// "TTOP-1142"), from index.csv: it tells where the code ends in "top-16610-nam-..." ("10 nam ..."). A slug that
// is only a code keeps the code as its title.
function storyTitle(title, slug, code) {
  if (title && title !== slug) return title;
  let rest = slug.replace(/^[a-z]+[-_][a-z]*-?\d+(?=[-_]?[a-z])/, "");
  const key = code?.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (let i = 0, seen = ""; key && i < slug.length; i++) {
    if (/[a-z0-9]/.test(slug[i])) seen += slug[i];
    if (seen === key) { rest = slug.slice(i + 1); break; }
    if (!key.startsWith(seen)) break;
  }
  const words = rest.replace(/[-_]+/g, " ").trim();
  if (!words) return code ?? slug.toUpperCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Some sources wrap words in their own tags, so the bot wrote a paragraph as many short lines ("Kết\nhôn\nmấy chục
// năm, tôi..."). Lines are joined back; a new paragraph starts where a line ends a sentence and the next one starts
// one. Inner chapter headings ("Chương 3", sometimes split as "Chương\n3"), section numbers ("2" between two
// sentences), bold lines ("**Chương 9: Con bài cuối cùng**") and scene breaks ("_____", "* * *") stand alone.
const HEADING = /^(Chương|CHƯƠNG)\s+\d+(\s*[:.\-–]\s*\S.{0,60})?$|^\*\*[^*]+\*\*$/u;
const BREAK = /^[_*=~\-–—.·•#\s]{3,}$/u;
const ENDS = /([.!?…:]|[.!?…]?["”’»)\]】]+)$/u;
const STARTS = /^["“‘«(\[【–—\-…*]*\s*[\p{Lu}\d]/u;
const GLUE_BEFORE = /^[,.;:!?…”’)\]】%]/u;
const GLUE_AFTER = /[“‘(\[【]$/u;
// One-sentence paragraphs for a paragraph this long: a few chapters came as a single line.
const LONG = 1200;

function reflow(lines) {
  const out = [];
  let cur = "";
  const flush = () => { if (cur) out.push(cur); cur = ""; };
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^(Chương|CHƯƠNG)$/u.test(line) && /^\d+$/.test(lines[i + 1] ?? "") && (!cur || ENDS.test(cur))) line += ` ${lines[++i]}`;
    const section = /^\d{1,3}$/.test(line) && (!cur || ENDS.test(cur)) && STARTS.test(lines[i + 1] ?? "");
    if (section || HEADING.test(line) || BREAK.test(line)) { flush(); out.push(line); continue; }
    if (!cur) cur = line;
    else if (ENDS.test(cur) && STARTS.test(line)) { flush(); cur = line; }
    else cur += (GLUE_BEFORE.test(line) || GLUE_AFTER.test(cur) ? "" : " ") + line;
  }
  flush();
  return out.flatMap((p) => p.length > LONG ? p.split(/(?<=[.!?…]["”’»)\]】]*)\s+(?=["“‘«(\[【–—\-]?\s*\p{Lu})/u) : [p]);
}

// Sources mask words so filters miss them: "x/ác", "m.á.u", "tr..eo", "hànhz", "ch*t". A word split by "/" or "."
// (or with a stray "z") is joined back when the joined word occurs unmasked at least 3 times in the same run of
// stories ("km/h", "anh/chị", "TP.HCM" stay). "*" hides letters, so only unambiguous masks are restored; masked
// swear words stay masked.
const MASKED = /\p{L}+(?:(?:\/+|\.{1,2})\p{L}+)+|\p{L}*z\p{L}*/gu;
const STARS = [
  [/(?<![\p{L}*])([Cc])\/?h\/?e\/t(?![\p{L}*])|(?<![\p{L}*])([Cc])h\/ẻt(?![\p{L}*])|(?<![\p{L}*])([Cc])\/ết(?![\p{L}*])/gu, (_, a, b, c) => `${a ?? b ?? c}hết`],
  [/(?<![\p{L}*])([Cc]h|[Gg]i)\*t(?![\p{L}*])/gu, (_, a) => `${a}ết`],
  [/(?<![\p{L}*])([Hh])i\*p(?![\p{L}*])/gu, (_, a) => `${a}iếp`],
  [/(?<=hiếp\s+)da\/m(?![\p{L}*])/gu, () => "dâm"],
  [/(?<![\p{L}*])([Hh])\*ôn(?![\p{L}*])/gu, (_, a) => `${a}ôn`],
  [/(?<=\b[Tt]ự\s+)t\*(?![\p{L}*])/gu, () => "tử"],
  [/(?<=\b[Tt]ự\s+)s\*t(?![\p{L}*])/gu, () => "sát"],
  [/(?<=\b[Tt]ự\s+)v\*n(?![\p{L}*])/gu, () => "vẫn"],
  [/(?<![\p{L}*])([Tt])h\*(?=\s+th[eểế])/gu, (_, a) => `${a}hi`],
  [/(?<=\bcon\s+)đ\*a(?![\p{L}*])/gu, () => "đỉa"],
];
// The source's own furniture: links to itself or mirror sites and "đọc full tại ..." notices, also masked
// ("Đ/ọ.c f,uI.L t.ại vi/vutruyen2.net").
const FURNITURE = [
  /https?:\/\/\S+/gu,
  /(?<!\p{L})đnct(?!\p{L})/giu,
  /[ĐđD][\/.,]?[ọo][\/.,]?c\s*(?:f[.,\/]?u[.,\/]?[IlL1][.,\/]?[Ll]?[.,]?\s*)?t[.\/]?ại\s+(?:page\s+[^”"\n.!?]*|\S*(?:net|com)\S*(?:\s+để\s+ủ\.?ng\s+h\.?ộ\s+t\.?ác\s+g\.?iả\s*!?)?)/gu,
];

/** Counts of unmasked words (lowercase) in raw chapter texts. */
export function wordCounts(texts) {
  const counts = new Map();
  for (const text of texts) {
    for (const token of text.normalize("NFC").split(/\s+/)) {
      const w = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (w && /^\p{L}+$/u.test(w)) counts.set(w.toLowerCase(), (counts.get(w.toLowerCase()) ?? 0) + 1);
    }
  }
  return counts;
}

function cleanText(text, words) {
  let t = text.normalize("NFC");
  for (const re of FURNITURE) t = t.replace(re, "");
  t = t.replace(MASKED, (w) => {
    const known = (s) => (words.get(s.toLowerCase()) ?? 0) >= 3;
    // "hànhz hạz": no Vietnamese word with diacritics ends in z ("Haiz", "Showbiz" stay). Common enough to be "known".
    if (/[^\x00-\x7F]/.test(w) && /z+$/.test(w) && known(w.replace(/z+$/, ""))) return w.replace(/z+$/, "");
    if (known(w)) return w;
    const joined = w.replace(/\/+|\.{1,2}/g, "");
    if (known(joined)) return joined;
    if (known(joined.replace(/z/g, ""))) return joined.replace(/z/g, "");
    return w;
  });
  for (const [re, to] of STARS) t = t.replace(re, to);
  // Missing spaces: "rực rỡ.Đọc", "mang.”Anh", "tôi,anh" (not "TP.HCM" or "2,8"); "cay xè.vNước" (a stray "v").
  return t.replace(/(\p{Ll})\.v(?=\p{Lu})/gu, "$1.").replace(/(\p{Ll}[.!?…]+)(\p{Lu})/gu, "$1 $2").replace(/([.!?…]”)(\p{Lu})/gu, "$1 $2").replace(/(\p{L}),(\p{L})/gu, "$1, $2");
}

function parseChapter(raw, number, words) {
  const text = raw.replace(/\r\n?/g, "\n");
  const sep = text.search(/^={20,}$/m);
  // Header lines: before a "=====" line, or (nhatruyenhay) "CHAPTER_INDEX: 1" / "DOMAIN: ..." lines at the top.
  const top = sep >= 0 ? sep : (text.match(/^(?:[A-Z_]+:[^\n]*\n)+/)?.[0].length ?? 0);
  const head = text.slice(0, top);
  const body = sep >= 0 ? text.slice(sep).replace(/^=+\n/, "") : text.slice(top);
  const header = Object.fromEntries(
    head.split("\n").map((l) => l.match(/^([A-Z_]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
  );
  // Site furniture, not story text: the source's "Bạn đang xem chương N" footer and its Shopee unlock prompt.
  const paragraphs = reflow(cleanText(body, words).split("\n").map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^Bạn đang xem chương \d+$/i.test(l) && !/MỞ ỨNG DỤNG SHOPEE/i.test(l)));
  // The page already shows "Chương N" above the text.
  if (new RegExp(`^chương\\s+${number}\\s*[:.]?$`, "iu").test(paragraphs[0] ?? "")) paragraphs.shift();
  const label = header.CHAPTER ?? "";
  return {
    number,
    title: /^Chương\s+\d+(\s*[:.\-–]\s*\S.*)?$/i.test(label) ? label : `Chương ${number}`,
    // The source showed an unlock popup: the bot only got the part before it.
    truncated: header.HAS_POPUP === "True",
    paragraphs,
  };
}

// index.csv (story,story_title,chapter_number,chapter_title,...): the chapter title starts with the source's story
// code, "#TOP 166\tChương 1". Quoted fields may hold commas.
function readCodes(dir) {
  const file = join(dir, "index.csv");
  const codes = new Map();
  if (!existsSync(file)) return codes;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/).slice(1)) {
    const fields = [...line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map((m) => m[1].replace(/^"|"$/g, "").replaceAll('""', '"'));
    const code = fields[3]?.match(/^#\s*([^\t]+?)\s*\t/)?.[1];
    if (fields[0] && code && !codes.has(fields[0])) codes.set(fields[0], code);
  }
  return codes;
}

// Titles the bot found: some sources write them in capitals, some glue their code in front ("#TOP_T 21 ...") or
// "FULL" at the end. Capitals become title case like the other titles; a few acronyms stay.
const ACRONYMS = new Set(["ceo", "icu", "nyc", "ktv", "mc", "vip", "ivf", "adn", "dna", "pua", "atm", "iq", "eq", "sos", "otp", "cv", "tv", "usd"]);
export function prettyTitle(raw) {
  let t = raw.normalize("NFC").replace(/\s+/g, " ").trim()
    .replace(/^#\s*[A-Z_]+\s*\d+\s+/u, "")
    .replace(/\s*[-–([]?\s*\bfull\b\s*[)\]]?$/iu, "")
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/gu, "")
    .replace(/\s+([,.;:!?])/g, "$1");
  if (t === t.toUpperCase() && /\p{Lu}/u.test(t)) {
    t = t.toLowerCase()
      .replace(/(^|[^\p{L}\d])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
      .replace(/\p{L}+/gu, (w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w));
  }
  return t;
}
const slugify = (t) => t.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const titleKey = (t) => t.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const size = (c) => c.paragraphs.reduce((n, p) => n + p.length, 0);
const textSize = (s) => s.chapters.reduce((n, c) => n + size(c), 0);
// Same story from two sources (or scraped twice): the first chapters share their opening, letters only, since one
// source may cut paragraphs differently. Different stories with the same title share nothing.
const letters = (s) => s.chapters[0].paragraphs.join(" ").toLowerCase().replace(/[^\p{L}]+/gu, "");
function sameStory(a, b) {
  const [x, y] = [letters(a), letters(b)];
  let hits = 0;
  for (let i = 0; i < 400; i += 40) if (x.length >= i + 30 && y.includes(x.slice(i, i + 30))) hits++;
  return hits >= 3;
}

// A source page that holds only a few lines is not worth a chapter of its own: it goes into the chapter before
// (the first chapter takes the one after). Chapters are then numbered 1..N again.
export const MIN_CHAPTER_CHARS = 2000;
function mergeShort(chapters, min) {
  const out = [];
  for (const c of chapters) {
    const prev = out.at(-1);
    if (prev && (size(c) < min || size(prev) < min)) {
      prev.paragraphs.push(...c.paragraphs);
      prev.truncated ||= c.truncated;
    } else out.push({ ...c, paragraphs: [...c.paragraphs] });
  }
  return out.map((c, i) => ({ ...c, number: i + 1, title: `Chương ${i + 1}` }));
}

/**
 * Stories with their chapters from bot output directories, ready to import: text cleaned, short chapters merged,
 * one story per title (the copy with the most text wins; genres are pooled), slugs from the real titles.
 */
export function readBotDirs(dirs, { minChars = MIN_CHAPTER_CHARS } = {}) {
  const raw = [];
  for (const dir of dirs) {
    const chaptersDir = join(dir, "chapters");
    const meta = existsSync(join(dir, "stories.json")) ? JSON.parse(readFileSync(join(dir, "stories.json"), "utf8")) : [];
    const bySlug = new Map(meta.map((s) => [s.slug, s]));
    const codes = readCodes(dir);
    for (const slug of readdirSync(chaptersDir).sort()) {
      const files = readdirSync(join(chaptersDir, slug)).filter((f) => /^chuong-\d+\.txt$/.test(f));
      const texts = files.map((f) => ({ number: Number(f.match(/\d+/)[0]), text: readFileSync(join(chaptersDir, slug, f), "utf8") }));
      raw.push({ dir, slug, meta: bySlug.get(slug) ?? {}, code: codes.get(slug), texts });
    }
  }
  const words = wordCounts(raw.flatMap((r) => r.texts.map((t) => t.text)));

  const stories = [];
  const byTitle = new Map();
  for (const r of raw) {
    const chapters = r.texts.map((t) => parseChapter(t.text, t.number, words))
      .filter((c) => c.paragraphs.length)
      .sort((a, b) => a.number - b.number);
    if (!chapters.length) continue;
    const hasRealTitle = Boolean(r.meta.title && r.meta.title !== r.slug);
    const story = {
      slug: r.slug,
      source: r.dir,
      title: hasRealTitle ? prettyTitle(r.meta.title) : storyTitle(r.meta.title, r.slug, r.code),
      hasRealTitle,
      description: r.meta.description ?? "",
      author: r.meta.author ?? "",
      categories: r.meta.categories ?? [],
      sourceChapters: chapters.length,
      chapters: mergeShort(chapters, minChars),
    };
    const key = titleKey(story.title);
    const same = (byTitle.get(key) ?? []).find((other) => sameStory(story, other));
    if (!same) {
      stories.push(story);
      byTitle.set(key, [...(byTitle.get(key) ?? []), story]);
      continue;
    }
    // Keep the copy with more text, in place of the other.
    const [keep, drop] = textSize(story) > textSize(same) ? [story, same] : [same, story];
    keep.categories = [...new Set([...keep.categories, ...drop.categories])];
    keep.duplicates = [...(keep.duplicates ?? []), `${drop.source}/${drop.slug}`, ...(drop.duplicates ?? [])];
    if (keep === story) {
      stories[stories.indexOf(same)] = story;
      byTitle.set(key, byTitle.get(key).map((s) => (s === same ? story : s)));
    }
  }

  const taken = new Set();
  return stories.map((s) => {
    const base = (s.hasRealTitle && slugify(s.title)) || s.slug;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    return { ...s, sourceSlug: s.slug, slug };
  });
}

/** One directory on its own (no duplicates across directories). */
export const readBotDir = (dir) => readBotDirs([dir]);

const cdata = (s) => `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
const html = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SITE = "https://import.invalid";

// A paragraph as HTML: inner headings and section numbers in bold, the sources' Markdown (**bold**, *italic*) as
// tags. Masks like "Đ** m*" have no closing mark at a word boundary, so they stay text.
function paragraphHtml(p) {
  if (BREAK.test(p)) return "* * *";
  const bold = p.match(/^\*\*([^*]+)\*\*$/u)?.[1] ?? (HEADING.test(p) || /^\d{1,3}$/.test(p) ? p : null);
  if (bold) return `<strong>${html(bold.trim())}</strong>`;
  return html(p)
    .replace(/(?<![\p{L}\p{N}*])\*\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*\*(?![\p{L}\p{N}*])/gu, "<strong>$1</strong>")
    .replace(/(?<![\p{L}\p{N}*])\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*(?![\p{L}\p{N}*])/gu, "<em>$1</em>");
}

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
export function writeWxr(stories, { out, free = "1", completed = false, maxChapters = 300, start = new Date() }) {
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
      if (completed) meta._sw_completed = "1";
      items.push(item({ id: storyId, title: s.title, name: s.slug, type: "story", date: at(), content: html(s.description), terms: s.categories, meta }));
      for (const c of s.chapters) {
        items.push(item({
          id: id++, title: c.title, name: `${s.slug}-${c.number}`, type: "chapter", parent: storyId, order: c.number,
          date: at(), content: c.paragraphs.map(paragraphHtml).join("\n\n"),
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
  const minChars = Number(opt("--min-chars", String(MIN_CHAPTER_CHARS)));
  const completed = args.includes("--completed");
  if (completed) args.splice(args.indexOf("--completed"), 1);
  if (!args.length) throw new Error("usage: node scripts/wp/bot-to-wxr.mjs --out <dir> [--free 1|all] [--completed] [--min-chars 2000] [--max-chapters 300] <bot dir>...");

  const stories = readBotDirs(args, { minChars });
  const files = writeWxr(stories, { out, free, completed, maxChapters });
  const chapters = stories.flatMap((s) => s.chapters);
  for (const f of files) console.log(`${f.file}: ${f.stories} stories, ${f.chapters} chapters`);
  console.log(`total: ${stories.length} stories, ${chapters.length} chapters; free chapters per story: ${free}${completed ? "; all marked completed" : ""}`);
  console.log(`short chapters merged: ${stories.reduce((n, s) => n + s.sourceChapters - s.chapters.length, 0)} (under ${minChars} characters)`);
  console.log(`same story in two places, kept once: ${stories.reduce((n, s) => n + (s.duplicates?.length ?? 0), 0)}`);
  console.log(`no real title (slug used): ${stories.filter((s) => !s.hasRealTitle).length} stories`);
  console.log(`cut short by the source's unlock popup: ${chapters.filter((c) => c.truncated).length} chapters`);
  console.log(`no genre: ${stories.filter((s) => !s.categories.length).length} stories`);
}
