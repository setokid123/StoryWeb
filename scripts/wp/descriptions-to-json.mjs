// Story descriptions from the description bot (chapter/descriptions/<source>/metadata.json: slug, title,
// description) → dist/wp/descriptions.json { "<WordPress story slug>": "<paragraphs, plain text>" } for
// attach-descriptions.php.
//
// - Matched like covers-to-webp.mjs: the bot dirs given to bot-to-wxr.mjs give each story's WordPress slug, its source
//   slug and the copies it was merged with, so a description lands on the same story as its chapters and cover.
// - Of the story's own description and those of its merged copies, the longest wins: nhatruyenhay only has the
//   ~200-character og:description, cut mid-word ("…nửa ngày c"); such a cut gets "…".
// - Cleaned with the chapter cleaner: zhihu's one-word-per-line text is joined back into paragraphs, masked words
//   ("x/ác", "ch*t") and the sources' links are handled the same way.
//
// Usage: node scripts/wp/descriptions-to-json.mjs --descriptions chapter/descriptions --out dist/wp/descriptions.json <bot dir>...
// A bot dir's descriptions are in <descriptions>/<dir name without "output_">, e.g. chapter/output_zhihu → zhihu.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { cleanText, readBotDirs, reflow, wordCounts } from "./bot-to-wxr.mjs";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const [v] = args.splice(i, 2).slice(1); return v; };
const root = opt("--descriptions", "chapter/descriptions");
const out = opt("--out", "dist/wp/descriptions.json");
if (!args.length) throw new Error("usage: node scripts/wp/descriptions-to-json.mjs --descriptions <dir> --out <file> <bot dir>...");

// "<bot dir>/<source slug>" → raw description.
const raw = new Map();
for (const dir of args) {
  const file = join(root, basename(dir).replace(/^output_/, ""), "metadata.json");
  if (!existsSync(file)) { console.warn(`no ${file}`); continue; }
  for (const { slug, description } of JSON.parse(readFileSync(file, "utf8"))) {
    if (typeof description === "string" && description.trim()) raw.set(`${dir}/${slug}`, description);
  }
}

const stories = readBotDirs(args);
// Masked words are restored only when the plain word is common in the stories themselves (as for chapters).
const words = wordCounts(stories.flatMap((s) => s.chapters.flatMap((c) => c.paragraphs)));

function clean(text) {
  const lines = cleanText(text.replace(/\r\n?/g, "\n"), words).split("\n").map((l) => l.trim()).filter(Boolean);
  const paragraphs = reflow(lines);
  const last = paragraphs.length - 1;
  // A cut og:description ends inside a word or sentence.
  if (last >= 0 && !/[.!?…"”’»)\]】]$/u.test(paragraphs[last])) paragraphs[last] = paragraphs[last].replace(/[\s,;:–—-]+$/u, "") + "…";
  return paragraphs.join("\n\n");
}

const result = {};
let found = 0;
let cut = 0;
const missing = [];
for (const s of stories) {
  const candidates = [`${s.source}/${s.sourceSlug}`, ...(s.duplicates ?? [])].map((k) => raw.get(k)).filter(Boolean);
  if (!candidates.length) { missing.push(s.slug); continue; }
  const best = candidates.sort((a, b) => b.length - a.length)[0];
  const text = clean(best);
  if (!text) { missing.push(s.slug); continue; }
  if (text.endsWith("…") && !best.trim().endsWith("…")) cut++;
  result[s.slug] = text;
  found++;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`${found} stories with a description, ${missing.length} without (${cut} descriptions were cut by the source and end with "…")`);
console.log(`→ ${out}`);
if (missing.length) console.log(`no description: ${missing.slice(0, 15).join(", ")}${missing.length > 15 ? ", …" : ""}`);
