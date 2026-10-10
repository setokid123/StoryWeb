// wp-admin flow on the local Playground (auto-login): add a chapter through the classic chapter editor, then
// check it on the public site. Local only.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const B = "http://127.0.0.1:9400";
const OUT = process.env.OUT;
mkdirSync(OUT, { recursive: true });
const SLUG = "duoi-tan-trang-cu"; // seeded with 6 chapters, 1 free
const port = 9336;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", `--user-data-dir=${OUT}/profile-admin`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0, SID; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => { const m = { id: ++id, method, params, sessionId: SID }; pending.set(m.id, { resolve, reject }); ws.send(JSON.stringify(m)); });
const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails)); return r.result.value; };
const go = async (url, wait = 4000) => { await send("Page.navigate", { url }); await sleep(wait); };
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64")); };
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "  PASS" : "! FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const phpErrors = () => evaluate("(document.body.innerText.match(/(Fatal error|Warning|Notice|Deprecated|Parse error):/g) || []).length");

try {
  let info; for (let i = 0; i < 40; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId: SID } = await send("Target.attachToTarget", { targetId, flatten: true }));
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

  // Log in to the throwaway local site with its test admin account (credentials from env, not printed).
  await go(B + "/wp-login.php", 4000);
  await evaluate(`(() => { document.querySelector('#user_login').value = ${JSON.stringify(process.env.WP_TEST_USER)}; document.querySelector('#user_pass').value = ${JSON.stringify(process.env.WP_TEST_PASS)}; document.querySelector('#loginform').submit(); })()`);
  // A cold Playground can take well over 6 s to redirect after login: wait for the admin bar (max 30 s).
  let loggedIn = false;
  for (let i = 0; i < 30 && !loggedIn; i++) {
    await sleep(1000);
    loggedIn = await evaluate("!!document.querySelector('#wpadminbar') && !location.pathname.includes('wp-login')").catch(() => false);
  }
  check("logged in to wp-admin", loggedIn);
  await go(B + "/wp-admin/edit.php?post_type=story", 5000);
  const list = await evaluate(`({ title: document.title, rows: document.querySelectorAll('#the-list tr').length, addChapter: !!document.querySelector('.sw_add_chapter a'), genreCol: !!document.querySelector('th#taxonomy-the_loai') })`);
  check("Truyện list: 8 rows, 'Thêm chương' action, Thể loại column", list.rows === 8 && list.addChapter && list.genreCol, JSON.stringify(list));
  check("Truyện list: no PHP errors", (await phpErrors()) === 0);
  await shot("admin-story-list");

  // "Thêm chương" for the 6-chapter story → number prefilled as 7.
  const storyId = await evaluate(`(() => { const row = [...document.querySelectorAll('#the-list tr')].find((tr) => tr.innerText.includes('Dưới Tán Trăng Cũ')); return Number(row?.id.replace('post-', '')); })()`);
  await go(`${B}/wp-admin/post-new.php?post_type=chapter&sw_story=${storyId}`, 6000);
  const form = await evaluate(`({ story: document.querySelector('#sw-story')?.value, number: document.querySelector('#sw-number')?.value, box: !!document.querySelector('#storyweb-chapter') })`);
  check("Thêm chương: story preselected, number prefilled 7", form.box && Number(form.story) === storyId && form.number === "7", JSON.stringify(form));
  check("Thêm chương: no PHP errors", (await phpErrors()) === 0);

  await evaluate(`(() => {
    document.querySelector('#title').value = 'Chương bảy thêm từ wp-admin';
    document.querySelector('#title-prompt-text')?.classList.add('screen-reader-text');
    const body = 'Đoạn một của chương bảy.\\n\\nĐoạn hai. Mã kiểm tra: SW-ADMIN-7-BODY';
    if (window.tinymce && tinymce.get('content')) tinymce.get('content').setContent(body.split('\\n\\n').map((p) => '<p>' + p + '</p>').join(''));
    document.querySelector('#content').value = body;
  })()`);
  await shot("admin-chapter-new");
  await evaluate("document.querySelector('#publish').click()");
  await sleep(7000);
  const saved = await evaluate(`({ notice: document.querySelector('#message')?.innerText ?? '', parent: document.querySelector('#sw-story')?.value, number: document.querySelector('#sw-number')?.value, url: document.querySelector('#sample-permalink a, #view-post-btn a')?.href ?? '' })`);
  check("Publish: saved with story + number", /đã được đăng|published|xuất bản|Đã đăng/i.test(saved.notice) && Number(saved.parent) === storyId && saved.number === "7", JSON.stringify(saved));

  // Public side (anonymous fetch from Node, no admin cookie).
  const pub = await (await fetch(`${B}/doc/${SLUG}/7/`)).text();
  check("public /doc/.../7/ exists, locked for visitors (no body)", pub.includes("Chương bảy thêm từ wp-admin") && !pub.includes("SW-ADMIN-7-BODY") && pub.includes("data-unlock-gate"));
  const storyPage = await (await fetch(`${B}/truyen/${SLUG}/`)).text();
  check("story page now lists 7 chapters", storyPage.includes("7 chương · 1 chương miễn phí"));
  // Logged-in admin may preview a locked chapter (editor preview).
  await go(`${B}/doc/${SLUG}/7/`, 3000);
  check("admin (editor) can read the locked chapter body", await evaluate("document.body.innerText.includes('SW-ADMIN-7-BODY')"));

  // Reader layout under the admin bar, in both toolbar modes ("Ghim" / "Không ghim"): the header sits 8px under the
  // admin bar and the toolbar 14px under the header, at the top and after scrolling (pinned mode).
  const bars = () => evaluate("(() => { const a = document.getElementById('wpadminbar').getBoundingClientRect(); const h = document.querySelector('.site-header__bar').getBoundingClientRect(); const t = document.querySelector('[data-reader-toolbar]').getBoundingClientRect(); return { headerGap: Math.round(h.top - a.bottom), toolbarGap: Math.round(t.top - h.bottom) }; })()");
  for (const mode of ["pinned", "auto"]) {
    await go(`${B}/doc/${SLUG}/1/`, 1000);
    await evaluate(`localStorage.setItem('storyweb:reader-prefs:v1', JSON.stringify({ v: 1, toolbarMode: '${mode}' }))`);
    await go(`${B}/doc/${SLUG}/1/`, 3000);
    const top = await bars();
    let scrolled = null;
    if (mode === "pinned") {
      await evaluate("(() => { const t = document.querySelector('[data-reader-text]'); const p = t.querySelector('p'); for (let i = 0; i < 30; i++) t.appendChild(p.cloneNode(true)); window.scrollTo(0, 1200); })()");
      await sleep(500);
      scrolled = await bars();
    }
    check(`logged in, '${mode === "auto" ? "Không ghim" : "Ghim"}': header 8px under the admin bar, toolbar 14px under the header`, top.headerGap === 8 && top.toolbarGap === 14 && (!scrolled || (scrolled.headerGap === 8 && scrolled.toolbarGap === 14)), JSON.stringify({ top, scrolled }));
    if (mode === "auto") await shot("admin-reader-auto");
  }
  await evaluate("localStorage.removeItem('storyweb:reader-prefs:v1')");

  // Story edit screen (block editor) shows the StoryWeb meta box.
  await go(`${B}/wp-admin/post.php?post=${storyId}&action=edit`, 12000);
  const editor = await evaluate(`({ box: !!document.querySelector('#storyweb-story'), author: document.querySelector('#sw-author')?.value, free: document.querySelector('#sw-free')?.value })`);
  check("story editor: 'Thông tin truyện' box with author + free chapters", editor.box && editor.author === "Mộc Yên" && editor.free === "1", JSON.stringify(editor));
  check("story editor: no PHP errors", (await phpErrors()) === 0);
  await shot("admin-story-edit");

  console.log(`\n${results.filter(Boolean).length}/${results.length} admin checks passed`);
} catch (e) {
  console.error("FAILED:", e.message);
} finally {
  ws?.close(); chrome.kill();
}
