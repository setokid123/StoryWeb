// Site theme (port of components/theme-provider.tsx). Same storage as the Next.js app:
// "storyweb-theme" = light | dark (absent = system); legacy "storyweb:night" = true | false.

const KEY = "storyweb-theme";
const EVENT = "storyweb:theme-change";

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** { theme: light|dark|system, resolved: light|dark } */
export function getTheme() {
  const stored = read(KEY);
  let theme = "system";
  if (stored === "dark" || stored === "light") theme = stored;
  else if (stored !== "system") {
    const legacy = read("storyweb:night");
    if (legacy === "true") theme = "dark";
    else if (legacy === "false") theme = "light";
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return { theme, resolved: theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light" };
}

export function setTheme(next) {
  try {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch { /* storage blocked: applies to this page only */ }
  window.dispatchEvent(new Event(EVENT));
}

export function onThemeChange(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", callback);
}

/** Applies the theme to <html> and updates every [data-theme-toggle] label. */
export function applyTheme() {
  const { resolved } = getTheme();
  if (resolved === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  const meta = document.querySelector("meta[data-theme-color]");
  if (meta) {
    const halloween = document.documentElement.getAttribute("data-season") === "halloween";
    if (resolved === "dark") meta.content = halloween ? "#120a16" : "#0d0b22";
    else meta.content = halloween ? "#fff0e2" : "#f1ecff";
  }
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.setAttribute("aria-label", resolved === "dark" ? "Chế độ sáng" : "Chế độ tối");
  }
}
