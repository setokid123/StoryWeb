// Pure reader logic (no DOM), ported from StoryWeb src/lib/reader-preferences.ts (M3) and src/lib/reader-scroll.ts (M5).
// Unit-tested by scripts/test-reader-preferences.mjs and scripts/test-reader-scroll.mjs.

// ---------- reader preferences ----------
// Stored per device in localStorage under a versioned key. Theme is NOT stored here: it stays in "storyweb-theme".

export const READER_PREFS_KEY = "storyweb:reader-prefs:v1";
export const LEGACY_FONT_SIZE_KEY = "storyweb:font-size";
export const READER_PREFS_EVENT = "storyweb:reader-prefs-change";
const FONT_SIZE_MIN = 16;
const FONT_SIZE_MAX = 26;
const VERSION = 1;

export const DEFAULT_READER_PREFERENCES = Object.freeze({
  fontFamily: "lora",
  fontWeight: "normal",
  fontSize: 19,
  lineHeight: "normal",
  columnWidth: "medium",
  textAlignment: "justify",
  // Reader chrome while scrolling: "pinned" keeps header, toolbar and dock on screen; "auto" hides them on the way
  // down and brings them back on the way up.
  toolbarMode: "pinned",
});

const ALLOWED = {
  fontFamily: ["lora", "inter"],
  fontWeight: ["normal", "bold"],
  lineHeight: ["tight", "normal", "loose"],
  columnWidth: ["narrow", "medium", "wide"],
  textAlignment: ["left", "justify"],
  toolbarMode: ["pinned", "auto"],
};

const isEnumValue = (key, value) => typeof value === "string" && ALLOWED[key].includes(value);
const isValidFontSize = (value) => typeof value === "number" && Number.isInteger(value) && value >= FONT_SIZE_MIN && value <= FONT_SIZE_MAX;

/**
 * Parses the stored JSON. Each field is validated on its own: an invalid value falls back to its default without
 * discarding the valid ones. Broken JSON or an unknown version → all defaults. `legacyFontSize` (old
 * "storyweb:font-size") is used only when the new key does not exist yet.
 */
export function parseReaderPreferences(raw, legacyFontSize = null) {
  const result = { ...DEFAULT_READER_PREFERENCES };
  if (raw === null) {
    const legacy = legacyFontSize !== null && /^\d{2}$/.test(legacyFontSize.trim()) ? Number(legacyFontSize) : NaN;
    if (isValidFontSize(legacy)) result.fontSize = legacy;
    return result;
  }
  let data;
  try { data = JSON.parse(raw); } catch { return result; }
  if (!data || typeof data !== "object" || Array.isArray(data) || data.v !== VERSION) return result;
  for (const key of Object.keys(ALLOWED)) {
    if (isEnumValue(key, data[key])) result[key] = data[key];
  }
  if (isValidFontSize(data.fontSize)) result.fontSize = data.fontSize;
  return result;
}

export function serializeReaderPreferences(prefs) {
  return JSON.stringify({ v: VERSION, ...prefs });
}

/** Merges a partial update, ignoring invalid fields; font size is clamped to 16–26. */
export function applyReaderPreferenceUpdate(current, updates) {
  const next = { ...current };
  for (const key of Object.keys(ALLOWED)) {
    if (key in updates && isEnumValue(key, updates[key])) next[key] = updates[key];
  }
  if ("fontSize" in updates) {
    const size = updates.fontSize;
    if (typeof size === "number" && Number.isFinite(size)) next.fontSize = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));
  }
  return next;
}

/** Inline font size + data attributes for `.reader-text` (styled by `.reader-text[data-pref-*]` in globals.css). */
export function readerBodyStyle(prefs) {
  return {
    body: { fontSize: `${prefs.fontSize}px` },
    dataAttributes: {
      "data-pref-font": prefs.fontFamily,
      "data-pref-weight": prefs.fontWeight,
      "data-pref-line-height": prefs.lineHeight,
      "data-pref-width": prefs.columnWidth,
      "data-pref-align": prefs.textAlignment,
    },
  };
}

// ---------- toolbar / dock while scrolling ----------
// The dock (chapter navigation at the bottom) is always within reach: it shows from the moment the page opens and only
// gives way to a modal or to the end-of-chapter navigation. The reader's toolbarMode only concerns the top bars:
// - "pinned" (default): site header and toolbar stay at the top. data-scroll-state is "top" until the page moves
//   ("moved", a few pixels), then "pinned": the CSS frosted veil behind the bars fades in.
// - "auto" ("Không ghim"): scrolling down hides them, scrolling up (showAfter px) or reaching the top brings them back.

export const DEFAULT_SCROLL_CONFIG = Object.freeze({ topZone: 160, movedAfter: 8, hideAfter: 24, showAfter: 64 });

export function initialScrollState(sample, config = DEFAULT_SCROLL_CONFIG) {
  return { lastY: sample.y, anchorY: sample.y, direction: null, atTop: sample.y <= config.topZone, moved: sample.y > config.movedAfter, toolbarHidden: false };
}

/** Next state for a new scroll sample. Returns `prev` itself when nothing observable changed. */
export function nextScrollState(prev, sample, config = DEFAULT_SCROLL_CONFIG) {
  const y = Math.max(0, sample.y);
  const delta = y - prev.lastY;
  let { anchorY, direction, toolbarHidden } = prev;

  if (Math.abs(delta) >= 1) {
    const now = delta > 0 ? "down" : "up";
    if (now !== direction) { direction = now; anchorY = prev.lastY; }
  }
  const travel = Math.abs(y - anchorY);
  if (direction === "down" && travel >= config.hideAfter) toolbarHidden = true;
  if (direction === "up" && travel >= config.showAfter) toolbarHidden = false;

  const atTop = y <= config.topZone;
  const moved = y > config.movedAfter;
  if (atTop) toolbarHidden = false;

  if (atTop === prev.atTop && moved === prev.moved && toolbarHidden === prev.toolbarHidden && direction === prev.direction && anchorY === prev.anchorY) {
    return prev.lastY === y ? prev : { ...prev, lastY: y };
  }
  return { lastY: y, anchorY, direction, atTop, moved, toolbarHidden };
}

/**
 * Final state of the toolbar (`data-scroll-state`: "top" | "pinned" | "hidden") and the dock.
 * The dock, in both modes: hidden only while a modal is open (locked-chapter gate, chapter list, preferences) or while
 * the end navigation is on screen (no duplicate buttons), unless focus is returning to a dock button.
 * The toolbar: never hidden in "pinned" mode; in "auto" mode hidden after scrolling down, unless the preferences
 * panel (which lives in it) is open or it has keyboard focus.
 */
export function resolveReaderChrome(input) {
  const modal = input.locked || input.chapterListOpen || input.preferencesOpen;
  const dockVisible = !modal && (input.dockPinned || input.dockFocused || !input.endNavInView);
  if (input.mode !== "auto") return { toolbar: input.scroll.moved ? "pinned" : "top", dockVisible };
  const keepToolbar = input.preferencesOpen || input.toolbarFocused || input.toolbarPinned;
  const toolbar = input.scroll.atTop ? "top" : input.scroll.toolbarHidden && !keepToolbar ? "hidden" : "pinned";
  return { toolbar, dockVisible };
}
