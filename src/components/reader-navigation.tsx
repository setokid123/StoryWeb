import { ChevronLeft, ChevronRight, List, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

export type ReaderNavigationProps = {
  storyUrl: string;
  prevUrl?: string; // If undefined, disable prev button
  nextUrl?: string; // If undefined, disable next button
  onOpenChapterList: () => void;
};

export function ReaderNavigation({ storyUrl, prevUrl, nextUrl, onOpenChapterList }: ReaderNavigationProps) {
  return (
    <nav className="reader-nav" aria-label="Điều hướng chương">
      <Link href={storyUrl} className="button button--ghost reader-nav__back">
        <ArrowLeft size={20} /> Về truyện
      </Link>
      
      <div className="reader-nav__main">
        {prevUrl ? (
          <Link href={prevUrl} className="button button--outline reader-nav__prev">
            <ChevronLeft size={20} /> Chương trước
          </Link>
        ) : (
          <button type="button" className="button button--outline reader-nav__prev" disabled>
            <ChevronLeft size={20} /> Chương trước
          </button>
        )}

        <button type="button" className="button button--outline reader-nav__list" onClick={onOpenChapterList} aria-haspopup="dialog">
          <List size={20} /> Danh sách chương
        </button>

        {nextUrl ? (
          <Link href={nextUrl} className="button button--primary reader-nav__next">
            Chương sau <ChevronRight size={20} />
          </Link>
        ) : (
          <button type="button" className="button button--primary reader-nav__next" disabled>
            Chương sau <ChevronRight size={20} />
          </button>
        )}
      </div>
    </nav>
  );
}
