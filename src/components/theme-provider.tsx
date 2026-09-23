"use client";

import { useSyncExternalStore, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("storyweb:theme-change", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("storyweb:theme-change", callback);
    media.removeEventListener("change", callback);
  };
}

let cachedSnapshot = { theme: "system" as Theme, resolved: "light" as ResolvedTheme };

function getThemeSnapshot(): { theme: Theme; resolved: ResolvedTheme } {
  let theme = (localStorage.getItem("storyweb-theme") as Theme | null) || "system";
  if (theme !== "dark" && theme !== "light" && theme !== "system") {
    const legacy = localStorage.getItem("storyweb:night");
    if (legacy === "true") theme = "dark";
    else if (legacy === "false") theme = "light";
    else theme = "system";
  }
  let resolved: ResolvedTheme = "light";
  if (theme === "dark") {
    resolved = "dark";
  } else if (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    resolved = "dark";
  }
  
  if (cachedSnapshot.theme !== theme || cachedSnapshot.resolved !== resolved) {
    cachedSnapshot = { theme, resolved };
  }
  return cachedSnapshot;
}

const serverSnapshot = { theme: "system" as Theme, resolved: "light" as ResolvedTheme };
function getServerSnapshot() {
  return serverSnapshot;
}

export function useTheme() {
  const { theme, resolved } = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot);

  const setTheme = (next: Theme) => {
    if (next === "system") {
      localStorage.removeItem("storyweb-theme");
    } else {
      localStorage.setItem("storyweb-theme", next);
    }
    window.dispatchEvent(new Event("storyweb:theme-change"));
  };

  return { theme, resolved, setTheme };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();

  if (typeof window !== "undefined") {
    if (resolved === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              let theme = localStorage.getItem('storyweb-theme');
              if (!theme) {
                const legacy = localStorage.getItem('storyweb:night');
                if (legacy === 'true') theme = 'dark';
                else if (legacy === 'false') theme = 'light';
                else theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            } catch (e) {}
          `,
        }}
      />
      {children}
    </>
  );
}
