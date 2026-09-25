"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock3, SlidersHorizontal, Sun, Moon } from "lucide-react";
import type { Story } from "@/data/stories";
import type { DisplayAdConfig } from "@/lib/display-ads";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { ChapterListDialog } from "@/components/chapter-list-dialog";
import { ReaderFloatingNavigation } from "@/components/reader-floating-navigation";
import { ReaderNavigation } from "@/components/reader-navigation";
import { type ReaderPreferences, ReaderPreferencesView } from "@/components/reader-preferences-view";
import { useTheme } from "@/components/theme-provider";
import { type RewardedStatus, UnlockGateView } from "@/components/unlock-gate-view";
import { useReaderPreferences } from "@/components/use-reader-preferences";
import { useReaderScroll } from "@/components/use-reader-scroll";
import { useRewardedUnlock } from "@/components/use-rewarded-unlock";
import type { ChapterListItem, RewardedViewState, UnlockViewMode } from "@/components/view-contracts";
import { readerBodyStyle } from "@/lib/reader-preferences";
import { resolveReaderChrome } from "@/lib/reader-scroll";

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

/**
 * Focuses `ref` as soon as the browser accepts it (not inert, not visibility:hidden), retrying for a few frames,
 * then calls `done` whether or not it succeeded so a temporary "pinned" state never sticks.
 */
function focusWhenReady(ref: React.RefObject<HTMLElement | null>, done?: () => void, frames = 20) {
  const attempt = (left: number) => requestAnimationFrame(() => {
    const el = ref.current;
    el?.focus({ preventScroll: true });
    if (!el || document.activeElement === el || left <= 0) { done?.(); return; }
    attempt(left - 1);
  });
  attempt(frames);
}

export function ReaderPanel({ story, chapter, title, content, unlock, unlockExpiresAt, grantRemainingMs, navigation, readerEndAd }: ReaderPanelProps) {
  const router = useRouter();
  const gateRef = useRef<HTMLDivElement>(null);
  const gateFocusedRef = useRef(false);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const dockListButtonRef = useRef<HTMLButtonElement>(null);
  /** Which chapter-list button opened the dialog, so closing it returns focus to that exact button. */
  const listTriggerRef = useRef<"dock" | "end">("end");
  const endNavRef = useRef<HTMLDivElement>(null);
  const prefsButtonRef = useRef<HTMLButtonElement>(null);
  const prefsAnchorRef = useRef<HTMLDivElement>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [expiredGrant, setExpiredGrant] = useState(false);
  const [toolbarFocused, setToolbarFocused] = useState(false);
  const [dockFocused, setDockFocused] = useState(false);
  const [dockPinned, setDockPinned] = useState(false);
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const scroll = useReaderScroll(endNavRef);
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

  const openChapterList = useCallback((trigger: "dock" | "end") => {
    listTriggerRef.current = trigger;
    setPrefsOpen(false);
    setChapterListOpen(true);
  }, []);

  const closeChapterList = useCallback(() => {
    setChapterListOpen(false);
    // Return focus to the exact button that opened the list. The dock is pinned visible until that focus lands:
    // otherwise it could still be inert/visibility:hidden (first frame of the CSS transition) and focus would be lost.
    if (listTriggerRef.current === "dock") {
      setDockPinned(true);
      focusWhenReady(dockListButtonRef, () => setDockPinned(false));
    } else {
      focusWhenReady(listButtonRef);
    }
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
    if (!restoreFocus) return;
    // The toolbar may be scrolled away (hidden) once preferences close; keep it until the toggle has focus again.
    setToolbarPinned(true);
    focusWhenReady(prefsButtonRef, () => setToolbarPinned(false));
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

  const chrome = resolveReaderChrome({ scroll, endNavInView: scroll.endNavInView, locked, chapterListOpen, preferencesOpen: prefsOpen, toolbarFocused, dockFocused, toolbarPinned, dockPinned });
  const toolbarHidden = chrome.toolbar === "hidden";
  // focus/blur bubble in React; relatedTarget tells whether focus stayed inside the element. Only keyboard focus
  // (:focus-visible) keeps the chrome shown, so a mouse click on the dock does not pin it while the reader scrolls.
  const trackFocus = (set: (focused: boolean) => void, onEnter?: () => void) => ({
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      let keyboard = true;
      try { keyboard = (event.target as HTMLElement).matches(":focus-visible"); } catch { /* old browsers: assume keyboard */ }
      set(keyboard);
      onEnter?.();
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) set(false); },
  });

  const isDarkUI = resolved === "dark";
  const unlockedByGrant = unlockExpiresAt !== null && chapter > story.freeChapters;

  return <div className="reader-shell">
    <div className="container reader-shell__inner">
      {/* data-scroll-state: top (in place) | pinned (sticky, shown after scrolling up) | hidden. Hidden controls are
          inert so they leave the Tab order; the toolbar stays shown while preferences are open or it holds focus. */}
      <div className={`reader-toolbar${toolbarHidden ? " is-hidden" : ""}`} data-scroll-state={chrome.toolbar} inert={toolbarHidden} {...trackFocus(setToolbarFocused)}>
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
      <div ref={endNavRef}>
        <ReaderNavigation storyUrl={storyHref} prevUrl={navigation.prevHref ?? undefined} nextUrl={navigation.nextHref ?? undefined} onOpenChapterList={() => openChapterList("end")} listButtonRef={listButtonRef} />
      </div>
    </div>
    {/* U7 dock: same four actions/targets as the end navigation. Inert when hidden, on a locked chapter or while a
        dialog/preferences is open, so it never takes Tab focus; visible while it holds focus. */}
    <div inert={!chrome.dockVisible} {...trackFocus(setDockFocused)}>
      <ReaderFloatingNavigation visible={chrome.dockVisible} storyUrl={storyHref} prevUrl={navigation.prevHref ?? undefined} nextUrl={navigation.nextHref ?? undefined} onOpenChapterList={() => openChapterList("dock")} listButtonRef={dockListButtonRef} />
    </div>
    <ChapterListDialog
      isOpen={chapterListOpen}
      onClose={closeChapterList}
      storyTitle={story.title}
      chapters={navigation.chapters.map((item) => ({ chapterNumber: item.number, title: item.title, url: item.href, isLocked: item.locked, isCurrent: item.current }))}
    />
  </div>;
}
