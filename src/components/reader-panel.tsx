"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock3, List, LockKeyhole, Minus, Plus, Sun, Moon, Type, X } from "lucide-react";
import type { Story } from "@/data/stories";
import type { DisplayAdConfig } from "@/lib/display-ads";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { useTheme } from "@/components/theme-provider";
import { useRewardedUnlock } from "@/components/use-rewarded-unlock";
import type { ChapterListItem, ReaderNavigationViewProps, UnlockGateViewProps, UnlockViewMode } from "@/components/view-contracts";

export type ReaderUnlockInfo = { mode: UnlockViewMode; destinationHost: string | null; accessMinutes: number };

type ReaderPanelProps = {
  story: Story;
  chapter: number;
  title: string;
  /** null = locked; the server never sends a locked body. */
  content: string | null;
  unlock: ReaderUnlockInfo;
  unlockExpiresAt: number | null;
  navigation: { prevHref: string | null; nextHref: string | null; chapters: ChapterListItem[] };
  readerEndAd: DisplayAdConfig | null;
};

function subscribePreferences(callback: () => void) {
  window.addEventListener("storyweb:preference-change", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("storyweb:preference-change", callback); window.removeEventListener("storage", callback); };
}

function getFontSize() {
  const size = Number(localStorage.getItem("storyweb:font-size"));
  return size >= 16 && size <= 26 ? size : 19;
}

// ---------- default views (replaced by U4 views; same props contract) ----------

function DefaultUnlockGateView({ chapter, mode, accessMinutes, link, rewarded, onClose, dialogRef }: UnlockGateViewProps & { dialogRef: React.RefObject<HTMLDivElement | null> }) {
  return <div className="unlock-backdrop"><div ref={dialogRef} className="locked-panel locked-panel--dialog" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
    <button type="button" className="locked-panel__close" onClick={onClose} aria-label="Đóng và quay về mục lục"><X size={20} /></button>
    <span className="locked-panel__icon"><LockKeyhole size={28} /></span>
    <div className="eyebrow">CHƯƠNG {chapter} · NỘI DUNG KHÓA</div>
    <h2 id="unlock-title">Mở trang truyện tiếp theo</h2>
    {mode === "link" && link && <>
      <p>Mở liên kết giới thiệu ({link.destinationHost}) một lần để đọc các chương khóa trong {accessMinutes} phút. StoryWeb chỉ ghi nhận bạn đã bấm liên kết trên trang này. Khi hết thời gian, bạn cần mở lại liên kết.</p>
      <button type="button" className="button button--primary" onClick={link.onOpen}>Mở liên kết giới thiệu <ArrowUpRight size={17} /></button>
      <span className="locked-panel__hint">Trang sẽ mở trong tab mới. Quay lại đây để tiếp tục đọc.</span>
    </>}
    {mode === "rewarded" && rewarded && <>
      <p>Xem hết một quảng cáo để đọc các chương khóa trong {accessMinutes} phút. Quyền đọc chỉ được mở khi nhà cung cấp xác nhận bạn đã xem xong.</p>
      <button type="button" className="button button--primary" onClick={rewarded.onWatch} disabled={rewarded.state === "pending"} aria-busy={rewarded.state === "pending"}>{rewarded.state === "pending" ? "Đang tải quảng cáo…" : rewarded.state === "failed" || rewarded.state === "unavailable" ? "Thử lại" : "Xem quảng cáo để mở khóa"}</button>
      {rewarded.state === "pending" && <button type="button" className="button button--outline" onClick={rewarded.onCancel}>Hủy</button>}
      {rewarded.message && <span className="locked-panel__hint" role="status">{rewarded.message}</span>}
    </>}
    {mode === "off" && <>
      <p>Chương này đang khóa và hiện chưa có cách mở khóa. Bạn có thể đọc các chương miễn phí.</p>
      <button type="button" className="button button--outline" onClick={onClose}>Quay lại mục lục</button>
    </>}
  </div></div>;
}

function DefaultReaderNavigationView({ storyHref, prevHref, nextHref, chapters, chapterListOpen, onOpenChapterList, onCloseChapterList, chapterListButtonRef }: ReaderNavigationViewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (chapterListOpen && !dialog.open) dialog.showModal();
    if (!chapterListOpen && dialog.open) dialog.close();
  }, [chapterListOpen]);
  return <>
    <div className="reader-pager">
      {prevHref ? <Link href={prevHref}><ChevronLeft size={18} /> Chương trước</Link> : <span aria-disabled="true" />}
      <Link href={storyHref}>Về truyện</Link>
      <button type="button" ref={chapterListButtonRef} onClick={onOpenChapterList} aria-haspopup="dialog" aria-expanded={chapterListOpen}><List size={18} /> Danh sách chương</button>
      {nextHref ? <Link href={nextHref}>Chương sau <ChevronRight size={18} /></Link> : <span aria-disabled="true" />}
    </div>
    <dialog ref={dialogRef} aria-labelledby="chapter-list-title" onClose={onCloseChapterList} onCancel={onCloseChapterList}>
      <h2 id="chapter-list-title">Danh sách chương</h2>
      <button type="button" onClick={onCloseChapterList} aria-label="Đóng danh sách chương"><X size={18} /></button>
      <ol>{chapters.map((item) => <li key={item.number}><Link href={item.href} aria-current={item.current ? "page" : undefined} onClick={onCloseChapterList}>{item.number}. {item.title}{item.locked ? " (khóa)" : ""}</Link></li>)}</ol>
    </dialog>
  </>;
}

