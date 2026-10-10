// Reader page behaviour (port of components/reader-panel.tsx and its hooks). The server already decided access:
// a locked page contains no chapter body, so nothing here can reveal one.
import {
  applyReaderPreferenceUpdate,
  DEFAULT_SCROLL_CONFIG,
  initialScrollState,
  LEGACY_FONT_SIZE_KEY,
  nextScrollState,
  parseReaderPreferences,
  READER_PREFS_EVENT,
  READER_PREFS_KEY,
  readerBodyStyle,
  resolveReaderChrome,
  serializeReaderPreferences,
} from "thu-cac-reader-core";
import { getTheme, onThemeChange, setTheme } from "thu-cac-theme";

const data = JSON.parse(document.getElementById("thu-cac-reader-data")?.textContent || "{}");
const toolbar = document.querySelector("[data-reader-toolbar]");
const prefsRoot = document.getElementById("reader-preferences");
const prefsToggle = document.querySelector("[data-prefs-toggle]");
const prefsAnchor = document.querySelector("[data-prefs-anchor]");
const text = document.querySelector("[data-reader-text]");
const gate = document.querySelector("[data-unlock-gate]");
const endNav = document.querySelector("[data-reader-endnav]");
const dockWrap = document.querySelector("[data-reader-dock]");
const dock = dockWrap?.querySelector(".reader-floating-nav");
const dialog = document.querySelector("[data-chapter-dialog]");
const locked = Boolean(data.locked);

const state = {
  prefsOpen: false,
  chapterListOpen: false,
  toolbarFocused: false,
  dockFocused: false,
  toolbarPinned: false,
  dockPinned: false,
  endNavInView: false,
  mode: "pinned", // toolbarMode preference: "pinned" | "auto"
  scroll: { atTop: true, moved: false, toolbarHidden: false },
};

// ---------- storage-safe helpers ----------
function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";

/** Focuses `el` once the browser accepts it (not inert / visibility:hidden), retrying a few frames, then `done`. */
function focusWhenReady(el, done, frames = 20) {
  const attempt = (left) => requestAnimationFrame(() => {
    el?.focus({ preventScroll: true });
    if (!el || document.activeElement === el || left <= 0) { done?.(); return; }
    attempt(left - 1);
  });
  attempt(frames);
}

/** Tab stays inside `root`; returns the keydown handler. */
function trapTab(root, event) {
  if (event.key !== "Tab" || !root) return;
  const els = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0 || el === document.activeElement);
  if (els.length === 0) { event.preventDefault(); return; }
  const first = els[0];
  const last = els[els.length - 1];
  // Focus elsewhere, or on the dialog itself → into the list, at the end the reader is heading to.
  if (!els.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

// ---------- reading preferences ----------
function currentPrefs() {
  const raw = readStorage(READER_PREFS_KEY);
  return parseReaderPreferences(raw, raw === null ? readStorage(LEGACY_FONT_SIZE_KEY) : null);
}

function persistPrefs(prefs) {
  try {
    localStorage.setItem(READER_PREFS_KEY, serializeReaderPreferences(prefs));
    localStorage.removeItem(LEGACY_FONT_SIZE_KEY);
  } catch { /* storage blocked: applies to this page only */ }
  window.dispatchEvent(new Event(READER_PREFS_EVENT));
}

function renderPrefs() {
  const prefs = currentPrefs();
  // "Ghim" / "Không ghim": CSS reads html[data-reader-chrome] (also set before paint in functions.php).
  state.mode = prefs.toolbarMode;
  if (prefs.toolbarMode === "auto") document.documentElement.dataset.readerChrome = "auto";
  else delete document.documentElement.dataset.readerChrome;
  update();
  if (text) {
    const style = readerBodyStyle(prefs);
    text.style.fontSize = style.body.fontSize;
    for (const [name, value] of Object.entries(style.dataAttributes)) text.setAttribute(name, value);
  }
  if (!prefsRoot) return;
  const { theme } = getTheme();
  for (const button of prefsRoot.querySelectorAll("[data-pref]")) {
    const key = button.dataset.pref;
    const active = key === "theme" ? theme === button.dataset.value : prefs[key] === button.dataset.value;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const size = prefsRoot.querySelector("[data-font-size-value]");
  if (size) size.textContent = String(prefs.fontSize);
  const down = prefsRoot.querySelector('[data-font-step="-1"]');
  const up = prefsRoot.querySelector('[data-font-step="1"]');
  if (down) down.disabled = prefs.fontSize <= 16;
  if (up) up.disabled = prefs.fontSize >= 26;
}

// One-time upgrade: copy the old "storyweb:font-size" into the versioned key.
if (readStorage(READER_PREFS_KEY) === null && readStorage(LEGACY_FONT_SIZE_KEY) !== null) persistPrefs(currentPrefs());
renderPrefs();
window.addEventListener(READER_PREFS_EVENT, renderPrefs);
window.addEventListener("storage", (event) => {
  if (event.key === null || event.key === READER_PREFS_KEY || event.key === LEGACY_FONT_SIZE_KEY) renderPrefs();
});
onThemeChange(renderPrefs);

prefsRoot?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-pref]");
  if (option) {
    if (option.dataset.pref === "theme") setTheme(option.dataset.value);
    else persistPrefs(applyReaderPreferenceUpdate(currentPrefs(), { [option.dataset.pref]: option.dataset.value }));
    return;
  }
  const step = event.target.closest("[data-font-step]");
  if (step) {
    const prefs = currentPrefs();
    persistPrefs(applyReaderPreferenceUpdate(prefs, { fontSize: prefs.fontSize + Number(step.dataset.fontStep) }));
    return;
  }
  if (event.target.closest("[data-prefs-reset]")) {
    try { localStorage.removeItem(READER_PREFS_KEY); localStorage.removeItem(LEGACY_FONT_SIZE_KEY); } catch { /* ignore */ }
    window.dispatchEvent(new Event(READER_PREFS_EVENT));
    setTheme("system");
    return;
  }
  // Backdrop (mobile sheet) or close button.
  if (event.target.closest("[data-prefs-close]") && (event.target.closest("button[data-prefs-close]") || event.target.matches(".reader-prefs-backdrop"))) closePrefs();
});

