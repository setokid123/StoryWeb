"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSyncExternalStore } from "react";

export const STORAGE_KEY = "storyweb:bookshelf";

export function subscribeBookshelf(callback: () => void) {
  window.addEventListener("storyweb:bookshelf-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("storyweb:bookshelf-change", callback);
    window.removeEventListener("storage", callback);
  };
}

function readBookshelf(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function BookshelfButton({ slug }: { slug: string }) {
  const saved = useSyncExternalStore(subscribeBookshelf, () => readBookshelf().includes(slug), () => false);

  function toggle() {
    const current = readBookshelf();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("storyweb:bookshelf-change"));
  }

  return <button type="button" className="button button--outline" onClick={toggle}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{saved ? "Đã lưu truyện" : "Thêm vào tủ truyện"}</button>;
}
