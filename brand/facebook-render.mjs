// Renders the Facebook Page images with headless Chrome and the real fonts (same scene as og-render.mjs):
//   facebook-anh-dai-dien.png  profile picture 1080x1080 (Facebook crops it to a circle; logo only, no text)
//   facebook-anh-bia.png       cover 1640x924: phones show all of it (16:9), computers only the middle band
//                              1640x624 (y 150..774), so everything that matters sits in that band, away from the
//                              bottom-left corner where the profile picture overlaps on computers.
//   facebook-xem-truoc.png     how both look on a computer and on a phone (not for upload)
// usage: node brand/facebook-render.mjs brand/logo-dd.svg brand
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [SVG_PATH, OUT_ARG] = process.argv.slice(2);
const OUT = resolve(OUT_ARG);
mkdirSync(OUT, { recursive: true });
const TMP = mkdtempSync(join(tmpdir(), "fb-render-")); // Chrome profile and HTML pages, removed at the end
const svg = readFileSync(SVG_PATH, "utf8");
const mark = (cls) => svg.replace("<svg ", `<svg class="${cls}" `).replace(/id="(g|h)"/g, `id="$1-${cls}"`).replace(/url\(#(g|h)\)/g, `url(#$1-${cls})`);
const port = 9395;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--allow-file-access-from-files", `--user-data-dir=${TMP}/profile`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0, S;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => { const m = { id: ++id, method, params, sessionId: S }; pending.set(m.id, { resolve, reject }); ws.send(JSON.stringify(m)); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Be+Vietnam+Pro:wght@500;600;700;800&display=block">';
const base = `
html,body{margin:0;background:transparent}
#x{position:relative;overflow:hidden;font-family:"Be Vietnam Pro";color:#fff}
.scene{position:absolute;inset:0;background:
  radial-gradient(46% 72% at 6% 8%,rgba(79,123,255,.9),transparent 70%),
  radial-gradient(42% 62% at 96% 4%,rgba(255,79,154,.78),transparent 70%),
  radial-gradient(62% 72% at 66% 112%,rgba(139,77,255,.95),transparent 70%),
  radial-gradient(30% 40% at 30% 100%,rgba(255,79,154,.35),transparent 70%),
  linear-gradient(160deg,#1b1554,#110c33 58%,#1e0f40)}
.scene:before{content:"";position:absolute;inset:0;background:radial-gradient(rgba(255,255,255,.22) 1.6px,transparent 2.4px) 0 0/22px 22px;-webkit-mask:radial-gradient(ellipse 55% 60% at 100% 0%,#000,transparent 75%)}
.rails{position:absolute;inset:0;width:100%;height:100%}
.chip2d{display:inline-block;font:800 var(--s,30px)/1 Unbounded;letter-spacing:.04em;color:#fff;padding:.32em .5em .26em;border-radius:999px;
  background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,0) 60%),linear-gradient(120deg,#4f46e5,#7c3aed 50%,#db2777);box-shadow:inset 0 2px 0 rgba(255,255,255,.55),0 10px 24px -10px rgba(219,39,119,.8)}
.glass{background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06));border:2px solid rgba(255,255,255,.28);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 40px 80px -40px rgba(10,4,40,.8);-webkit-backdrop-filter:blur(22px) saturate(140%);backdrop-filter:blur(22px) saturate(140%)}
`;

// Profile picture: the logo on a glass disc over the scene; nothing near the corners (the circle crop).
const avatar = `<!doctype html><meta charset="utf-8">${fonts}<style>${base}
#x{width:1080px;height:1080px;display:grid;place-items:center}
.disc{position:absolute;width:760px;height:760px;border-radius:50%}
.mark{position:relative;width:600px;height:600px;filter:drop-shadow(0 40px 60px rgba(124,58,237,.6))}
</style><div id="x"><div class="scene"></div>
<svg class="rails" viewBox="0 0 1080 1080" fill="none" stroke-linecap="round"><path d="M-40 900 C 300 900 520 760 1120 700" stroke="#4f7bff" stroke-opacity=".35" stroke-width="20"/><path d="M-40 990 C 360 990 600 860 1120 820" stroke="#ff4f9a" stroke-opacity=".3" stroke-width="20"/></svg>
<div class="disc glass"></div>${mark("mark")}</div>`;

// Cover 1640x924, safe band y 150..774.
const book = (x, y, w, rot, a, b, sym, z) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${Math.round(w * 1.43)}px;border-radius:${Math.round(w * .11)}px;transform:rotate(${rot}deg);z-index:${z};overflow:hidden;
  background:radial-gradient(rgba(255,255,255,.22) 1.6px,transparent 2.4px) 0 0/14px 14px,linear-gradient(155deg,${a},${b});box-shadow:inset 0 2px 0 rgba(255,255,255,.5),inset 0 0 0 2px rgba(255,255,255,.18),0 36px 60px -26px rgba(8,2,30,.9)">
  <div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.35),rgba(255,255,255,0) 38%)"></div>
  <div style="position:absolute;left:${Math.round(w * .1)}px;top:${Math.round(w * .1)}px;font:800 ${Math.round(w * .34)}px/1 Unbounded;color:rgba(255,255,255,.92)">${sym}</div></div>`;
const cover = `<!doctype html><meta charset="utf-8">${fonts}<style>${base}
#x{width:1640px;height:924px}
.left{position:absolute;left:150px;top:172px;width:960px}
.row{display:flex;align-items:center;gap:26px}
.mark{width:150px;height:150px;flex:none;filter:drop-shadow(0 22px 30px rgba(124,58,237,.55))}
.name{font:800 104px/1.02 Unbounded;letter-spacing:-.02em}
.tag{margin-top:26px;font:600 36px/1.42 "Be Vietnam Pro";color:#e6e0ff;white-space:nowrap}
.chips{display:flex;gap:14px;margin-top:30px}
.chips span{display:inline-flex;align-items:center;gap:12px;padding:13px 22px;border-radius:999px;font:700 25px/1 "Be Vietnam Pro";white-space:nowrap}
.chips i{width:14px;height:14px;border-radius:50%}
.ticket{position:absolute;left:1146px;top:552px;width:360px;padding:22px 28px 20px;border-radius:28px;z-index:5}
.ticket small{display:block;font:800 15px/1 Unbounded;letter-spacing:.18em;color:#ffd6ea}
.ticket strong{display:block;margin-top:12px;font:800 28px/1.2 Unbounded}
.ticket p{margin:14px 0 0;padding-top:12px;border-top:2px dashed rgba(255,255,255,.3);display:flex;justify-content:space-between;font:600 19px/1 "Be Vietnam Pro";color:#ddd6ff}
</style><div id="x"><div class="scene"></div>
<svg class="rails" viewBox="0 0 1640 924" fill="none" stroke-linecap="round">
  <path d="M-40 760 C 360 760 520 560 880 560 S 1340 380 1700 380" stroke="#4f7bff" stroke-opacity=".38" stroke-width="16"/>
  <path d="M-40 850 C 420 850 640 690 980 690 S 1400 530 1700 530" stroke="#ff4f9a" stroke-opacity=".32" stroke-width="16"/>
  <path d="M760 -40 C 760 170 980 250 1180 250 S 1500 150 1700 80" stroke="#2fc3ff" stroke-opacity=".3" stroke-width="16"/>
  <g fill="#fff" stroke="#1b1554" stroke-width="6" fill-opacity=".9"><circle cx="880" cy="560" r="14"/><circle cx="1180" cy="250" r="14"/></g>
</svg>
<div class="left">
  <div class="row">${mark("mark")}<div class="name">Trạm Truyện <span class="chip2d" style="--s:50px;vertical-align:.16em">2D</span></div></div>
  <div class="tag">Nghìn câu chuyện hay, luôn ở trong tầm tay.<br>Truyện mới lên tàu mỗi ngày.</div>
  <div class="chips">
    <span class="glass"><i style="background:#ff4f9a"></i>Ngôn tình</span>
    <span class="glass"><i style="background:#4f7bff"></i>Đô thị</span>
    <span class="glass"><i style="background:#ffd166"></i>Cổ trang</span>
    <span class="glass"><i style="background:#3ddc97"></i>Trọng sinh</span>
  </div>
</div>
${book(1120, 196, 230, -9, "#6a5cff", "#ff6fb1", "✦", 1)}
${book(1310, 168, 230, 7, "#ff8a5c", "#c13cff", "☾", 2)}
${book(1218, 330, 220, -2, "#2fc3ff", "#6a3df5", "❀", 3)}
<div class="ticket glass"><small>VÉ ĐỌC TRUYỆN</small><strong>Ga Trạm Truyện 2D</strong><p><span>Chương 1</span><span>→</span><span>Hết truyện</span></p></div>
</div>`;

const jobs = [["facebook-anh-dai-dien.png", avatar, 1080, 1080], ["facebook-anh-bia.png", cover, 1640, 924]];
try {
  let info;
  for (let i = 0; i < 40; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId: S } = await send("Target.attachToTarget", { targetId, flatten: true }));
  await send("Page.enable");
  for (const [name, html, width, height] of jobs) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const file = join(TMP, `${name}.html`);
    writeFileSync(file, html);
    await send("Page.navigate", { url: "file:///" + file.replace(/\\/g, "/") });
    await sleep(2500);
    await evaluate("document.fonts.ready.then(() => true)");
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(`${OUT}/${name}`, Buffer.from(shot.data, "base64"));
    console.log(name, `${width}x${height}`, Math.round(shot.data.length * 0.75 / 1024) + " KB");
  }
  // Preview: computer (cover cut to 820x312, round picture over its bottom-left) and phone (640x360, picture below).
  const img = (name) => "file:///" + `${OUT}/${name}`.replace(/\\/g, "/");
  const preview = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f0f2f5;font:600 15px system-ui}#x{display:flex;gap:40px;padding:30px;align-items:flex-start}
  .pc{width:820px}.pc .c{width:820px;height:312px;border-radius:0 0 8px 8px;background:url(${img("facebook-anh-bia.png")}) center/820px auto}
  .pc .a{width:168px;height:168px;border-radius:50%;border:4px solid #fff;margin:-84px 0 0 32px;background:url(${img("facebook-anh-dai-dien.png")}) center/cover;position:relative}
  .ph{width:360px}.ph .c{width:360px;height:202px;background:url(${img("facebook-anh-bia.png")}) center/cover}
  .ph .a{width:120px;height:120px;border-radius:50%;border:4px solid #fff;margin:-60px auto 0;background:url(${img("facebook-anh-dai-dien.png")}) center/cover;position:relative}
  p{margin:8px 0 0;color:#65676b}</style><div id="x"><div class="pc"><div class="c"></div><div class="a"></div><p>Máy tính</p></div><div class="ph"><div class="c"></div><div class="a"></div><p style="text-align:center">Điện thoại</p></div></div>`;
  await send("Emulation.setDeviceMetricsOverride", { width: 1310, height: 560, deviceScaleFactor: 1, mobile: false });
  const file = join(TMP, "preview.html");
  writeFileSync(file, preview);
  await send("Page.navigate", { url: "file:///" + file.replace(/\\/g, "/") });
  await sleep(1500);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1310, height: 560, scale: 1 } });
  writeFileSync(`${OUT}/facebook-xem-truoc.png`, Buffer.from(shot.data, "base64"));
  console.log("facebook-xem-truoc.png");
} catch (e) {
  console.error("FAILED:", e.message);
} finally {
  ws?.close();
  chrome.kill();
  setTimeout(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} }, 1500);
}