function openPrefs() {
  if (!prefsRoot) return;
  closeChapterList(false);
  state.prefsOpen = true;
  prefsRoot.hidden = false;
  prefsToggle?.setAttribute("aria-expanded", "true");
  update();
  prefsRoot.querySelector(".reader-prefs")?.querySelector(FOCUSABLE)?.focus();
}

function closePrefs(restoreFocus = true) {
  if (!state.prefsOpen) return;
  state.prefsOpen = false;
  prefsRoot.hidden = true;
  prefsToggle?.setAttribute("aria-expanded", "false");
  if (restoreFocus && prefsToggle) {
    // In "Không ghim" mode the toolbar may be scrolled away once preferences close; keep it until the toggle has focus.
    state.toolbarPinned = true;
    focusWhenReady(prefsToggle, () => { state.toolbarPinned = false; update(); });
  }
  update();
}

prefsToggle?.addEventListener("click", () => (state.prefsOpen ? closePrefs() : openPrefs()));
document.addEventListener("pointerdown", (event) => {
  if (state.prefsOpen && prefsAnchor && !prefsAnchor.contains(event.target)) closePrefs(false);
});

// ---------- chapter list dialog ----------
let listTrigger = null;
let listLoaded = false;

async function loadChapterList() {
  if (listLoaded || !dialog || !data.storyId) return;
  const list = dialog.querySelector("[data-chapter-list]");
  const status = dialog.querySelector("[data-chapter-list-status]");
  const lockIcon = document.getElementById("chapter-lock-icon");
  try {
    const url = new URL(data.chaptersApi, window.location.href);
    url.searchParams.set("story", String(data.storyId));
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(String(response.status));
    const { chapters } = await response.json();
    const items = chapters.map((chapter) => {
      const li = document.createElement("li");
      li.className = "chapter-list__item";
      const a = document.createElement("a");
      a.href = chapter.url;
      a.className = "chapter-list__link" + (chapter.number === data.chapter ? " is-current" : "") + (chapter.locked ? " is-locked" : "");
      if (chapter.number === data.chapter) a.setAttribute("aria-current", "page");
      const number = document.createElement("span");
      number.className = "chapter-list__number";
      number.textContent = `Chương ${chapter.number}`;
      const title = document.createElement("span");
      title.className = "chapter-list__title";
      title.textContent = chapter.title;
      a.append(number, title);
      if (chapter.locked && lockIcon) a.append(lockIcon.content.cloneNode(true));
      li.append(a);
      return li;
    });
    list.replaceChildren(...items);
    status.hidden = true;
    listLoaded = true;
  } catch {
    status.textContent = "Không tải được danh sách chương. Vui lòng thử lại.";
  }
}

async function openChapterList(trigger) {
  if (!dialog) return;
  listTrigger = trigger;
  if (state.prefsOpen) closePrefs(false);
  state.chapterListOpen = true;
  dialog.hidden = false;
  document.body.style.overflow = "hidden";
  update();
  await loadChapterList();
  if (!state.chapterListOpen) return;
  (dialog.querySelector('[aria-current="page"]') ?? dialog.querySelector(FOCUSABLE))?.focus();
  dialog.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "center" });
}

function closeChapterList(restoreFocus = true) {
  if (!state.chapterListOpen || !dialog) return;
  state.chapterListOpen = false;
  dialog.hidden = true;
  document.body.style.overflow = "";
  update();
  if (!restoreFocus || !listTrigger) return;
  // Return focus to the exact button that opened the list. The dock is pinned until focus lands, otherwise it
  // could still be inert / visibility:hidden (first frame of its transition) and focus would be lost.
  if (listTrigger.dataset.chapterListOpen === "dock") {
    state.dockPinned = true;
    update();
    focusWhenReady(listTrigger, () => { state.dockPinned = false; update(); });
  } else {
    focusWhenReady(listTrigger);
  }
}

