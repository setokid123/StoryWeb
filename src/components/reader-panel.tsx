"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock3, SlidersHorizontal, Sun, Moon } from "lucide-react";
import type { Story } from "@/data/stories";
import type { DisplayAdConfig } from "@/lib/display-ads";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { ChapterListDialog } from "@/components/chapter-list-dialog";
import { ReaderNavigation } from "@/components/reader-navigation";
import { type ReaderPreferences, ReaderPreferencesView } from "@/components/reader-preferences-view";
import { useTheme } from "@/components/theme-provider";
import { type RewardedStatus, UnlockGateView } from "@/components/unlock-gate-view";
import { useReaderPreferences } from "@/components/use-reader-preferences";
import { useRewardedUnlock } from "@/components/use-rewarded-unlock";
import type { ChapterListItem, RewardedViewState, UnlockViewMode } from "@/components/view-contracts";
import { readerBodyStyle } from "@/lib/reader-preferences";

export type ReaderUnlockInfo = { mode: UnlockViewMode; destinationHost: string | null; accessMinutes: number };

type ReaderPanelProps = {
  story: Story;
  chapter: number;
  title: string;
  /** null = locked; the server never sends a locked body. */
  content: string | null;
  unlock: ReaderUnlockInfo;
  unlockExpiresAt: number | null;
  grantRemainingMs: number | null;
  navigation: { prevHref: string | null; nextHref: string | null; chapters: ChapterListItem[] };
  readerEndAd: DisplayAdConfig | null;
};

/** Maps the logic state to U4's UnlockGateView status. */
function toGateStatus(state: RewardedViewState): RewardedStatus {
  if (state === "pending") return "pending";
  if (state === "unavailable" || state === "unconfigured") return "unavailable";
  if (state === "failed") return "error";
  return "idle";
}

