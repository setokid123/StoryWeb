import "server-only";

import { type AdPlacement } from "@/lib/ad-placements";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Display ads (never a reward). Provider and unit ids come only from env and are format-checked, so admins can
 * toggle placements but can never inject HTML/script. Props below are safe to pass to the client.
 */
export type DisplayAdConfig =
  | { placement: AdPlacement; provider: "adsense"; client: string; slot: string }
  | { placement: AdPlacement; provider: "mock" };

export type DisplayProviderStatus = { provider: string; state: "ready" | "unconfigured" | "unavailable"; reason: string | null; configuredSlots: AdPlacement[] };

const ENV_SLOT: Record<AdPlacement, string> = {
  home_feed: "ADSENSE_SLOT_HOME_FEED",
  story_detail: "ADSENSE_SLOT_STORY_DETAIL",
  reader_end: "ADSENSE_SLOT_READER_END",
  search_results: "ADSENSE_SLOT_SEARCH_RESULTS",
};

function mockAllowed() {
  return (process.env.NODE_ENV !== "production" || process.env.STORYWEB_ALLOW_MOCK_ADS === "1") && !process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_PROJECT_ID;
}

function providerConfig(placement: AdPlacement): DisplayAdConfig | null {
  const provider = (process.env.DISPLAY_AD_PROVIDER ?? "").trim().toLowerCase();
  if (provider === "adsense") {
    const client = process.env.ADSENSE_CLIENT_ID ?? "";
    const slot = process.env[ENV_SLOT[placement]] ?? "";
    return /^ca-pub-\d{10,20}$/.test(client) && /^\d{6,20}$/.test(slot) ? { placement, provider: "adsense", client, slot } : null;
  }
  if (provider === "mock" && mockAllowed()) return { placement, provider: "mock" };
  return null;
}

export function displayProviderStatus(): DisplayProviderStatus {
  const provider = (process.env.DISPLAY_AD_PROVIDER ?? "").trim().toLowerCase();
  const configuredSlots = (Object.keys(ENV_SLOT) as AdPlacement[]).filter((placement) => providerConfig(placement));
  if (!provider) return { provider: "", state: "unconfigured", reason: "Chưa cấu hình nhà cung cấp quảng cáo hiển thị (DISPLAY_AD_PROVIDER).", configuredSlots };
  if (provider === "mock" && !mockAllowed()) return { provider, state: "unavailable", reason: "Quảng cáo mock chỉ dùng cho dev/test.", configuredSlots };
  if (provider !== "adsense" && provider !== "mock") return { provider, state: "unconfigured", reason: `Nhà cung cấp "${provider}" chưa được hỗ trợ.`, configuredSlots };
  if (configuredSlots.length === 0) return { provider, state: "unconfigured", reason: "Thiếu ADSENSE_CLIENT_ID hoặc mã đơn vị cho các vị trí.", configuredSlots };
  return { provider, state: "ready", reason: null, configuredSlots };
}

/** Config for a public placement, or null when the admin disabled it / provider is not configured (render nothing). */
export async function getDisplayAd(placement: AdPlacement): Promise<DisplayAdConfig | null> {
  const settings = await getSiteSettings();
  if (settings.unavailable || !settings.adSlots[placement]) return null;
  return providerConfig(placement);
}
