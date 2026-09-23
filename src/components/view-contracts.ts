// Typed props contract between M2 logic containers (Claude) and U4 presentational views (Antigravity).
// Views render only these props and call these callbacks; they never fetch, read cookies or decide access.
import type { RefObject } from "react";
import type { AdPlacement, AdSlotFlags } from "@/lib/ad-placements";

// ---------- reader: unlock dialog ----------

export type UnlockViewMode = "off" | "link" | "rewarded";
/** Rewarded flow state. `unconfigured` never reaches readers (mode is "off" then); kept for Studio preview. */
export type RewardedViewState = "unconfigured" | "ready" | "pending" | "unavailable" | "failed" | "granted";

export type UnlockGateViewProps = {
  chapter: number;
  storyHref: string;
  mode: UnlockViewMode;
  /** Minutes a grant lasts (5). */
  accessMinutes: number;
  /** Mode "link": button opens the destination in a new tab via a same-origin POST owned by the container. */
  link: null | { destinationHost: string; onOpen: () => void };
  /** Mode "rewarded". `message` is a Vietnamese status/error line or null. */
  rewarded: null | { state: RewardedViewState; message: string | null; onWatch: () => void; onCancel: () => void };
  /** Escape / close button: go back to the story. */
  onClose: () => void;
};

// ---------- reader: navigation + chapter list ----------

export type ChapterListItem = { number: number; title: string; href: string; locked: boolean; current: boolean };

export type ReaderNavigationViewProps = {
  storyHref: string;
  prevHref: string | null;
  nextHref: string | null;
  currentChapter: number;
  totalChapters: number;
  chapters: ChapterListItem[];
  chapterListOpen: boolean;
  onOpenChapterList: () => void;
  onCloseChapterList: () => void;
  /** Container restores focus here when the list closes. */
  chapterListButtonRef: RefObject<HTMLButtonElement | null>;
};

// ---------- display ad slot ----------

export type AdSlotStatus = "loading" | "filled" | "no_fill" | "error";

export type AdSlotViewProps = {
  placement: AdPlacement;
  status: AdSlotStatus;
  /** Studio preview frame (labelled sample); public pages never render a preview. */
  preview: boolean;
  /** Element the provider fills; the view must render it inside the slot. */
  mountRef: RefObject<HTMLDivElement | null>;
};

// ---------- Studio: ads & unlock settings ----------

export type ReadinessView = { state: "ready" | "unconfigured" | "unavailable" | "blocked"; reason: string | null };

export type UnlockSettingsViewProps = {
  enabled: boolean;
  selectedMode: "link" | "rewarded";
  linkUrl: string;
  readiness: { link: ReadinessView; rewarded: ReadinessView & { providerLabel: string } };
  /** Mode readers see right now, after server checks. */
  effectiveMode: UnlockViewMode;
  slots: AdSlotFlags;
  slotInfo: Record<AdPlacement, { label: string; position: string; configured: boolean }>;
  display: ReadinessView & { provider: string };
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
  dirty: boolean;
  /** False when enabling a mode that is not ready; the view must disable the save button and show `saveBlockedReason`. */
  canSave: boolean;
  saveBlockedReason: string | null;
  pending: boolean;
  error: string | null;
  success: string | null;
  fieldErrors: Partial<Record<"linkUrl" | "unlockMode" | "adSlots", string>>;
  onToggleEnabled: (enabled: boolean) => void;
  onSelectMode: (mode: "link" | "rewarded") => void;
  onLinkUrlChange: (url: string) => void;
  onToggleSlot: (placement: AdPlacement, enabled: boolean) => void;
  onSave: () => void;
  onReset: () => void;
};
