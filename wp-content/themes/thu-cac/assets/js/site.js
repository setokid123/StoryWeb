// Every page: theme toggle, mobile menu, bookshelf button and bookshelf page.
import { applyTheme, getTheme, onThemeChange, setTheme } from "./theme.js";

// ---------- theme ----------
applyTheme();
onThemeChange(applyTheme);
document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-theme-toggle]");
  if (!toggle) return;
  setTheme(getTheme().resolved === "dark" ? "light" : "dark");
});

// ---------- mobile menu ----------
const menuButton = document.querySelector("[data-menu-toggle]");
const nav = document.getElementById("main-nav");
if (menuButton && nav) {
  const setMenu = (open) => {
    nav.classList.toggle("main-nav--open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
    menuButton.classList.toggle("is-open", open);
  };
  menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => { if (event.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") { setMenu(false); menuButton.focus(); }
  });
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
