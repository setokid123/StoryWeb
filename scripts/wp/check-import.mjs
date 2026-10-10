// Leak checks on real stories imported from the story bot (local Playground, 127.0.0.1 only). For ~12 stories that
// have chapters 1 and 2: chapter 1 is served; chapter 2 is locked and none of its text appears in the page (<head>
// included), in SEO plugin side doors, search, feeds or sitemaps.
// Usage: node scripts/wp/check-import.mjs <bot dir>...   (the dirs given to bot-to-wxr.mjs, free chapters = 1)
import { readBotDir } from "./bot-to-wxr.mjs";

const B = process.env.BASE ?? "http://127.0.0.1:9400";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(B)) throw new Error("local only");
const dirs = process.argv.slice(2);
if (!dirs.length) throw new Error("usage: node scripts/wp/check-import.mjs <bot dir>...");

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const get = async (p) => { const r = await fetch(B + p, { redirect: "manual" }); return { status: r.status, text: await r.text() }; };
// Letters only, so entities, curly quotes and tags can't hide a match (same rule as check-content.mjs).
const words = (t) => t
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .normalize("NFC").replace(/&[a-z]+;|[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
// First 8 words of the chapter's first paragraph that has 8 words.
const opening = (c) => words(c.paragraphs.find((p) => words(p).split(" ").length >= 8) ?? c.paragraphs.join(" ")).split(" ").slice(0, 8).join(" ");
const has = (text, c) => words(text).includes(opening(c));

const stories = dirs.flatMap(readBotDir).filter((s) => s.chapters[0]?.number === 1 && s.chapters[1]?.number === 2);
const step = Math.max(1, Math.ceil(stories.length / 12));
const pick = stories.filter((_, i) => i % step === 0);
ok(`picked ${pick.length} of ${stories.length} stories with chapters 1 and 2`, pick.length > 0);

for (const s of pick) {
  const [c1, c2] = s.chapters;
  const story = await get(`/truyen/${s.slug}/`);
  ok(`${s.slug}: story page lists ${s.chapters.length} chapters`, story.status === 200 && story.text.includes(`${s.chapters.length} chương`), `status ${story.status}`);
  const p1 = await get(`/doc/${s.slug}/1/`);
  ok(`${s.slug}: chương 1 served`, p1.status === 200 && has(p1.text, c1), `status ${p1.status}`);
  const p2 = await get(`/doc/${s.slug}/2/`);
  ok(`${s.slug}: chương 2 locked, none of its text in the page`, p2.status === 200 && p2.text.includes("data-unlock-gate") && !has(p2.text, c2), `status ${p2.status}`);
  ok(`${s.slug}: chương 2 noindex`, /<meta name=['"]robots['"][^>]*noindex/.test(p2.text));
  const head = await get(`/wp-json/yoast/v1/get_head?url=${encodeURIComponent(`${B}/doc/${s.slug}/2/`)}`);
  ok(`${s.slug}: no chương 2 text via Yoast REST head`, !has(head.text, c2), `status ${head.status}`);
}

// Search, REST search and feeds with real words from a locked chapter.
const probe = pick[0].chapters[1];
const q = encodeURIComponent(opening(probe).split(" ").slice(0, 3).join(" "));
for (const [name, path] of [["WP search", `/?s=${q}`], ["REST search", `/wp-json/wp/v2/search?search=${q}`], ["feed", "/feed/"], ["Yoast REST head of story", `/wp-json/yoast/v1/get_head?url=${encodeURIComponent(`${B}/truyen/${pick[0].slug}/`)}`]]) {
  const r = await get(path);
  ok(`no locked text via ${name}`, !has(r.text, probe), `status ${r.status}`);
}
for (const path of ["/wp-sitemap.xml", "/sitemap_index.xml", "/chapter-sitemap.xml"]) {
  const r = await get(path);
  ok(`${path}: no chapter sitemap, no reader URLs`, r.status !== 200 || (!/chapter-sitemap|wp-sitemap-posts-chapter/i.test(r.text) && !r.text.includes("/doc/")), `status ${r.status}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
