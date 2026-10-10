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
// Two modes, chosen by the reader (toolbarMode):
// - "pinned" (default): the toolbar stays under the site header and the dock sits at the bottom from the moment the
//   page opens until the end-of-chapter navigation scrolls into view. data-scroll-state is "top" until the page
//   moves ("moved", a few pixels), then "pinned": the CSS frosted veil behind the bars fades in.
// - "auto": scrolling down hides both, scrolling up (showAfter px) brings them back, near the end the dock returns.

export const DEFAULT_SCROLL_CONFIG = Object.freeze({ topZone: 160, movedAfter: 8, hideAfter: 24, showAfter: 64, nearEnd: 480 });

function nearEnd(sample, config) {
  return sample.y + sample.viewportHeight >= sample.documentHeight - Math.max(config.nearEnd, sample.viewportHeight);
}

export function initialScrollState(sample, config = DEFAULT_SCROLL_CONFIG) {
  const atTop = sample.y <= config.topZone;
  return { lastY: sample.y, anchorY: sample.y, direction: null, atTop, moved: sample.y > config.movedAfter, toolbarHidden: false, dockShown: !atTop && nearEnd(sample, config) };
}

/** Next state for a new scroll sample. Returns `prev` itself when nothing observable changed. */
export function nextScrollState(prev, sample, config = DEFAULT_SCROLL_CONFIG) {
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
  const moved = y > config.movedAfter;
  if (atTop) { toolbarHidden = false; dockShown = false; }
  else if (nearEnd({ ...sample, y }, config)) dockShown = true;

  if (atTop === prev.atTop && moved === prev.moved && toolbarHidden === prev.toolbarHidden && dockShown === prev.dockShown && direction === prev.direction && anchorY === prev.anchorY) {
    return prev.lastY === y ? prev : { ...prev, lastY: y };
  }
  return { lastY: y, anchorY, direction, atTop, moved, toolbarHidden, dockShown };
}

/**
 * Final state of the toolbar (`data-scroll-state`: "top" | "pinned" | "hidden") and the dock.
 * Modals (locked-chapter gate, chapter list, preferences) always hide the dock; the end navigation on screen hides it
 * too (no duplicate buttons) unless focus is returning to a dock button. "pinned" mode never hides the toolbar.
 */
export function resolveReaderChrome(input) {
  const modal = input.locked || input.chapterListOpen || input.preferencesOpen;
  if (input.mode !== "auto") {
    const wanted = input.dockPinned || input.dockFocused || !input.endNavInView;
    return { toolbar: input.scroll.moved ? "pinned" : "top", dockVisible: !modal && wanted };
  }
  const keepToolbar = input.preferencesOpen || input.toolbarFocused || input.toolbarPinned;
  const toolbar = input.scroll.atTop ? "top" : input.scroll.toolbarHidden && !keepToolbar ? "hidden" : "pinned";
  const wanted = input.dockPinned || input.dockFocused || (input.scroll.dockShown && !input.endNavInView);
  return { toolbar, dockVisible: !modal && wanted };
}
