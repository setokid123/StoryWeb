// Shared (client + server) registry of display-ad placements. Display ads never grant chapter access.

export const AD_PLACEMENTS = ["home_feed", "story_detail", "reader_end", "search_results"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export type AdSlotFlags = Record<AdPlacement, boolean>;

export const DEFAULT_AD_SLOTS: AdSlotFlags = { home_feed: false, story_detail: false, reader_end: false, search_results: false };

/** Normalises stored/incoming flags: unknown keys dropped, missing keys = off. */
export function normalizeAdSlots(value: unknown): AdSlotFlags {
  const result = { ...DEFAULT_AD_SLOTS };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const placement of AD_PLACEMENTS) result[placement] = (value as Record<string, unknown>)[placement] === true;
  }
  return result;
}
