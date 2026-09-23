"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock3, Minus, Plus, Sun, Moon, Type } from "lucide-react";
import type { Story } from "@/data/stories";
import type { DisplayAdConfig } from "@/lib/display-ads";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { ChapterListDialog } from "@/components/chapter-list-dialog";
import { ReaderNavigation } from "@/components/reader-navigation";
import { useTheme } from "@/components/theme-provider";
import { type RewardedStatus, UnlockGateView } from "@/components/unlock-gate-view";
import { useRewardedUnlock } from "@/components/use-rewarded-unlock";
import type { ChapterListItem, RewardedViewState, UnlockViewMode } from "@/components/view-contracts";

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

/** Maps the logic state to U4's UnlockGateView status. */
function toGateStatus(state: RewardedViewState): RewardedStatus {
  if (state === "pending") return "pending";
  if (state === "unavailable" || state === "unconfigured") return "unavailable";
  if (state === "failed") return "error";
  return "idle";
}

export function ReaderPanel({ story, chapter, title, content, unlock, unlockExpiresAt, navigation, readerEndAd }: ReaderPanelProps) {
  const router = useRouter();
  const gateRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
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

  // Link mode opens the destination in another tab; re-render with the new grant when the reader comes back.
  useEffect(() => {
    if (!locked || unlock.mode !== "link") return;
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [locked, unlock.mode, refresh]);

  // Grant expiry: re-check on the server when the 5 minutes run out so the page reflects the new state.
  useEffect(() => {
    if (!unlockExpiresAt) return;
    const delay = unlockExpiresAt - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(refresh, Math.min(delay + 500, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [unlockExpiresAt, refresh]);

  const closeChapterList = useCallback(() => {
    setChapterListOpen(false);
    // Return focus to the button that opened the list.
    requestAnimationFrame(() => navRef.current?.querySelector<HTMLButtonElement>("button[aria-haspopup='dialog']")?.focus());
  }, []);

  const closeGate = useCallback(() => router.push(storyHref), [router, storyHref]);

  // Locked-chapter dialog: focus + Escape + Tab trap around U4's UnlockGateView (unchanged from U3).
  useEffect(() => {
    if (!locked || !gateRef.current) return;
    const selector = "a[href], button:not([disabled])";
    gateRef.current.querySelector<HTMLElement>(selector)?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { closeGate(); return; }
      if (e.key !== "Tab" || !gateRef.current) return;
      const els = gateRef.current.querySelectorAll<HTMLElement>(selector);
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

  const isDarkUI = resolved === "dark";
  const unlockedByGrant = unlockExpiresAt !== null && chapter > story.freeChapters;

  return <div className={`reader-shell ${isDarkUI ? "reader-shell--night" : ""}`}>
    <div className="container reader-shell__inner">
      <div className="reader-toolbar"><Link href={storyHref}><ChevronLeft size={17} /> Mục lục</Link><div className="reader-toolbar__settings"><span><Type size={17} /> Cỡ chữ</span><button type="button" aria-label="Giảm cỡ chữ" onClick={() => changeFont(fontSize - 1)}><Minus size={16} /></button><strong>{fontSize}</strong><button type="button" aria-label="Tăng cỡ chữ" onClick={() => changeFont(fontSize + 1)}><Plus size={16} /></button><button type="button" aria-label={isDarkUI ? "Chế độ sáng" : "Chế độ tối"} onClick={() => setTheme(isDarkUI ? "light" : "dark")}>{isDarkUI ? <Sun size={18} /> : <Moon size={18} />}</button></div></div>
      <article className="reader-article"><div className="eyebrow">{story.title} · CHƯƠNG {chapter}</div><h1>{title}</h1><div className="reader-rule">✦</div>
        {locked
          ? <div ref={gateRef}>
              <UnlockGateView chapterNumber={chapter} storySlug={story.slug} mode={unlock.mode} rewardedStatus={toGateStatus(rewarded.state)} onWatchAd={() => void rewarded.onWatch()} linkHref="/unlock/visit" />
              {unlock.mode === "rewarded" && rewarded.message && <p className="sr-only" role="status">{rewarded.message}</p>}
            </div>
          : <>{unlockedByGrant && <div className="reader-access-note"><Clock3 size={15} /> Đã mở quyền đọc các chương tiếp theo đến {new Date(unlockExpiresAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.</div>}<div className="reader-text" style={{ fontSize: `${fontSize}px` }}>{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="reader-end">— Hết chương {chapter} —</div></div></>}
      </article>
      {!locked && <AdSlotContainer config={readerEndAd} />}
      <div ref={navRef}>
        <ReaderNavigation storyUrl={storyHref} prevUrl={navigation.prevHref ?? undefined} nextUrl={navigation.nextHref ?? undefined} onOpenChapterList={() => setChapterListOpen(true)} />
      </div>
    </div>
    <ChapterListDialog
      isOpen={chapterListOpen}
      onClose={closeChapterList}
      storyTitle={story.title}
      chapters={navigation.chapters.map((item) => ({ chapterNumber: item.number, title: item.title, url: item.href, isLocked: item.locked, isCurrent: item.current }))}
    />
  </div>;
}
