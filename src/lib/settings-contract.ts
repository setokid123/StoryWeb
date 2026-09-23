// JSON contract of GET/PUT /api/admin/settings (shared by the route and the Studio container). No secrets.
import type { AdPlacement, AdSlotFlags } from "@/lib/ad-placements";

export type Readiness = { state: "ready" | "unconfigured" | "unavailable" | "blocked"; reason: string | null };

export type AdminSettingsPayload = {
  settings: {
    unlockEnabled: boolean;
    unlockMode: "link" | "rewarded";
    unlockLinkUrl: string | null;
    unlockRevision: number;
    adSlots: AdSlotFlags;
    version: number;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  readiness: { link: Readiness; rewarded: Readiness & { provider: string; providerLabel: string } };
  /** What readers get right now after env + readiness checks. */
  effectiveMode: "off" | "link" | "rewarded";
  emergencyOff: boolean;
  /** CLICK_UNLOCK_URL exists in env and is used when `unlockLinkUrl` is null. */
  envLinkUrlConfigured: boolean;
  display: Readiness & { provider: string; configuredSlots: AdPlacement[] };
  accessMinutes: number;
  audit: { changedAt: string; actor: string }[];
};

export type AdminSettingsUpdate = {
  version: number;
  unlockEnabled: boolean;
  unlockMode: "link" | "rewarded";
  unlockLinkUrl: string | null;
  adSlots: AdSlotFlags;
};
