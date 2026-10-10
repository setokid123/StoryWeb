// Browser walkthrough of the WordPress port (headless Chrome over CDP). Local Playground only.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const B = "http://127.0.0.1:9400";
const OUT = process.env.OUT;
const PROD = process.env.PROD; // optional: current Next.js site for a side-by-side reference (read-only GETs)
const S = "thanh-pho-sau-con-mua";
mkdirSync(OUT, { recursive: true });
const port = 9335;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", `--user-data-dir=${OUT}/profile`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0, S_ID; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => { const m = { id: ++id, method, params, sessionId: S_ID }; pending.set(m.id, { resolve, reject }); ws.send(JSON.stringify(m)); });
const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails)); return r.result.value; };
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const viewport = (width, height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
const go = async (url, wait = 2500) => { await send("Page.navigate", { url }); await sleep(wait); };
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64")); };
const setTheme = async (theme) => { await evaluate(`localStorage.setItem('storyweb-theme','${theme}')`); };
const consoleErrors = [];
const key = async (k, code, keyCode, text) => {
  await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: keyCode, text });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: keyCode });
};
const scrollTo = async (y) => { await evaluate(`window.scrollTo(0, ${y})`); await sleep(250); };
const chrome_state = () => evaluate(`(() => { const t = document.querySelector('[data-reader-toolbar]'); const w = document.querySelector('[data-reader-dock]'); const d = w?.querySelector('.reader-floating-nav');
  return { toolbar: t?.dataset.scrollState, toolbarInert: t?.inert, dockVisible: d?.classList.contains('is-visible'), dockInert: w?.inert, active: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.className ?? '' } })()`);

