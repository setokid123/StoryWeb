// Renders the link-preview images (Open Graph, 1200x630) with headless Chrome and the real fonts:
//   og-image.jpg        site card (home, search, genres; fallback everywhere)
//   og-story-frame.png  story card frame: same scene with a transparent rounded hole where the server pastes the
//                       cover (GD, inc/share.php); title and details are written by the server too.
//   og-story-preview.png  design preview of a story card with a sample cover and title (not shipped)
// usage: node og-render.mjs <logo-dd.svg> <outDir> [sampleCover]
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [SVG_PATH, OUT, SAMPLE] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const mark = (cls) => readFileSync(SVG_PATH, "utf8").replace("<svg ", `<svg class="${cls}" `).replace(/id="(g|h)"/g, `id="$1-${cls}"`).replace(/url\(#(g|h)\)/g, `url(#$1-${cls})`);
const port = 9393;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--allow-file-access-from-files", `--user-data-dir=${OUT}/og-profile`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0, S;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => { const m = { id: ++id, method, params, sessionId: S }; pending.set(m.id, { resolve, reject }); ws.send(JSON.stringify(m)); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

// Story card geometry, shared with inc/share.php (THU_CAC_SHARE_* constants).
const HOLE = { x: 84, y: 66, w: 346, h: 498, r: 26 };

const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Be+Vietnam+Pro:wght@500;600;700;800&display=block">';
const base = `
html,body{margin:0;background:transparent}
#x{position:relative;width:1200px;height:630px;overflow:hidden;font-family:"Be Vietnam Pro";color:#fff}
.scene{position:absolute;inset:0;background:
  radial-gradient(46% 72% at 6% 8%,rgba(79,123,255,.9),transparent 70%),
  radial-gradient(42% 62% at 96% 4%,rgba(255,79,154,.78),transparent 70%),
  radial-gradient(62% 72% at 66% 112%,rgba(139,77,255,.95),transparent 70%),
  radial-gradient(30% 40% at 30% 100%,rgba(255,79,154,.35),transparent 70%),
  linear-gradient(160deg,#1b1554,#110c33 58%,#1e0f40)}
.scene:before{content:"";position:absolute;inset:0;background:radial-gradient(rgba(255,255,255,.22) 1.6px,transparent 2.4px) 0 0/22px 22px;-webkit-mask:radial-gradient(ellipse 55% 60% at 100% 0%,#000,transparent 75%)}
.rails{position:absolute;inset:0}
.chip2d{display:inline-block;font:800 var(--s,30px)/1 Unbounded;letter-spacing:.04em;color:#fff;padding:.32em .5em .26em;border-radius:999px;
  background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,0) 60%),linear-gradient(120deg,#4f46e5,#7c3aed 50%,#db2777);box-shadow:inset 0 2px 0 rgba(255,255,255,.55),0 10px 24px -10px rgba(219,39,119,.8)}
.glass{background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06));border:1.5px solid rgba(255,255,255,.28);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.45),0 30px 60px -30px rgba(10,4,40,.8);-webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%)}
`;
// Metro-like lines (the site draws genres as station lines).
const rails = `<svg class="rails" viewBox="0 0 1200 630" fill="none" stroke-linecap="round">
  <path d="M-40 520 C 260 520 380 380 640 380 S 980 250 1260 250" stroke="#4f7bff" stroke-opacity=".38" stroke-width="12"/>
  <path d="M-40 585 C 300 585 470 470 720 470 S 1020 360 1260 360" stroke="#ff4f9a" stroke-opacity=".32" stroke-width="12"/>
  <path d="M520 -40 C 520 140 700 200 860 200 S 1100 120 1260 60" stroke="#2fc3ff" stroke-opacity=".3" stroke-width="12"/>
  <g fill="#fff" stroke="#1b1554" stroke-width="5" fill-opacity=".9"><circle cx="640" cy="380" r="11"/><circle cx="720" cy="470" r="11"/><circle cx="860" cy="200" r="11"/></g>
</svg>`;

// Story frame: the same lines, fainter and without stations, so they never cross the text.
const railsSoft = rails.replace(/<g fill="#fff"[^]*?<\/g>/, "").replace(/stroke-opacity="\.\d+"/g, 'stroke-opacity=".2"');
const book = (x, y, rot, a, b, sym, title, z) => `<div style="position:absolute;left:${x}px;top:${y}px;width:190px;height:272px;border-radius:20px;transform:rotate(${rot}deg);z-index:${z};overflow:hidden;
  background:radial-gradient(rgba(255,255,255,.22) 1.4px,transparent 2px) 0 0/12px 12px,linear-gradient(155deg,${a},${b});box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 0 0 1.5px rgba(255,255,255,.18),0 28px 50px -22px rgba(8,2,30,.9)">
  <div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.35),rgba(255,255,255,0) 38%)"></div>
  <div style="position:absolute;left:18px;top:18px;font:800 64px/1 Unbounded;color:rgba(255,255,255,.92)">${sym}</div>
  <div style="position:absolute;left:18px;right:18px;bottom:20px;font:800 21px/1.25 'Be Vietnam Pro';text-shadow:0 2px 8px rgba(0,0,0,.25)">${title}</div></div>`;

const site = `<!doctype html><meta charset="utf-8">${fonts}<style>${base}
.left{position:absolute;left:78px;top:70px;width:600px}
.mark{width:118px;height:118px;filter:drop-shadow(0 18px 26px rgba(124,58,237,.55))}
.name{margin-top:22px}
.name b{font:800 74px/1.08 Unbounded;letter-spacing:-.02em}
.tag{margin-top:22px;font:600 31px/1.42 "Be Vietnam Pro";color:#e6e0ff}
.chips{display:flex;gap:10px;margin-top:30px;width:660px}
.chips span{display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:999px;font:700 19px/1 "Be Vietnam Pro";white-space:nowrap}
.chips i{width:12px;height:12px;border-radius:50%}
.ticket{position:absolute;right:62px;bottom:58px;width:330px;padding:20px 24px 18px;border-radius:24px;z-index:5}
.ticket small{display:block;font:800 13px/1 Unbounded;letter-spacing:.18em;color:#ffd6ea}
.ticket strong{display:block;margin-top:10px;font:800 25px/1.2 Unbounded}
.ticket p{margin:14px 0 0;padding-top:12px;border-top:2px dashed rgba(255,255,255,.3);display:flex;justify-content:space-between;font:600 17px/1 "Be Vietnam Pro";color:#ddd6ff}

</style><div id="x"><div class="scene"></div>${rails}
<div class="left">${mark("mark")}
  <div class="name"><b>Trạm<br>Truyện <span class="chip2d" style="--s:36px;vertical-align:.18em">2D</span></b></div>
  <div class="tag">Nghìn câu chuyện hay,<br>luôn ở trong tầm tay.</div>
  <div class="chips">
    <span class="glass"><i style="background:#ff4f9a"></i>Ngôn tình</span>
    <span class="glass"><i style="background:#4f7bff"></i>Đô thị</span>
    <span class="glass"><i style="background:#ffd166"></i>Cổ trang</span>
    <span class="glass"><i style="background:#3ddc97"></i>Trọng sinh</span>
  </div>
</div>
${book(720, 70, -9, "#6a5cff", "#ff6fb1", "✦", "", 1)}
${book(880, 46, 6, "#ff8a5c", "#c13cff", "☾", "", 2)}
${book(800, 214, -2, "#2fc3ff", "#6a3df5", "❀", "", 3)}
<div class="ticket glass"><small>VÉ ĐỌC TRUYỆN</small><strong>Ga Trạm Truyện 2D</strong><p><span>Chương 1</span><span>→</span><span>Hết truyện</span></p></div>
</div>`;

// Story frame: the scene with a rounded hole for the cover (alpha), a soft shadow and glass rim around it,
// the brand on top of the text column and a "Đọc ngay" pill at its foot.
const H = HOLE;
const holePath = `M0 0H1200V630H0Z M${H.x + H.r} ${H.y} H${H.x + H.w - H.r} A${H.r} ${H.r} 0 0 1 ${H.x + H.w} ${H.y + H.r} V${H.y + H.h - H.r} A${H.r} ${H.r} 0 0 1 ${H.x + H.w - H.r} ${H.y + H.h} H${H.x + H.r} A${H.r} ${H.r} 0 0 1 ${H.x} ${H.y + H.h - H.r} V${H.y + H.r} A${H.r} ${H.r} 0 0 1 ${H.x + H.r} ${H.y}Z`;
const holeMask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><path fill-rule='evenodd' d='${holePath}'/></svg>`)}")`;
const frameBody = (withSample) => `<div id="x">
  ${withSample ? `<img src="${withSample}" style="position:absolute;left:${H.x}px;top:${H.y}px;width:${H.w}px;height:${H.h}px;object-fit:cover">` : ""}
  <div style="position:absolute;inset:0;clip-path:path(evenodd, '${holePath}')">
    <div class="scene"></div>${railsSoft}
    <div style="position:absolute;left:${H.x}px;top:${H.y}px;width:${H.w}px;height:${H.h}px;border-radius:${H.r}px;box-shadow:0 34px 60px -18px rgba(6,2,28,.85),0 0 0 10px rgba(255,255,255,.08)"></div>
    <div style="position:absolute;left:${H.x - 1}px;top:${H.y - 1}px;width:${H.w + 2}px;height:${H.h + 2}px;border-radius:${H.r + 1}px;box-shadow:0 0 0 1.5px rgba(255,255,255,.55)"></div>
    <div style="position:absolute;left:500px;top:70px;display:flex;align-items:center;gap:14px">${mark("mk")}<b style="font:800 29px/1 Unbounded;letter-spacing:-.01em">Trạm Truyện</b><span class="chip2d" style="--s:17px">2D</span></div>
    <div style="position:absolute;left:500px;bottom:66px;display:flex;align-items:center;gap:12px;padding:15px 26px 15px 28px;border-radius:999px;font:800 22px/1 Unbounded;
      background:linear-gradient(180deg,rgba(255,255,255,.32),rgba(255,255,255,0) 60%),linear-gradient(120deg,#4f46e5,#7c3aed 50%,#db2777);box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 16px 30px -12px rgba(219,39,119,.9)">Đọc ngay <span style="font-size:26px">›</span></div>
  </div>
</div>`;
const frameCss = `${base}.mk{width:54px;height:54px;filter:drop-shadow(0 8px 14px rgba(124,58,237,.6))}`;
const frame = `<!doctype html><meta charset="utf-8">${fonts}<style>${frameCss}</style>${frameBody("")}`;
const preview = SAMPLE ? `<!doctype html><meta charset="utf-8">${fonts}<style>${frameCss}
.t{position:absolute;left:500px;top:168px;width:620px;font:800 54px/1.22 "Be Vietnam Pro";letter-spacing:-.01em;color:#fff}
.m{position:absolute;left:500px;font:600 25px/1.3 "Be Vietnam Pro";color:#d9d2ff}</style>${frameBody("file:///" + SAMPLE.replace(/\\/g, "/"))}
<div class="t">Yêu Hận Từ Đây Khép Lại</div><div class="m" style="top:330px">Tác giả: Chưa rõ tác giả</div><div class="m" style="top:372px">45 chương · Hoàn thành · Ngôn tình</div>` : "";

const jobs = [["og-image.jpg", site, "jpeg"], ["og-story-frame.png", frame, "png"]];
if (preview) jobs.push(["og-story-preview.png", preview, "png"]);
try {
  let info;
  for (let i = 0; i < 40; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId: S } = await send("Target.attachToTarget", { targetId, flatten: true }));
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  for (const [name, html, format] of jobs) {
    await send("Emulation.setDefaultBackgroundColorOverride", format === "png" ? { color: { r: 0, g: 0, b: 0, a: 0 } } : { color: { r: 17, g: 12, b: 51, a: 1 } });
    const file = `${OUT}/${name}.html`;
    writeFileSync(file, html);
    await send("Page.navigate", { url: "file:///" + file.replace(/\\/g, "/") });
    await sleep(2500);
    await evaluate("document.fonts.ready.then(() => true)");
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format, ...(format === "jpeg" ? { quality: 90 } : {}), clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
    writeFileSync(`${OUT}/${name}`, Buffer.from(shot.data, "base64"));
    console.log(name, Math.round(shot.data.length * 0.75 / 1024) + " KB");
  }
} catch (e) {
  console.error("FAILED:", e.message);
} finally {
  ws?.close();
  chrome.kill();
}