document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-chapter-list-open]");
  if (opener) { openChapterList(opener); return; }
  if (event.target.closest("[data-chapter-list-close]") || event.target === dialog) closeChapterList();
});

// ---------- keyboard: Escape and focus traps (preferences, chapter list, locked-chapter gate) ----------
let gateFocused = false;
document.addEventListener("keydown", (event) => {
  if (state.chapterListOpen) {
    if (event.key === "Escape") { event.preventDefault(); closeChapterList(); return; }
    trapTab(dialog.querySelector(".drawer-panel"), event);
    return;
  }
  if (state.prefsOpen) {
    if (event.key === "Escape") { event.preventDefault(); closePrefs(); return; }
    trapTab(prefsRoot.querySelector(".reader-prefs"), event);
    return;
  }
  if (locked && gate) {
    if (event.key === "Escape") { window.location.href = data.storyUrl; return; }
    trapTab(gate, event);
  }
});

if (locked && gate && !gateFocused) {
  // The dialog itself, so no link of the invitation starts out highlighted; Tab then walks its links.
  (gate.querySelector("[role=dialog]") ?? gate.querySelector(FOCUSABLE))?.focus({ preventScroll: true });
  gateFocused = true;
}

// Link mode opens the destination in another tab; reload with the new grant when the reader comes back.
if (locked && data.mode === "link") {
  window.addEventListener("focus", () => window.location.reload());
}

// ---------- grant expiry: remove the body at expiry even if the network is slow, then ask the server again ----------
if (!locked && data.grantExpiresAt) {
  const remaining = Math.max(0, Math.min(data.grantExpiresAt - Date.now(), 300_000));
  const deadline = performance.now() + remaining;
  let expired = false;
  const expireIfNeeded = () => {
    if (expired || (performance.now() < deadline && Date.now() < data.grantExpiresAt)) return;
    expired = true;
    text?.replaceChildren();
    text?.remove();
    document.querySelector("[data-grant-note]")?.remove();
    window.location.reload();
  };
  setTimeout(expireIfNeeded, remaining);
  window.addEventListener("focus", expireIfNeeded);
  document.addEventListener("visibilitychange", expireIfNeeded);
}

// ---------- reading progress ----------
if (!locked && data.storySlug) {
  try { localStorage.setItem(`storyweb:progress:${data.storySlug}`, String(data.chapter)); } catch { /* ignore */ }
}

// ---------- toolbar / dock visibility ----------
function trackFocus(el, key) {
  if (!el) return;
  el.addEventListener("focusin", (event) => {
    let keyboard = true;
    try { keyboard = event.target.matches(":focus-visible"); } catch { /* old browsers: assume keyboard */ }
    state[key] = keyboard;
    update();
  });
  el.addEventListener("focusout", (event) => {
    if (!el.contains(event.relatedTarget)) { state[key] = false; update(); }
  });
}
trackFocus(toolbar, "toolbarFocused");
trackFocus(dockWrap, "dockFocused");

function update() {
  const chrome = resolveReaderChrome({
    scroll: state.scroll,
    endNavInView: state.endNavInView,
    locked,
    chapterListOpen: state.chapterListOpen,
    preferencesOpen: state.prefsOpen,
    mode: state.mode,
    toolbarFocused: state.toolbarFocused,
    dockFocused: state.dockFocused,
    toolbarPinned: state.toolbarPinned,
    dockPinned: state.dockPinned,
  });
  if (toolbar) {
    const hidden = chrome.toolbar === "hidden";
    toolbar.dataset.scrollState = chrome.toolbar;
    toolbar.classList.toggle("is-hidden", hidden);
    toolbar.inert = hidden;
  }
  if (dockWrap && dock) {
    dockWrap.inert = !chrome.dockVisible;
    dock.classList.toggle("is-visible", chrome.dockVisible);
    dock.setAttribute("aria-hidden", String(!chrome.dockVisible));
    for (const el of dock.querySelectorAll("a, button:not([disabled])")) el.tabIndex = chrome.dockVisible ? 0 : -1;
  }
}

const sample = () => ({ y: window.scrollY });
let scrollState = initialScrollState(sample(), DEFAULT_SCROLL_CONFIG);
let frame = 0;
const publish = () => {
  const next = { atTop: scrollState.atTop, moved: scrollState.moved, toolbarHidden: scrollState.toolbarHidden };
  if (Object.keys(next).some((key) => next[key] !== state.scroll[key])) {
    state.scroll = next;
    update();
  }
};
const onScroll = () => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    scrollState = nextScrollState(scrollState, sample(), DEFAULT_SCROLL_CONFIG);
    publish();
  });
};
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
if (endNav && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => { state.endNavInView = Boolean(entry?.isIntersecting); update(); }, { threshold: 0 }).observe(endNav);
}
publish();
update();
