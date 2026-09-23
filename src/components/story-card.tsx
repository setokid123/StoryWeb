import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { Story } from "@/data/stories";
import { Cover } from "@/components/cover";

export function StoryCard({ story }: { story: Story }) {
  return (
    <Link className="story-card" href={`/truyen/${story.slug}`}>
      <Cover story={story} className="story-card__cover" />
      <div className="story-card__body">
        <div className="story-card__topline"><span>{story.genre}</span><ArrowUpRight size={17} strokeWidth={1.7} /></div>
        <h3>{story.title}</h3>
        <p>{story.author}</p>
        <div className="story-card__meta"><span><Star size={14} fill="currentColor" /> {story.rating}</span><span>{story.chapters} chương</span></div>
      </div>
    </Link>
  );
}
