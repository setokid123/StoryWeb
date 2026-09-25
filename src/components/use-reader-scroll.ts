"use client";

import { type RefObject, useEffect, useState } from "react";
import { DEFAULT_SCROLL_CONFIG, initialScrollState, nextScrollState, type ScrollState } from "@/lib/reader-scroll";

type ScrollChrome = Pick<ScrollState, "atTop" | "toolbarHidden" | "dockShown">;

const SERVER_STATE: ScrollChrome = { atTop: true, toolbarHidden: false, dockShown: false };

function sample() {
  return { y: window.scrollY, viewportHeight: window.innerHeight, documentHeight: document.documentElement.scrollHeight };
}

/**
 * Scroll direction → toolbar/dock state. One passive scroll listener, at most one computation per animation frame,
 * and React state changes only when a visible flag flips (not on every pixel). Also tracks whether the end-of-chapter
 * navigation is on screen via IntersectionObserver. The reader remounts per chapter, so state starts fresh.
 */
export function useReaderScroll(endNavRef: RefObject<HTMLElement | null>) {
  const [chrome, setChrome] = useState<ScrollChrome>(SERVER_STATE);
  const [endNavInView, setEndNavInView] = useState(false);

  useEffect(() => {
    let state = initialScrollState(sample(), DEFAULT_SCROLL_CONFIG);
    let frame = 0;
    const publish = () => setChrome((current) =>
      current.atTop === state.atTop && current.toolbarHidden === state.toolbarHidden && current.dockShown === state.dockShown
        ? current
        : { atTop: state.atTop, toolbarHidden: state.toolbarHidden, dockShown: state.dockShown });
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        state = nextScrollState(state, sample(), DEFAULT_SCROLL_CONFIG);
        publish();
      });
    };
    publish();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Resizing (rotation, font size changes the page height) can move the reader into or out of the end zone.
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const target = endNavRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setEndNavInView(entry?.isIntersecting ?? false), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [endNavRef]);

  return { ...chrome, endNavInView };
}
