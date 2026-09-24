// Reader preferences model (pure: no React/Next imports, unit-tested in scripts/test-reader-preferences.mjs).
// Stored per device in localStorage under a versioned key. Theme is NOT stored here: it stays in the existing
// theme provider ("storyweb-theme") so the whole site keeps one source of truth.

export type FontFamily = "lora" | "inter";
export type FontWeight = "normal" | "bold";
export type LineHeight = "tight" | "normal" | "loose";
export type ColumnWidth = "narrow" | "medium" | "wide";
export type TextAlignment = "left" | "justify";

export type StoredReaderPreferences = {
  fontFamily: FontFamily;
  fontWeight: FontWeight;
  fontSize: number;
  lineHeight: LineHeight;
  columnWidth: ColumnWidth;
  textAlignment: TextAlignment;
};

export const READER_PREFS_KEY = "storyweb:reader-prefs:v1";
export const LEGACY_FONT_SIZE_KEY = "storyweb:font-size";
export const READER_PREFS_EVENT = "storyweb:reader-prefs-change";
export const FONT_SIZE_MIN = 16;
export const FONT_SIZE_MAX = 26;
const VERSION = 1;

export const DEFAULT_READER_PREFERENCES: StoredReaderPreferences = Object.freeze({
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
} as const;

type EnumKey = keyof typeof ALLOWED;

function isEnumValue<K extends EnumKey>(key: K, value: unknown): value is StoredReaderPreferences[K] {
  return typeof value === "string" && (ALLOWED[key] as readonly string[]).includes(value);
}

export function isValidFontSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= FONT_SIZE_MIN && value <= FONT_SIZE_MAX;
}

/**
 * Parses the stored JSON. Every field is validated on its own: an invalid/out-of-range value falls back to its
 * default without discarding the valid ones. Broken JSON or an unknown version → all defaults.
 * `legacyFontSize` (old "storyweb:font-size") is used only when the new key does not exist yet.
 */
export function parseReaderPreferences(raw: string | null, legacyFontSize: string | null = null): StoredReaderPreferences {
  const result: StoredReaderPreferences = { ...DEFAULT_READER_PREFERENCES };
  if (raw === null) {
    const legacy = legacyFontSize !== null && /^\d{2}$/.test(legacyFontSize.trim()) ? Number(legacyFontSize) : NaN;
    if (isValidFontSize(legacy)) result.fontSize = legacy;
    return result;
  }
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return result; }
  if (!data || typeof data !== "object" || Array.isArray(data) || (data as { v?: unknown }).v !== VERSION) return result;
  const record = data as Record<string, unknown>;
  for (const key of Object.keys(ALLOWED) as EnumKey[]) {
    if (isEnumValue(key, record[key])) (result as Record<EnumKey, string>)[key] = record[key] as string;
  }
  if (isValidFontSize(record.fontSize)) result.fontSize = record.fontSize;
  return result;
}

export function serializeReaderPreferences(prefs: StoredReaderPreferences): string {
  return JSON.stringify({ v: VERSION, ...prefs });
}

/** Merges a partial update, ignoring invalid fields (a buggy view can never store garbage). */
export function applyReaderPreferenceUpdate(current: StoredReaderPreferences, updates: Partial<Record<keyof StoredReaderPreferences, unknown>>): StoredReaderPreferences {
  const next = { ...current };
  for (const key of Object.keys(ALLOWED) as EnumKey[]) {
    if (key in updates && isEnumValue(key, updates[key])) (next as Record<EnumKey, string>)[key] = updates[key] as string;
  }
  if ("fontSize" in updates) {
    const size = updates.fontSize;
    if (typeof size === "number" && Number.isFinite(size)) next.fontSize = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));
  }
  return next;
}

export function sameReaderPreferences(a: StoredReaderPreferences, b: StoredReaderPreferences) {
  return a.fontFamily === b.fontFamily && a.fontWeight === b.fontWeight && a.fontSize === b.fontSize && a.lineHeight === b.lineHeight && a.columnWidth === b.columnWidth && a.textAlignment === b.textAlignment;
}

// ---------- rendering (chapter body only) ----------

export type ReaderBodyStyle = {
  /** Inline style for `.reader-text`: only the font size, which is continuous (16–26px). */
  body: { fontSize: string };
  /** Every other choice is styled by U5 CSS rules `.reader-text[data-pref-*]` in globals.css. */
  dataAttributes: {
    "data-pref-font": FontFamily;
    "data-pref-weight": FontWeight;
    "data-pref-line-height": LineHeight;
    "data-pref-width": ColumnWidth;
    "data-pref-align": TextAlignment;
  };
};

export function readerBodyStyle(prefs: StoredReaderPreferences): ReaderBodyStyle {
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
