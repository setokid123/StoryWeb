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
});

const ALLOWED = {
  fontFamily: ["lora", "inter"],
  fontWeight: ["normal", "bold"],
  lineHeight: ["tight", "normal", "loose"],
  columnWidth: ["narrow", "medium", "wide"],
  textAlignment: ["left", "justify"],
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
// Both stay within reach (2026-10-10, at the reader's request): the toolbar is pinned under the site header the whole
// time, and the dock sits at the bottom from the moment the page opens until the end-of-chapter navigation scrolls
// into view. Scrolling only tells "at the very top" (data-scroll-state="top") from "reading" ("pinned").

export const DEFAULT_SCROLL_CONFIG = Object.freeze({ topZone: 160 });

export function initialScrollState(sample, config = DEFAULT_SCROLL_CONFIG) {
  return { lastY: sample.y, atTop: sample.y <= config.topZone };
}

/** Next state for a new scroll sample. Returns `prev` itself when nothing observable changed. */
export function nextScrollState(prev, sample, config = DEFAULT_SCROLL_CONFIG) {
  const y = Math.max(0, sample.y);
  const atTop = y <= config.topZone;
  if (atTop === prev.atTop) return prev.lastY === y ? prev : { ...prev, lastY: y };
  return { lastY: y, atTop };
}

/**
 * Final state of the toolbar (`data-scroll-state`: "top" | "pinned", never hidden) and the dock. The dock hides only
 * while a modal is open (locked-chapter gate, chapter list, preferences) or when the end navigation is on screen, so
 * the same four buttons are never shown twice; focus returning to a dock button wins over that last rule.
 */
export function resolveReaderChrome(input) {
  const toolbar = input.scroll.atTop ? "top" : "pinned";
  const modal = input.locked || input.chapterListOpen || input.preferencesOpen;
  const wanted = input.dockPinned || input.dockFocused || !input.endNavInView;
  return { toolbar, dockVisible: !modal && wanted };
}