try {
  let info; for (let i = 0; i < 40; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
    if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails?.exception?.description ?? "exception");
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId: S_ID } = await send("Target.attachToTarget", { targetId, flatten: true }));
  await send("Page.enable"); await send("Runtime.enable");

  // ---------- screenshots: every page, desktop + mobile, light + dark ----------
  const pages = [["home", "/"], ["discover", "/tim-kiem/"], ["story", `/truyen/${S}/`], ["reader-free", `/doc/${S}/1/`], ["reader-locked", `/doc/${S}/2/`], ["404", "/khong-co/"]];
  for (const theme of ["light", "dark"]) {
    for (const [w, h] of [[1280, 900], [360, 780]]) {
      await viewport(w, h);
      await go(B + "/", 1200); await setTheme(theme);
      for (const [name, path] of pages) {
        await go(B + path);
        const overflow = await evaluate("document.documentElement.scrollWidth - innerWidth");
        // Lora is the "Văn học" reading font: only a page with a chapter body needs it.
        const fonts = await evaluate(name === "reader-free"
          ? "document.fonts.check('16px Lora') && document.fonts.check('16px \"Be Vietnam Pro\"')"
          : "document.fonts.check('16px \"Be Vietnam Pro\"') && document.fonts.check('700 16px Unbounded')");
        const dataTheme = await evaluate("document.documentElement.getAttribute('data-theme')");
        if (name === "home") check(`${theme} ${w}px: theme applied before paint`, (theme === "dark") === (dataTheme === "dark"), String(dataTheme));
        check(`${theme} ${w}px ${name}: no horizontal overflow${w === 1280 && theme === "light" ? ", fonts loaded" : ""}`, overflow <= 0 && (w !== 1280 || theme !== "light" || fonts), `overflow=${overflow}${w === 1280 && theme === "light" ? ` fonts=${fonts}` : ""}`);
        await shot(`${name}-${w}-${theme}`);
      }
    }
  }

  // ---------- reader interactions (desktop, light) ----------
  await viewport(1280, 900);
  await go(B + "/", 1000); await setTheme("light");
  await evaluate("localStorage.removeItem('storyweb:reader-prefs:v1'); localStorage.setItem('storyweb:font-size','22')");
  await go(`${B}/doc/${S}/1/`);
  let st = await evaluate("({ size: getComputedStyle(document.querySelector('[data-reader-text]')).fontSize, stored: localStorage.getItem('storyweb:reader-prefs:v1'), legacy: localStorage.getItem('storyweb:font-size') })");
  check("legacy storyweb:font-size=22 migrated and applied", st.size === "22px" && st.stored?.includes('"fontSize":22') && st.legacy === null, JSON.stringify(st));

  await evaluate("document.querySelector('[data-prefs-toggle]').click()"); await sleep(300);
  st = await evaluate("({ open: !document.getElementById('reader-preferences').hidden, expanded: document.querySelector('[data-prefs-toggle]').getAttribute('aria-expanded'), focusInPanel: document.querySelector('.reader-prefs').contains(document.activeElement), lineLoose: document.querySelector('[data-pref=lineHeight][data-value=normal]').getAttribute('aria-pressed') })");
  check("preferences panel opens, focus inside, current option pressed", st.open && st.expanded === "true" && st.focusInPanel && st.lineLoose === "true", JSON.stringify(st));
  await evaluate("document.querySelector('[data-pref=fontFamily][data-value=inter]').click(); document.querySelector('[data-pref=columnWidth][data-value=narrow]').click(); document.querySelector('[data-font-step=\"1\"]').click()"); await sleep(200);
  st = await evaluate("(() => { const t = document.querySelector('[data-reader-text]'); return { font: t.dataset.prefFont, width: t.dataset.prefWidth, size: t.style.fontSize, family: getComputedStyle(t).fontFamily.slice(0, 20), maxw: getComputedStyle(t).maxWidth } })()");
  check("Hiện đại + Hẹp + A+ apply to the chapter body", st.font === "inter" && st.width === "narrow" && st.size === "23px" && st.family.includes("Be Vietnam Pro") && st.maxw === "560px", JSON.stringify(st));
  await shot("reader-prefs-open-1280-light");
  await evaluate("document.querySelector('[data-pref=theme][data-value=dark]').click()"); await sleep(200);
  check("theme 'Tối' from the panel switches the page", await evaluate("document.documentElement.getAttribute('data-theme') === 'dark' && localStorage.getItem('storyweb-theme') === 'dark'"));
  await key("Escape", "Escape", 27); await sleep(300);
  st = await chrome_state();
  check("Escape closes panel, focus back on 'Tùy chỉnh đọc'", (await evaluate("document.getElementById('reader-preferences').hidden")) && st.active === "Tùy chỉnh đọc", st.active);
  await evaluate("document.querySelector('[data-prefs-toggle]').click()"); await sleep(200);
  await evaluate("document.querySelector('[data-prefs-reset]').click()"); await sleep(200);
  check("reset restores defaults (Lora 19px, system theme)", await evaluate("(() => { const t = document.querySelector('[data-reader-text]'); return t.dataset.prefFont === 'lora' && t.style.fontSize === '19px' && localStorage.getItem('storyweb-theme') === null })()"));
  await setTheme("light"); await go(`${B}/doc/${S}/1/`);

  // Scroll behaviour (pad the page so there is room to scroll).
  await evaluate("(() => { const t = document.querySelector('[data-reader-text]'); const p = t.querySelector('p'); for (let i = 0; i < 40; i++) t.appendChild(p.cloneNode(true)); })()"); await sleep(200);
  await scrollTo(0);
  st = await chrome_state();
  const veil = () => evaluate("getComputedStyle(document.querySelector('.reader-veil')).opacity");
  await sleep(400);
  const veilTop = await veil();
  check("page just opened: toolbar at the top, dock already visible at the bottom, no veil", st.toolbar === "top" && !st.toolbarInert && st.dockVisible && !st.dockInert && veilTop === "0", JSON.stringify({ ...st, veilTop }));
  for (const y of [300, 700, 1200]) await scrollTo(y);
  st = await chrome_state();
  const pins = await evaluate("(() => { const h = document.querySelector('.site-header__bar').getBoundingClientRect(); const t = document.querySelector('[data-reader-toolbar]').getBoundingClientRect(); return { headerTop: Math.round(h.top), gap: Math.round(t.top - h.bottom) }; })()");
  await sleep(400);
  pins.veil = await veil();
  check("scroll down: header and toolbar stay pinned (14px apart) over the frosted veil, dock stays visible", st.toolbar === "pinned" && !st.toolbarInert && st.dockVisible && !st.dockInert && pins.headerTop >= 0 && pins.headerTop <= 12 && pins.gap === 14 && pins.veil === "1", JSON.stringify({ ...st, ...pins }));
  await scrollTo(1170); await scrollTo(1100);
  st = await chrome_state();
  check("scroll back up: toolbar pinned, dock visible", st.toolbar === "pinned" && !st.toolbarInert && st.dockVisible && !st.dockInert, JSON.stringify(st));
  await shot("reader-dock-1280-light");
  // Chapter list from the dock: loads 120 chapters, current marked, focus returns to the dock button.
  await evaluate("document.querySelector('[data-chapter-list-open=dock]').focus()");
  await key("Enter", "Enter", 13, "\r"); await sleep(1500);
  st = await evaluate("({ open: !document.querySelector('[data-chapter-dialog]').hidden, items: document.querySelectorAll('[data-chapter-list] li').length, current: document.activeElement?.getAttribute('aria-current'), locks: document.querySelectorAll('.chapter-list__link.is-locked').length })");
  check("chapter list opens from the dock, 120 items, focus on current, 119 locked", st.open && st.items === 120 && st.current === "page" && st.locks === 119, JSON.stringify(st));
  await shot("reader-chapter-list-1280-light");
  await key("Escape", "Escape", 27); await sleep(600);
  st = await chrome_state();
  check("Escape returns focus to the dock 'Danh sách chương' button", st.active === "Danh sách chương" && st.dockVisible, JSON.stringify(st));
  await evaluate("document.activeElement.blur()");

  // End nav on screen hides the dock.
  await scrollTo(99999);
  st = await chrome_state();
  check("end navigation on screen: dock hidden", !st.dockVisible && st.dockInert, JSON.stringify(st));

  // "Không ghim": chosen in the preferences, remembered across reloads (set before paint), bars hide on the way down.
  await scrollTo(0);
  await evaluate("document.querySelector('[data-prefs-toggle]').click()"); await sleep(250);
  await evaluate("document.querySelector('[data-pref=toolbarMode][data-value=auto]').click()"); await sleep(150);
  await key("Escape", "Escape", 27); await sleep(300);
  await go(`${B}/doc/${S}/1/`);
  let g = await evaluate("({ attr: document.documentElement.dataset.readerChrome, header: getComputedStyle(document.querySelector('.site-header')).position, pressed: document.querySelector('[data-pref=toolbarMode][data-value=auto]').getAttribute('aria-pressed') })");
  check("'Không ghim' is remembered after reload: header not sticky, option pressed", g.attr === "auto" && g.header === "relative" && g.pressed === "true", JSON.stringify(g));
  await evaluate("(() => { const t = document.querySelector('[data-reader-text]'); const p = t.querySelector('p'); for (let i = 0; i < 40; i++) t.appendChild(p.cloneNode(true)); })()"); await sleep(200);
  for (const y of [300, 700, 1200]) await scrollTo(y);
  st = await chrome_state();
  check("'Không ghim': scrolling down hides the toolbar, the dock stays pinned", st.toolbar === "hidden" && st.toolbarInert && st.dockVisible && !st.dockInert, JSON.stringify(st));
  await scrollTo(1170); await scrollTo(1100);
  st = await chrome_state();
  check("'Không ghim': scrolling up brings the toolbar back, dock still there", st.toolbar === "pinned" && !st.toolbarInert && st.dockVisible && !st.dockInert, JSON.stringify(st));
  await evaluate("localStorage.removeItem('storyweb:reader-prefs:v1')");

  // Locked chapter: gate focused, Tab trapped, Escape goes back to the story.
  await go(`${B}/doc/${S}/2/`);
  g = await evaluate("({ body: !!document.querySelector('[data-reader-text]'), focusInGate: document.querySelector('[data-unlock-gate]').contains(document.activeElement), dockInert: document.querySelector('[data-reader-dock]').inert })");
  check("locked chapter: no body element, focus inside gate, dock inert", !g.body && g.focusInGate && g.dockInert, JSON.stringify(g));
  await key("Escape", "Escape", 27); await sleep(2000);
  check("Escape on the gate goes back to the story page", (await evaluate("location.pathname")) === `/truyen/${S}/`);

  // Bookshelf: save from the story page, then the shelf renders it.
  await evaluate("localStorage.removeItem('storyweb:bookshelf')");
  await go(`${B}/truyen/${S}/`);
  await evaluate("document.querySelector('[data-bookshelf-toggle]').click()"); await sleep(300);
  g = await evaluate("({ label: document.querySelector('[data-bookshelf-label]').textContent, pressed: document.querySelector('[data-bookshelf-toggle]').getAttribute('aria-pressed'), stored: localStorage.getItem('storyweb:bookshelf') })");
  check("short description: shown in full, no Xem thêm button", await evaluate("document.querySelector('[data-blurb-toggle]').hidden && !document.querySelector('[data-blurb]').classList.contains('is-clamped')"));
  check("bookshelf button saves the story", g.label === "Đã lưu truyện" && g.pressed === "true" && g.stored === `["${S}"]`, JSON.stringify(g));
  await go(`${B}/tu-truyen/`, 3000);
  g = await evaluate("({ cards: document.querySelectorAll('[data-bookshelf-grid] .story-card').length, empty: document.querySelector('[data-bookshelf-empty]').hidden })");
  check("bookshelf page shows the saved story", g.cards === 1 && g.empty, JSON.stringify(g));
  await shot("bookshelf-1280-light");

  // The header is pinned only on the reader: elsewhere it scrolls away with the page.
  await viewport(1280, 900);
  for (const path of ["/", `/truyen/${S}/`]) {
    await go(B + path);
    await scrollTo(1500);
    const bottom = await evaluate("Math.round(document.querySelector('.site-header__bar').getBoundingClientRect().bottom)");
    check(`header scrolls away (not pinned) on ${path}`, bottom <= 0, `bottom=${bottom}`);
  }

  // Phones: the main nav is the glass tab bar at the bottom of the screen; the reader page has its dock instead.
  await viewport(360, 780); await go(B + "/");
  g = await evaluate("(() => { const n = document.getElementById('main-nav'); const r = n.getBoundingClientRect(); return { position: getComputedStyle(n).position, links: n.querySelectorAll('a').length, bottomGap: Math.round(innerHeight - r.bottom), active: n.querySelector('[aria-current=page]')?.textContent.trim(), clear: document.body.scrollHeight >= document.querySelector('.site-footer').getBoundingClientRect().bottom + scrollY + r.height } })()");
  check("phone: main nav is a tab bar fixed at the bottom (3 links for visitors, no Đăng truyện), current page marked, footer not hidden", g.position === "fixed" && g.links === 3 && g.bottomGap >= 0 && g.bottomGap < 40 && g.active === "Trang chủ" && g.clear, JSON.stringify(g));
  await shot("tabbar-360-light");
  await go(`${B}/doc/${S}/1/`);
  check("phone reader: tab bar hidden (the reader dock takes its place)", (await evaluate("getComputedStyle(document.getElementById('main-nav')).display")) === "none");

  // Reference screenshots of the current Next.js site (read-only).
  if (PROD) {
    await viewport(1280, 900);
    for (const [name, path] of [["prod-home", "/"], ["prod-discover", "/tim-kiem"]]) { await go(PROD + path, 5000); await shot(`${name}-1280-light`); }
  }

  check("no JavaScript errors in the console", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} browser checks passed`);
} catch (e) {
  console.error("FAILED:", e.message);
} finally {
  ws?.close(); chrome.kill();
}
