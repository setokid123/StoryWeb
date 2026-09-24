import "server-only";

import { type AdSlotFlags, AD_PLACEMENTS, normalizeAdSlots } from "@/lib/ad-placements";
import { displayProviderStatus } from "@/lib/display-ads";
import type { AdminSettingsPayload, AdminSettingsUpdate } from "@/lib/settings-contract";
import { getSiteSettings, readSettingsAudit, type SiteSettings } from "@/lib/site-settings";
import { checkUnlockLinkUrl, linkReadiness, modeReadiness, resolveUnlock, rewardedReadiness, UNLOCK_SECONDS } from "@/lib/unlock";

/** Admin-only view of settings + readiness. Never includes env secrets; the link URL is not secret. */
export async function buildAdminSettingsPayload(settings?: SiteSettings): Promise<AdminSettingsPayload> {
  const current = settings ?? await getSiteSettings();
  const link = linkReadiness(current);
  const rewarded = rewardedReadiness();
  const display = displayProviderStatus();
  const resolved = settings ? null : await resolveUnlock();
  const effectiveMode = resolved ? resolved.mode
    : process.env.UNLOCK_EMERGENCY_OFF === "true" || !current.unlockEnabled ? "off"
      : (current.unlockMode === "link" ? link.state : rewarded.state) === "ready" ? current.unlockMode : "off";
  const audit = await readSettingsAudit(10).catch(() => []);
  return {
    settings: {
      unlockEnabled: current.unlockEnabled,
      unlockMode: current.unlockMode,
      unlockLinkUrl: current.unlockLinkUrl,
      unlockRevision: current.unlockRevision,
      adSlots: current.adSlots,
      version: current.version,
      updatedAt: current.updatedAt,
      updatedBy: current.updatedBy,
    },
    readiness: {
      link: { state: link.state, reason: link.reason },
      rewarded: { state: rewarded.state, reason: rewarded.reason, provider: rewarded.provider.id, providerLabel: rewarded.provider.label },
    },
    effectiveMode,
    emergencyOff: process.env.UNLOCK_EMERGENCY_OFF === "true",
    envLinkUrlConfigured: Boolean(process.env.CLICK_UNLOCK_URL),
    display: { state: display.state, reason: display.reason, provider: display.provider, configuredSlots: display.configuredSlots },
    accessMinutes: UNLOCK_SECONDS / 60,
    audit: audit.map((entry) => ({ changedAt: entry.changedAt, actor: entry.actor })),
  };
}

export type ParsedUpdate = { ok: true; value: AdminSettingsUpdate } | { ok: false; status: 400 | 409; code: "invalid_input" | "mode_not_ready"; error: string; fields?: Record<string, string> };

/** Validates a PUT body. Enabling a mode that is not ready is refused (fail closed); flags are strict booleans. */
export function parseSettingsUpdate(body: Record<string, unknown>, current: SiteSettings): ParsedUpdate {
  const fields: Record<string, string> = {};
  const version = body.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) fields.version = "Thiếu phiên bản cấu hình.";
  if (typeof body.unlockEnabled !== "boolean") fields.unlockEnabled = "Giá trị bật/tắt không hợp lệ.";
  if (body.unlockMode !== "link" && body.unlockMode !== "rewarded") fields.unlockMode = "Chỉ chọn Nhấp liên kết hoặc Xem quảng cáo có thưởng.";
  let unlockLinkUrl: string | null = null;
  if (body.unlockLinkUrl !== null && body.unlockLinkUrl !== undefined && body.unlockLinkUrl !== "") {
    if (typeof body.unlockLinkUrl !== "string") fields.linkUrl = "URL không hợp lệ.";
    else {
      const check = checkUnlockLinkUrl(body.unlockLinkUrl.trim());
      if (check.ok) unlockLinkUrl = check.url.toString();
      else fields.linkUrl = check.reason;
    }
  }
  const slots = body.adSlots;
  if (!slots || typeof slots !== "object" || Array.isArray(slots) || Object.keys(slots).some((key) => !(AD_PLACEMENTS as readonly string[]).includes(key)) || Object.values(slots).some((value) => typeof value !== "boolean")) {
    fields.adSlots = "Danh sách vị trí quảng cáo không hợp lệ.";
  }
  if (Object.keys(fields).length) return { ok: false, status: 400, code: "invalid_input", error: "Vui lòng kiểm tra lại cấu hình.", fields };

  const value: AdminSettingsUpdate = {
    version: version as number,
    unlockEnabled: body.unlockEnabled as boolean,
    unlockMode: body.unlockMode as "link" | "rewarded",
    unlockLinkUrl,
    adSlots: normalizeAdSlots(slots) as AdSlotFlags,
  };
  if (value.unlockEnabled) {
    const readiness = modeReadiness(value.unlockMode, current, value.unlockLinkUrl);
    if (readiness.state !== "ready") {
      const reason = readiness.reason ?? "Phương thức này chưa sẵn sàng.";
      // Point at the unmet condition: `fields.linkUrl` (fixable in the form) or `fields.unlockMode` (server env: flag,
      // secret or provider). The client keeps its draft either way.
      const fields: Record<string, string> = readiness.cause === "link_url" ? { linkUrl: reason } : { unlockMode: reason };
      return { ok: false, status: 409, code: "mode_not_ready", error: reason, fields };
    }
  }
  return { ok: true, value };
}
