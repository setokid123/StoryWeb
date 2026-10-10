// Every page: theme toggle, bookshelf button and page, "Đọc tiếp" on story pages, the departure board clock.
// (Phones need no menu script: the main nav is the bottom tab bar.)
import { applyTheme, getTheme, onThemeChange, setTheme } from "thu-cac-theme";

// ---------- theme ----------
applyTheme();
onThemeChange(applyTheme);
document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-theme-toggle]");
  if (!toggle) return;
  setTheme(getTheme().resolved === "dark" ? "light" : "dark");
});

// ---------- departure board clock ----------
const clock = document.querySelector("[data-board-clock]");
if (clock) {
  const tick = () => { clock.textContent = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }); };
  tick();
  setInterval(tick, 20_000);
}

// ---------- long story description: clamp with "Xem thêm" / "Thu gọn" ----------
const blurb = document.querySelector("[data-blurb]");
const blurbToggle = document.querySelector("[data-blurb-toggle]");
if (blurb && blurbToggle) {
  blurb.classList.add("is-clamped");
  if (blurb.scrollHeight > blurb.clientHeight + 4) {
    blurbToggle.hidden = false;
    blurbToggle.addEventListener("click", () => {
      const open = blurbToggle.getAttribute("aria-expanded") !== "true";
      blurb.classList.toggle("is-clamped", !open);
      blurbToggle.setAttribute("aria-expanded", String(open));
      blurbToggle.querySelector("[data-blurb-label]").textContent = open ? "Thu gọn" : "Xem thêm";
    });
  } else {
    blurb.classList.remove("is-clamped"); // short enough: no button, nothing hidden
  }
}

// ---------- links by story code: this browser's progress and bookshelf entries move from a story's old slugs ----------
for (const el of document.querySelectorAll("[data-old-slugs]")) {
  const slug = el.dataset.slug;
  const olds = (el.dataset.oldSlugs ?? "").split(",").filter((old) => old && old !== slug);
  if (!slug || olds.length === 0) continue;
  try {
    for (const old of olds) {
      const progress = localStorage.getItem(`storyweb:progress:${old}`);
      if (progress !== null && localStorage.getItem(`storyweb:progress:${slug}`) === null) localStorage.setItem(`storyweb:progress:${slug}`, progress);
      localStorage.removeItem(`storyweb:progress:${old}`);
    }
    const shelf = JSON.parse(localStorage.getItem("storyweb:bookshelf") ?? "[]");
    if (Array.isArray(shelf) && shelf.some((item) => olds.includes(item))) {
      localStorage.setItem("storyweb:bookshelf", JSON.stringify([...new Set(shelf.map((item) => (olds.includes(item) ? slug : item)))]));
    }
  } catch { /* storage blocked */ }
}

// ---------- "Đọc tiếp": last chapter read on this device (stored by reader.js) ----------
for (const link of document.querySelectorAll("[data-continue]")) {
  let number = 0;
  try { number = Number.parseInt(localStorage.getItem(`storyweb:progress:${link.dataset.slug}`) ?? "", 10); } catch { /* storage blocked */ }
  const max = Number(link.dataset.max) || Infinity;
  if (Number.isInteger(number) && number >= 1 && number <= max) {
    link.href = link.dataset.continue.replace("%d", String(number));
    link.querySelector("[data-continue-number]").textContent = String(number);
    link.hidden = false;
  }
}

// ---------- bookshelf (localStorage "storyweb:bookshelf", same as the Next.js app) ----------
const SHELF_KEY = "storyweb:bookshelf";
const SHELF_EVENT = "storyweb:bookshelf-change";

function readShelf() {
  try {
    const value = JSON.parse(localStorage.getItem(SHELF_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string" && /^[a-z0-9-]{1,180}$/.test(item)) : [];
  } catch {
    return [];
  }
}

function writeShelf(slugs) {
  try { localStorage.setItem(SHELF_KEY, JSON.stringify(slugs)); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(SHELF_EVENT));
}

function renderShelfButtons() {
  const saved = readShelf();
  for (const button of document.querySelectorAll("[data-bookshelf-toggle]")) {
    const isSaved = saved.includes(button.dataset.slug);
    button.setAttribute("aria-pressed", String(isSaved));
    button.classList.toggle("is-saved", isSaved);
    const label = button.querySelector("[data-bookshelf-label]");
    if (label) label.textContent = isSaved ? "Đã lưu truyện" : "Thêm vào tủ truyện";
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-bookshelf-toggle]");
  if (!button) return;
  const slug = button.dataset.slug;
  const current = readShelf();
  writeShelf(current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
});

const shelf = document.querySelector("[data-bookshelf]");
async function renderShelfPage() {
  if (!shelf) return;
  const grid = shelf.querySelector("[data-bookshelf-grid]");
  const empty = shelf.querySelector("[data-bookshelf-empty]");
  const slugs = readShelf().slice(0, 50);
  if (slugs.length === 0) { grid.hidden = true; empty.hidden = false; grid.replaceChildren(); return; }
  try {
    const url = new URL(shelf.dataset.cardsApi, window.location.href);
    url.searchParams.set("slugs", slugs.join(","));
    const response = await fetch(url, { credentials: "same-origin" });
    const data = response.ok ? await response.json() : { html: "", count: 0 };
    // Stories saved under a slug they no longer have: keep them under the current one (renders again once).
    const renamed = data.renamed && typeof data.renamed === "object" ? data.renamed : {};
    if (Object.keys(renamed).length > 0) {
      writeShelf([...new Set(readShelf().map((item) => renamed[item] ?? item))]);
      return;
    }
    // Server-rendered card markup from our own endpoint (escaped by the theme template).
    grid.innerHTML = data.html;
    grid.hidden = data.count === 0;
    empty.hidden = data.count > 0;
  } catch {
    grid.hidden = true;
    empty.hidden = false;
  }
}

renderShelfButtons();
renderShelfPage();
window.addEventListener(SHELF_EVENT, () => { renderShelfButtons(); renderShelfPage(); });
window.addEventListener("storage", (event) => { if (event.key === null || event.key === SHELF_KEY) { renderShelfButtons(); renderShelfPage(); } });

// ---------- "Xem nhiều": period tabs (every period is in the page; this only shows one) ----------
for (const board of document.querySelectorAll("[data-ranking]")) {
  const tabs = [...board.querySelectorAll("[data-ranking-tab]")];
  const show = (key) => {
    for (const tab of tabs) {
      const on = tab.dataset.rankingTab === key;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
    }
    for (const panel of board.querySelectorAll("[data-ranking-panel]")) panel.hidden = panel.dataset.rankingPanel !== key;
  };
  for (const tab of tabs) tab.addEventListener("click", () => show(tab.dataset.rankingTab));
}