export function ReaderPanel({ story, chapter, title, content, unlock, unlockExpiresAt, grantRemainingMs, navigation, readerEndAd }: ReaderPanelProps) {
  const router = useRouter();
  const gateRef = useRef<HTMLDivElement>(null);
  const gateFocusedRef = useRef(false);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const prefsButtonRef = useRef<HTMLButtonElement>(null);
  const prefsAnchorRef = useRef<HTMLDivElement>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [expiredGrant, setExpiredGrant] = useState(false);
  const { preferences, update: updatePreferences, reset: resetPreferences } = useReaderPreferences();
  const { theme, resolved, setTheme } = useTheme();
  const grantProtected = chapter > story.freeChapters && unlockExpiresAt !== null;
  const locked = content === null || (grantProtected && expiredGrant);
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

  // Remove granted content from the DOM at expiry even if refreshing the server is delayed or offline.
  // Re-check on focus/visibility because background tabs can throttle timers.
  useLayoutEffect(() => {
    if (!grantProtected || !unlockExpiresAt || grantRemainingMs === null) return;
    const deadline = performance.now() + Math.min(grantRemainingMs, 300_000);
    const expireIfNeeded = () => {
      if (performance.now() < deadline && Date.now() < unlockExpiresAt) return;
      setExpiredGrant(true);
      refresh();
    };
    const timer = setTimeout(expireIfNeeded, Math.max(0, Math.min(grantRemainingMs, 300_000)));
    window.addEventListener("focus", expireIfNeeded);
    document.addEventListener("visibilitychange", expireIfNeeded);
    expireIfNeeded();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", expireIfNeeded);
      document.removeEventListener("visibilitychange", expireIfNeeded);
    };
  }, [grantProtected, unlockExpiresAt, grantRemainingMs, refresh]);

  const closeChapterList = useCallback(() => {
    setChapterListOpen(false);
    // Return focus to the button that opened the list.
    requestAnimationFrame(() => listButtonRef.current?.focus());
  }, []);

  const closeGate = useCallback(() => router.push(storyHref), [router, storyHref]);

  // Locked-chapter dialog: focus on entry, Escape and Tab trap around U4's UnlockGateView.
  useEffect(() => {
    if (!locked) { gateFocusedRef.current = false; return; }
    if (chapterListOpen || prefsOpen || !gateRef.current) return;
    const selector = "a[href], button:not([disabled])";
    // Focus the gate when it first appears. Re-focusing after closing preferences or the chapter list
    // would steal focus from the trigger that deliberately received it back.
    if (!gateFocusedRef.current) {
      gateRef.current.querySelector<HTMLElement>(selector)?.focus();
      gateFocusedRef.current = true;
    }
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
  }, [locked, chapterListOpen, prefsOpen, closeGate, rewarded.state]);

  const closePreferences = useCallback((restoreFocus = true) => {
    setPrefsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => prefsButtonRef.current?.focus());
  }, []);

  // Preferences popover: focus inside on open, Escape closes and returns focus, Tab stays inside (the view is
  // aria-modal), pointer down outside closes. Changes apply immediately; nothing to confirm.
  useEffect(() => {
    if (!prefsOpen) return;
    const panel = () => prefsAnchorRef.current?.querySelector<HTMLElement>(".reader-prefs") ?? null;
    const selector = "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
    panel()?.querySelector<HTMLElement>(selector)?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); closePreferences(); return; }
      const root = panel();
      if (e.key !== "Tab" || !root) return;
      const els = root.querySelectorAll<HTMLElement>(selector);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function onPointerDown(e: PointerEvent) {
      if (prefsAnchorRef.current && !prefsAnchorRef.current.contains(e.target as Node)) closePreferences(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [prefsOpen, closePreferences]);

  const viewPreferences: ReaderPreferences = { ...preferences, theme };
  const onUpdatePreferences = (updates: Partial<ReaderPreferences>) => {
    const { theme: nextTheme, ...rest } = updates;
    if (nextTheme) setTheme(nextTheme);
    if (Object.keys(rest).length) updatePreferences(rest);
  };
  const onResetPreferences = () => { resetPreferences(); setTheme("system"); };
  const togglePreferences = () => {
    if (prefsOpen) { closePreferences(); return; }
    setChapterListOpen(false);
    setPrefsOpen(true);
  };
  // Preferences apply to the chapter body only (not UI text, the lock dialog or ads).
  const bodyStyle = readerBodyStyle(preferences);

  const isDarkUI = resolved === "dark";
  const unlockedByGrant = unlockExpiresAt !== null && chapter > story.freeChapters;

  return <div className={`reader-shell ${isDarkUI ? "reader-shell--night" : ""}`}>
    <div className="container reader-shell__inner">
      <div className="reader-toolbar">
        <Link href={storyHref}><ChevronLeft size={17} /> Mục lục</Link>
        {/* The panel sits outside .reader-toolbar__settings so its buttons do not get the 44×44 toolbar button style;
            this wrapper is the positioned anchor for U5's absolutely positioned .reader-prefs. */}
        <div ref={prefsAnchorRef} className="reader-toolbar__prefs-anchor">
          <div className="reader-toolbar__settings">
            <button type="button" aria-label={isDarkUI ? "Chế độ sáng" : "Chế độ tối"} onClick={() => setTheme(isDarkUI ? "light" : "dark")}>{isDarkUI ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button type="button" ref={prefsButtonRef} aria-label="Tùy chỉnh đọc" aria-haspopup="dialog" aria-expanded={prefsOpen} aria-controls="reader-preferences" onClick={togglePreferences}><SlidersHorizontal size={18} /></button>
          </div>
          {prefsOpen && <div id="reader-preferences"><ReaderPreferencesView preferences={viewPreferences} onUpdate={onUpdatePreferences} onReset={onResetPreferences} onClose={() => closePreferences()} /></div>}
        </div>
      </div>
      <article className="reader-article"><div className="eyebrow">{story.title} · CHƯƠNG {chapter}</div><h1>{title}</h1><div className="reader-rule">✦</div>
        {locked
          ? <div ref={gateRef}>
              <UnlockGateView chapterNumber={chapter} storySlug={story.slug} mode={unlock.mode} rewardedStatus={toGateStatus(rewarded.state)} onWatchAd={() => void rewarded.onWatch()} linkHref="/unlock/visit" />
              {unlock.mode === "rewarded" && rewarded.message && <p className="sr-only" role="status">{rewarded.message}</p>}
            </div>
          : <>{unlockedByGrant && <div className="reader-access-note"><Clock3 size={15} /> Đã mở quyền đọc các chương tiếp theo đến {new Date(unlockExpiresAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.</div>}<div className="reader-text" style={bodyStyle.body} {...bodyStyle.dataAttributes}>{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="reader-end">Hết chương {chapter}</div></>}
      </article>
      {!locked && <AdSlotContainer config={readerEndAd} />}
      <ReaderNavigation storyUrl={storyHref} prevUrl={navigation.prevHref ?? undefined} nextUrl={navigation.nextHref ?? undefined} onOpenChapterList={() => { setPrefsOpen(false); setChapterListOpen(true); }} listButtonRef={listButtonRef} />
    </div>
    <ChapterListDialog
      isOpen={chapterListOpen}
      onClose={closeChapterList}
      storyTitle={story.title}
      chapters={navigation.chapters.map((item) => ({ chapterNumber: item.number, title: item.title, url: item.href, isLocked: item.locked, isCurrent: item.current }))}
    />
  </div>;
}
