import type { CSSProperties } from "react";
import type { Story } from "@/data/stories";

type CoverProps = {
  story: Story;
  className?: string;
};

export function Cover({ story, className = "" }: CoverProps) {
  const style = {
    "--cover-start": story.palette[0],
    "--cover-end": story.palette[1],
  } as CSSProperties;

  return (
    <div className={`book-cover ${className}`} style={style} aria-label={`Bìa truyện ${story.title}`} role="img">
      <span className="book-cover__ornament book-cover__ornament--top">✦</span>
      <span className="book-cover__symbol">{story.symbol}</span>
      <span className="book-cover__title">{story.title}</span>
      <span className="book-cover__author">{story.author}</span>
      <span className="book-cover__ornament book-cover__ornament--bottom">✦</span>
    </div>
  );
}
