// Story covers from the cover bot (chapter/covers/<source>/*.jpg|png|webp + _log.json) → one small WebP per story,
// named by the story's WordPress slug, plus manifest.json for attach-covers.php.
//
// - 600 px wide (the largest cover is 295 CSS px, so 2x), WebP quality 75, metadata stripped: ~25 KB instead of
//   ~460 KB. WordPress then makes its 150 px thumbnail and 210×300 "medium" from it; the theme's srcset uses those.
// - nhatruyenhay's images are 1200×630 share images: the portrait cover sits in the middle on a blurred copy of
//   itself. Only the middle is kept, or object-fit would show a slice of the blur.
// - A landscape or square image (some truyentop covers) is cut to the cover's shape (295:425) around what sharp's
//   "attention" strategy finds interesting (faces, contrast), instead of the middle slice CSS would show.
// - Byte-identical source images become one file listed for several slugs (one attachment on the site).
//
// Usage: node scripts/wp/covers-to-webp.mjs --covers chapter/covers --out dist/wp/covers <bot dir>...
// The bot dirs are the ones given to bot-to-wxr.mjs (same slugs and duplicate merging). A bot dir's covers are in
// <covers>/<dir name without "output_">, e.g. chapter/output_truyentop → chapter/covers/truyentop.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { readBotDirs } from "./bot-to-wxr.mjs";

let sharp;
try {
  sharp = createRequire(process.env.SHARP_DIR ? join(process.env.SHARP_DIR, "package.json") : import.meta.url)("sharp");
} catch {
  throw new Error("needs sharp: install it outside the repo (npm i sharp@0.35.4 in a tools folder) and set SHARP_DIR to that folder");
}

const WIDTH = 600;
const QUALITY = 75;
const COVER_RATIO = 295 / 425; // .detail-cover in the theme
// The portrait cover inside nhatruyenhay's 1200×630 share image (2 px inside its edges).
const SHARE_IMAGE = { width: 1200, height: 630, box: { left: 445, top: 37, width: 311, height: 556 } };

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const [v] = args.splice(i, 2).slice(1); return v; };
const coversRoot = opt("--covers", "chapter/covers");
const out = opt("--out", "dist/wp/covers");
if (!args.length) throw new Error("usage: node scripts/wp/covers-to-webp.mjs --covers <dir> --out <dir> <bot dir>...");
mkdirSync(out, { recursive: true });

// "<bot dir>/<source slug>" → cover file, from each source's _log.json (slug, file "covers\\truyentop\\Tên.png").
const coverOf = new Map();
for (const dir of args) {
  const name = basename(dir).replace(/^output_/, "");
  const log = join(coversRoot, name, "_log.json");
  if (!existsSync(log)) { console.warn(`no ${log}`); continue; }
  for (const { slug, file } of JSON.parse(readFileSync(log, "utf8"))) {
    if (!file) continue; // the bot found no cover
    const path = join(coversRoot, name, basename(file.replaceAll("\\", "/")));
    if (existsSync(path)) coverOf.set(`${dir}/${slug}`, path);
  }
}

const stories = readBotDirs(args);
const byHash = new Map();
const missing = [];
let sourceBytes = 0;
let outBytes = 0;
let landscape = 0;
for (const s of stories) {
  // The story's own cover, else one of the copies it was merged with.
  const src = [`${s.source}/${s.sourceSlug}`, ...(s.duplicates ?? [])].map((k) => coverOf.get(k)).find(Boolean);
  if (!src) { missing.push(s.slug); continue; }
  const buf = readFileSync(src);
  const hash = createHash("sha256").update(buf).digest("hex");
  const seen = byHash.get(hash);
  if (seen) { seen.slugs.push(s.slug); continue; }
  let img = sharp(buf, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const shareImage = meta.width === SHARE_IMAGE.width && meta.height === SHARE_IMAGE.height;
  if (shareImage) img = sharp(await img.extract(SHARE_IMAGE.box).toBuffer());
  const { width, height } = shareImage ? SHARE_IMAGE.box : (meta.autoOrient ?? meta);
  const wide = width / height > 0.9;
  if (wide) {
    // Largest box of the cover's shape that fits, at most WIDTH wide.
    const w = Math.min(WIDTH, Math.round(height * COVER_RATIO));
    img = img.resize({ width: w, height: Math.round(w / COVER_RATIO), fit: "cover", position: sharp.strategy.attention });
    landscape++;
  } else {
    img = img.resize({ width: WIDTH, withoutEnlargement: true });
  }
  const { data, info } = await img.webp({ quality: QUALITY, effort: 6 }).toBuffer({ resolveWithObject: true });
  const file = `${s.slug}.webp`;
  writeFileSync(join(out, file), data);
  sourceBytes += buf.length;
  outBytes += data.length;
  byHash.set(hash, { file, width: info.width, height: info.height, bytes: data.length, slugs: [s.slug] });
}

const manifest = [...byHash.values()];
writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
console.log(`${manifest.length} WebP files for ${manifest.reduce((n, m) => n + m.slugs.length, 0)} of ${stories.length} stories: ${mb(sourceBytes)} → ${mb(outBytes)}`);
console.log(`shared by several stories: ${manifest.filter((m) => m.slugs.length > 1).length} files; landscape/square cut to the cover shape: ${landscape}`);
console.log(`no cover: ${missing.length}${missing.length ? ` (${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", ..." : ""})` : ""}`);
