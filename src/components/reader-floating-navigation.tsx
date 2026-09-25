import { ChevronLeft, ChevronRight, List, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type RefObject } from "react";

export type ReaderFloatingNavigationProps = {
  visible: boolean;
  storyUrl: string;
  prevUrl?: string;
  nextUrl?: string;
  onOpenChapterList: () => void;
  listButtonRef?: RefObject<HTMLButtonElement | null>;
};

export function ReaderFloatingNavigation({
  visible,
  storyUrl,
  prevUrl,
  nextUrl,
  onOpenChapterList,
  listButtonRef
}: ReaderFloatingNavigationProps) {
  return (
    <nav
      className={`reader-floating-nav ${visible ? "is-visible" : ""}`}
      aria-label="Điều hướng nhanh"
      aria-hidden={!visible}
    >
      <div className="reader-floating-nav__inner">
        <Link
          href={storyUrl}
          className="reader-floating-nav__btn"
          aria-label="Về truyện"
          tabIndex={visible ? 0 : -1}
        >
          <ArrowLeft size={18} /> <span className="reader-floating-nav__label">Về truyện</span>
        </Link>

        {prevUrl ? (
          <Link
            href={prevUrl}
            prefetch={false}
            className="reader-floating-nav__btn"
            aria-label="Chương trước"
            tabIndex={visible ? 0 : -1}
          >
            <ChevronLeft size={18} /> <span className="reader-floating-nav__label">Chương trước</span>
          </Link>
        ) : (
          <button
            type="button"
            className="reader-floating-nav__btn"
            aria-label="Chương trước"
            disabled
            tabIndex={-1}
          >
            <ChevronLeft size={18} /> <span className="reader-floating-nav__label">Chương trước</span>
          </button>
        )}

        <button
          ref={listButtonRef}
          type="button"
          className="reader-floating-nav__btn"
          onClick={onOpenChapterList}
          aria-haspopup="dialog"
          aria-label="Danh sách chương"
          tabIndex={visible ? 0 : -1}
        >
          <List size={18} /> <span className="reader-floating-nav__label">Danh sách chương</span>
        </button>

        {nextUrl ? (
          <Link
            href={nextUrl}
            prefetch={false}
            className="reader-floating-nav__btn"
            aria-label="Chương sau"
            tabIndex={visible ? 0 : -1}
          >
            <span className="reader-floating-nav__label">Chương sau</span> <ChevronRight size={18} />
          </Link>
        ) : (
          <button
            type="button"
            className="reader-floating-nav__btn"
            aria-label="Chương sau"
            disabled
            tabIndex={-1}
          >
            <span className="reader-floating-nav__label">Chương sau</span> <ChevronRight size={18} />
          </button>
        )}
      </div>
    </nav>
  );
}
