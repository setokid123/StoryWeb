// M5: pure scroll/visibility logic for the reader toolbar and U7's floating dock. No DOM access, so it is unit-tested
// (scripts/test-reader-scroll.mjs); `useReaderScroll` feeds it one sample per animation frame.

export type ScrollSample = { y: number; viewportHeight: number; documentHeight: number };

export type ScrollConfig = {
  /** Within this distance from the top the toolbar sits in place and the dock stays hidden. */
  topZone: number;
  /** Downward travel (from where the reader started scrolling down) needed to hide the chrome. */
  hideAfter: number;
  /** Upward travel needed to show the chrome again; larger than hideAfter so small jitters do nothing. */
  showAfter: number;
  /** The dock shows when the bottom of the viewport is this close to the end of the page (min: one viewport). */
  nearEnd: number;
};

export const DEFAULT_SCROLL_CONFIG: ScrollConfig = { topZone: 160, hideAfter: 24, showAfter: 64, nearEnd: 480 };

export type ScrollState = {
  lastY: number;
  /** Scroll position where the current direction began; travel is measured from here. */
  anchorY: number;
  direction: "up" | "down" | null;
  atTop: boolean;
  toolbarHidden: boolean;
  dockShown: boolean;
};

export function initialScrollState(sample: ScrollSample, config: ScrollConfig = DEFAULT_SCROLL_CONFIG): ScrollState {
  const atTop = sample.y <= config.topZone;
  return { lastY: sample.y, anchorY: sample.y, direction: null, atTop, toolbarHidden: false, dockShown: !atTop && nearEnd(sample, config) };
}

function nearEnd(sample: ScrollSample, config: ScrollConfig) {
  return sample.y + sample.viewportHeight >= sample.documentHeight - Math.max(config.nearEnd, sample.viewportHeight);
}

/** Next state for a new scroll sample. Returns `prev` itself when nothing observable changed. */
export function nextScrollState(prev: ScrollState, sample: ScrollSample, config: ScrollConfig = DEFAULT_SCROLL_CONFIG): ScrollState {
  const y = Math.max(0, sample.y);
  const delta = y - prev.lastY;
  let { anchorY, direction, toolbarHidden, dockShown } = prev;

  if (Math.abs(delta) >= 1) {
    const now = delta > 0 ? "down" : "up";
    if (now !== direction) { direction = now; anchorY = prev.lastY; }
  }
  const travel = Math.abs(y - anchorY);
  if (direction === "down" && travel >= config.hideAfter) { toolbarHidden = true; dockShown = false; }
  if (direction === "up" && travel >= config.showAfter) { toolbarHidden = false; dockShown = true; }

  const atTop = y <= config.topZone;
  if (atTop) { toolbarHidden = false; dockShown = false; }
  else if (nearEnd({ ...sample, y }, config)) dockShown = true;

  if (atTop === prev.atTop && toolbarHidden === prev.toolbarHidden && dockShown === prev.dockShown && direction === prev.direction && anchorY === prev.anchorY) {
    return prev.lastY === y ? prev : { ...prev, lastY: y };
  }
  return { lastY: y, anchorY, direction, atTop, toolbarHidden, dockShown };
}

export type ChromeInputs = {
  scroll: Pick<ScrollState, "atTop" | "toolbarHidden" | "dockShown">;
  /** The end-of-chapter navigation is on screen: the dock would duplicate it. */
  endNavInView: boolean;
  /** Locked chapter: the unlock dialog owns focus. */
  locked: boolean;
  chapterListOpen: boolean;
  preferencesOpen: boolean;
  /** Keyboard/screen-reader focus is inside the toolbar or the dock: never hide it from under the reader. */
  toolbarFocused: boolean;
  dockFocused: boolean;
  /** Focus is being returned to a control in the toolbar/dock: keep it visible until that focus lands. */
  toolbarPinned: boolean;
  dockPinned: boolean;
};

export type ReaderChrome = { toolbar: "top" | "pinned" | "hidden"; dockVisible: boolean };

/** Final visibility of the toolbar (`data-scroll-state`) and the dock after modal/focus/end-nav rules. */
export function resolveReaderChrome(input: ChromeInputs): ReaderChrome {
  const keepToolbar = input.preferencesOpen || input.toolbarFocused || input.toolbarPinned;
  const toolbar = input.scroll.atTop ? "top" : input.scroll.toolbarHidden && !keepToolbar ? "hidden" : "pinned";
  const modal = input.locked || input.chapterListOpen || input.preferencesOpen;
  const wanted = input.dockPinned || input.dockFocused || (input.scroll.dockShown && !input.endNavInView);
  return { toolbar, dockVisible: !modal && wanted };
}
