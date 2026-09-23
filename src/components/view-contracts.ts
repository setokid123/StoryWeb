// Logic-side view-model types (Claude). U4 views (Antigravity) define their own props; containers map these onto
// them: reader-panel.tsx → UnlockGateView / ReaderNavigation / ChapterListDialog, ad-slot-container.tsx → AdSlot,
// unlock-settings-container.tsx → UnlockSettingsView. Views never fetch, read cookies or decide access.

export type UnlockViewMode = "off" | "link" | "rewarded";

/** Rewarded flow state; mapped to U4 RewardedStatus (ready/granted→idle, pending, unavailable/unconfigured, failed→error). */
export type RewardedViewState = "unconfigured" | "ready" | "pending" | "unavailable" | "failed" | "granted";

/** Server-built chapter list entry: titles and lock state only, never bodies. Mapped to U4 ChapterItem. */
export type ChapterListItem = { number: number; title: string; href: string; locked: boolean; current: boolean };