// ---------- container ----------

export function ReaderPanel({ story, chapter, title, content, unlock, unlockExpiresAt, navigation, readerEndAd }: ReaderPanelProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const linkFormRef = useRef<HTMLFormElement>(null);
  const chapterListButtonRef = useRef<HTMLButtonElement>(null);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const fontSize = useSyncExternalStore(subscribePreferences, getFontSize, () => 19);
  const { resolved, setTheme } = useTheme();
  const locked = content === null;
  const storyHref = `/truyen/${story.slug}`;

  const refresh = useCallback(() => router.refresh(), [router]);
  const rewarded = useRewardedUnlock(locked && unlock.mode === "rewarded", refresh);

  useEffect(() => {
    if (!locked) localStorage.setItem(`storyweb:progress:${story.slug}`, String(chapter));
  }, [chapter, story.slug, locked]);

  // Link mode: the destination opens in another tab; re-render with the new grant when the reader comes back.
  useEffect(() => {
    if (!locked || unlock.mode !== "link") return;
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [locked, unlock.mode, refresh]);

  // Choosing a chapter in the list also calls this, so the list is closed before navigation.
  const closeChapterList = useCallback(() => {
    setChapterListOpen(false);
    requestAnimationFrame(() => chapterListButtonRef.current?.focus());
  }, []);

  const closeGate = useCallback(() => router.push(storyHref), [router, storyHref]);

  useEffect(() => {
    if (!locked || !dialogRef.current) return;
    const selector = "a[href], button:not([disabled])";
    dialogRef.current.querySelector<HTMLElement>(selector)?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { closeGate(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const els = dialogRef.current.querySelectorAll<HTMLElement>(selector);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [locked, closeGate, rewarded.state]);

  function changeFont(next: number) {
    const value = Math.max(16, Math.min(26, next));
    localStorage.setItem("storyweb:font-size", String(value));
    window.dispatchEvent(new Event("storyweb:preference-change"));
  }

  const gate: UnlockGateViewProps = {
    chapter,
    storyHref,
    mode: unlock.mode,
    accessMinutes: unlock.accessMinutes,
    // Submitting inside the click handler keeps the user activation, so the new tab is not a popup.
    link: unlock.mode === "link" && unlock.destinationHost ? { destinationHost: unlock.destinationHost, onOpen: () => linkFormRef.current?.submit() } : null,
    rewarded: unlock.mode === "rewarded" ? { state: rewarded.state, message: rewarded.message, onWatch: () => void rewarded.onWatch(), onCancel: rewarded.onCancel } : null,
    onClose: closeGate,
  };
  const nav: ReaderNavigationViewProps = {
    storyHref,
    prevHref: navigation.prevHref,
    nextHref: navigation.nextHref,
    currentChapter: chapter,
    totalChapters: story.chapters,
    chapters: navigation.chapters,
    chapterListOpen,
    onOpenChapterList: () => setChapterListOpen(true),
    onCloseChapterList: closeChapterList,
    chapterListButtonRef,
  };

  const isDarkUI = resolved === "dark";
  const unlockedByGrant = unlockExpiresAt !== null && chapter > story.freeChapters;

  return <div className={`reader-shell ${isDarkUI ? "reader-shell--night" : ""}`}>
    <div className="container reader-shell__inner">
      <div className="reader-toolbar"><Link href={storyHref}><ChevronLeft size={17} /> Mục lục</Link><div className="reader-toolbar__settings"><span><Type size={17} /> Cỡ chữ</span><button type="button" aria-label="Giảm cỡ chữ" onClick={() => changeFont(fontSize - 1)}><Minus size={16} /></button><strong>{fontSize}</strong><button type="button" aria-label="Tăng cỡ chữ" onClick={() => changeFont(fontSize + 1)}><Plus size={16} /></button><button type="button" aria-label={isDarkUI ? "Chế độ sáng" : "Chế độ tối"} onClick={() => setTheme(isDarkUI ? "light" : "dark")}>{isDarkUI ? <Sun size={18} /> : <Moon size={18} />}</button></div></div>
      <article className="reader-article"><div className="eyebrow">{story.title} · CHƯƠNG {chapter}</div><h1>{title}</h1><div className="reader-rule">✦</div>
        {locked
          ? <DefaultUnlockGateView {...gate} dialogRef={dialogRef} />
          : <>{unlockedByGrant && <div className="reader-access-note"><Clock3 size={15} /> Đã mở quyền đọc các chương tiếp theo đến {new Date(unlockExpiresAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.</div>}<div className="reader-text" style={{ fontSize: `${fontSize}px` }}>{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="reader-end">— Hết chương {chapter} —</div></div></>}
      </article>
      {!locked && <AdSlotContainer config={readerEndAd} />}
      <DefaultReaderNavigationView {...nav} />
    </div>
    {unlock.mode === "link" && <form ref={linkFormRef} action="/unlock/visit" method="post" target="_blank" rel="noopener noreferrer" hidden />}
  </div>;
}
