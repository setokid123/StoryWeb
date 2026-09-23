import { ChevronLeft, ChevronRight, List, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
          <Link href={prevUrl} prefetch={false} className="button button--outline reader-nav__prev" aria-label="Chương trước">
            <ChevronLeft size={20} /> <span className="reader-nav__label">Chương trước</span><span className="reader-nav__label-short">Trước</span>
          </Link>
        ) : (
          <button type="button" className="button button--outline reader-nav__prev" aria-label="Chương trước" disabled>
            <ChevronLeft size={20} /> <span className="reader-nav__label">Chương trước</span><span className="reader-nav__label-short">Trước</span>
          </button>
        )}

        <button type="button" className="button button--outline reader-nav__list" onClick={onOpenChapterList} aria-haspopup="dialog" aria-label="Danh sách chương">
          <List size={20} /> <span className="reader-nav__label">Danh sách chương</span><span className="reader-nav__label-short">Danh sách</span>
        </button>

        {nextUrl ? (
          <Link href={nextUrl} prefetch={false} className="button button--primary reader-nav__next" aria-label="Chương sau">
            <span className="reader-nav__label">Chương sau</span><span className="reader-nav__label-short">Sau</span> <ChevronRight size={20} />
          </Link>
        ) : (
          <button type="button" className="button button--primary reader-nav__next" aria-label="Chương sau" disabled>
            <span className="reader-nav__label">Chương sau</span><span className="reader-nav__label-short">Sau</span> <ChevronRight size={20} />
          </button>
        )}
      </div>
    </nav>
  );
}
