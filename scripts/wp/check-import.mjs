// Leak checks on real stories imported from the story bot (local Playground, 127.0.0.1 only). For ~12 stories that
// have one chapter past the free ones: the free chapters are served; the next one is locked and none of its text
// appears in the page (<head> included), in SEO plugin side doors, search, feeds or sitemaps.
// Usage: [FREE=1] [COMPLETED=1] node scripts/wp/check-import.mjs <bot dir>...
// (the dirs and --free given to bot-to-wxr.mjs; COMPLETED=1 when it ran with --completed)
import { readBotDirs } from "./bot-to-wxr.mjs";

const B = process.env.BASE ?? "http://127.0.0.1:9400";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(B)) throw new Error("local only");
const FREE = Number(process.env.FREE ?? 1);
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

const stories = readBotDirs(dirs).filter((s) => s.chapters.length > FREE);
const step = Math.max(1, Math.ceil(stories.length / 12));
const pick = stories.filter((_, i) => i % step === 0);
ok(`picked ${pick.length} of ${stories.length} stories with more than ${FREE} chapters`, pick.length > 0);

for (const s of pick) {
  const locked = s.chapters[FREE];
  const story = await get(`/truyen/${s.slug}/`);
  ok(`${s.slug}: story page lists ${s.chapters.length} chapters`, story.status === 200 && story.text.includes(`${s.chapters.length} chương`), `status ${story.status}`);
  if (process.env.COMPLETED) ok(`${s.slug}: marked completed`, story.text.includes("Hoàn thành"));
  for (const c of s.chapters.slice(0, FREE)) {
    const p = await get(`/doc/${s.slug}/${c.number}/`);
    ok(`${s.slug}: chương ${c.number} served`, p.status === 200 && has(p.text, c) && !p.text.includes("data-unlock-gate"), `status ${p.status}`);
  }
  const p = await get(`/doc/${s.slug}/${locked.number}/`);
  ok(`${s.slug}: chương ${locked.number} locked, none of its text in the page`, p.status === 200 && p.text.includes("data-unlock-gate") && !has(p.text, locked), `status ${p.status}`);
  ok(`${s.slug}: chương ${locked.number} noindex`, /<meta name=['"]robots['"][^>]*noindex/.test(p.text));
  const head = await get(`/wp-json/yoast/v1/get_head?url=${encodeURIComponent(`${B}/doc/${s.slug}/${locked.number}/`)}`);
  ok(`${s.slug}: no chương ${locked.number} text via Yoast REST head`, !has(head.text, locked), `status ${head.status}`);
}

// Search, REST search and feeds with real words from a locked chapter.
const probe = pick[0].chapters[FREE];
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
