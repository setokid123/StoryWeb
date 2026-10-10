// Builds upload-ready zips for wp-admin from the COMMITTED tree (uncommitted edits are not included):
//   node scripts/wp/package.mjs   →  dist/wp/thu-cac.zip, dist/wp/storyweb-core.zip
// core.autocrlf=false keeps LF line endings (Git on Windows would otherwise write CRLF into the archive).
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

const out = "dist/wp";
mkdirSync(out, { recursive: true });
const dirty = execFileSync("git", ["status", "--porcelain", "--", "wp-content"], { encoding: "utf8" }).trim();
if (dirty) console.warn("Warning: wp-content has uncommitted changes; they are NOT in the zips:\n" + dirty);
for (const [name, path] of [["thu-cac", "wp-content/themes/thu-cac"], ["storyweb-core", "wp-content/plugins/storyweb-core"]]) {
  const file = `${out}/${name}.zip`;
  execFileSync("git", ["-c", "core.autocrlf=false", "archive", "--format=zip", `--prefix=${name}/`, "-o", file, `HEAD:${path}`]);
  console.log(`${file}  ${(statSync(file).size / 1024).toFixed(1)} KB`);
}
console.log(`commit ${execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()}`);
