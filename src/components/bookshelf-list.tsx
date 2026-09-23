"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { STORAGE_KEY, subscribeBookshelf } from "@/components/bookshelf-button";
import { StoryCard } from "@/components/story-card";
import type { Story } from "@/data/stories";

export function BookshelfList({ stories }: { stories: Story[] }) {
  const raw = useSyncExternalStore(subscribeBookshelf, () => localStorage.getItem(STORAGE_KEY) ?? "[]", () => "[]");
  let slugs: string[] = [];
  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) slugs = parsed.filter((item): item is string => typeof item === "string"); } catch { /* malformed local data is ignored */ }
  const saved = stories.filter((story) => slugs.includes(story.slug));

  if (saved.length === 0) return <div className="empty-state"><BookOpen size={40} strokeWidth={1.2} /><h2>Tủ truyện đang chờ câu chuyện đầu tiên</h2><p>Nhấn “Thêm vào tủ truyện” trên trang truyện để lưu lại những tác phẩm bạn yêu thích.</p><Link className="button button--primary" href="/tim-kiem">Khám phá truyện <ArrowRight size={18} /></Link></div>;
  return <div className="story-grid">{saved.map((story) => <StoryCard key={story.slug} story={story} />)}</div>;
}
