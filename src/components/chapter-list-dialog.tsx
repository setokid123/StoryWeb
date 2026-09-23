"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, LockKeyhole } from "lucide-react";

export type ChapterItem = {
  chapterNumber: number;
  title: string;
  url: string;
  isLocked: boolean;
  isCurrent: boolean;
};

export type ChapterListDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  chapters: ChapterItem[];
};

export function ChapterListDialog({ isOpen, onClose, storyTitle, chapters }: ChapterListDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    // Focus trap setup
    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button, textarea, input, select');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Auto-focus current chapter or first element
    const currentChapterLink = dialogRef.current.querySelector<HTMLElement>('[aria-current="page"]');
    if (currentChapterLink) {
      currentChapterLink.focus();
    } else if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Prevent background scrolling
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-list-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-panel__header">
          <div>
            <div className="eyebrow">{storyTitle}</div>
            <h2 id="chapter-list-title">Danh sách chương</h2>
          </div>
          <button
            type="button"
            className="icon-button drawer-panel__close"
            onClick={onClose}
            aria-label="Đóng danh sách chương"
          >
            <X size={24} />
          </button>
        </header>

        <div className="drawer-panel__content">
          <ul className="chapter-list">
            {chapters.map((chap) => (
              <li key={chap.chapterNumber} className="chapter-list__item">
                <Link
                  href={chap.url}
                  prefetch={false}
                  className={`chapter-list__link ${chap.isCurrent ? 'is-current' : ''} ${chap.isLocked ? 'is-locked' : ''}`}
                  aria-current={chap.isCurrent ? 'page' : undefined}
                >
                  <span className="chapter-list__number">Chương {chap.chapterNumber}</span>
                  <span className="chapter-list__title">{chap.title}</span>
                  {chap.isLocked && <LockKeyhole size={16} className="chapter-list__lock-icon" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
