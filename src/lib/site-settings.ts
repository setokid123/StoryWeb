import "server-only";

import { eq, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db/client";
import { siteSettings, siteSettingsAudit } from "@/db/schema";
import { type AdSlotFlags, DEFAULT_AD_SLOTS, normalizeAdSlots } from "@/lib/ad-placements";
import type { CmsActor } from "@/lib/cms-access";

const SETTINGS_ID = "default";

export type UnlockMethod = "link" | "rewarded";

export type SiteSettings = {
  unlockEnabled: boolean;
  unlockMode: UnlockMethod;
  /** Admin-configured destination; null falls back to CLICK_UNLOCK_URL. Not a secret. */
  unlockLinkUrl: string | null;
  unlockRevision: number;
  adSlots: AdSlotFlags;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  /** True when the row could not be read (DB down / migration missing): everything is treated as off. */
  unavailable: boolean;
};

const DEFAULT_SETTINGS: SiteSettings = {
  unlockEnabled: false,
  unlockMode: "link",
  unlockLinkUrl: null,
  unlockRevision: 1,
  adSlots: DEFAULT_AD_SLOTS,
  version: 0,
  updatedAt: null,
  updatedBy: null,
  unavailable: false,
};

type Row = typeof siteSettings.$inferSelect;

function fromRow(row: Row): SiteSettings {
  return {
    unlockEnabled: row.unlockEnabled,
    unlockMode: row.unlockMode,
    unlockLinkUrl: row.unlockLinkUrl,
    unlockRevision: row.unlockRevision,
    adSlots: normalizeAdSlots(row.adSlots),
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedByLabel,
    unavailable: false,
  };
}

/** Per-request cached read. Fails closed: any error yields "all off". */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.id, SETTINGS_ID)).limit(1);
    return row ? fromRow(row) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Site settings unavailable", error instanceof Error ? error.message : "unknown error");
    return { ...DEFAULT_SETTINGS, unavailable: true };
  }
});

export type SettingsUpdate = { unlockEnabled: boolean; unlockMode: UnlockMethod; unlockLinkUrl: string | null; adSlots: AdSlotFlags };

export class SettingsConflictError extends Error {}

function actorLabel(actor: CmsActor) {
  return actor.kind === "legacy-admin" ? "Quản trị (mật khẩu panel)" : actor.user.email;
}

function auditView(value: Pick<SiteSettings, "unlockEnabled" | "unlockMode" | "unlockLinkUrl" | "unlockRevision" | "adSlots">) {
  return { unlockEnabled: value.unlockEnabled, unlockMode: value.unlockMode, unlockLinkUrl: value.unlockLinkUrl, unlockRevision: value.unlockRevision, adSlots: value.adSlots };
}

/**
 * Saves settings with optimistic concurrency (`expectedVersion`). Any change to enabled/mode/link bumps
 * `unlockRevision`, which invalidates every unlock cookie and pending rewarded challenge minted before.
 * Readiness/permission checks are the caller's job.
 */
export async function saveSiteSettings(update: SettingsUpdate, actor: CmsActor, expectedVersion: number): Promise<SiteSettings> {
  return getDb().transaction(async (tx) => {
    const created = await tx.insert(siteSettings).values({ id: SETTINGS_ID }).onConflictDoNothing().returning({ id: siteSettings.id });
    const [current] = await tx.select().from(siteSettings).where(eq(siteSettings.id, SETTINGS_ID)).for("update");
    // Version 0 = the defaults a client saw before the row existed.
    if (current.version !== expectedVersion && !(created.length > 0 && expectedVersion === 0)) throw new SettingsConflictError("Cấu hình vừa được người khác thay đổi. Tải lại để xem bản mới nhất.");
    const before = fromRow(current);
    const unlockChanged = before.unlockEnabled !== update.unlockEnabled || before.unlockMode !== update.unlockMode || before.unlockLinkUrl !== update.unlockLinkUrl;
    const label = actorLabel(actor);
    const [row] = await tx.update(siteSettings).set({
      unlockEnabled: update.unlockEnabled,
      unlockMode: update.unlockMode,
      unlockLinkUrl: update.unlockLinkUrl,
      unlockRevision: unlockChanged ? sql`${siteSettings.unlockRevision} + 1` : current.unlockRevision,
      adSlots: update.adSlots,
      version: sql`${siteSettings.version} + 1`,
      updatedAt: new Date(),
      updatedByUserId: actor.userId,
      updatedByLabel: label,
    }).where(eq(siteSettings.id, SETTINGS_ID)).returning();
    const after = fromRow(row);
    await tx.insert(siteSettingsAudit).values({ actorUserId: actor.userId, actorLabel: label, before: auditView(before), after: auditView(after) });
    return after;
  });
}

export async function readSettingsAudit(limit = 20) {
  const rows = await getDb().select({ changedAt: siteSettingsAudit.changedAt, actor: siteSettingsAudit.actorLabel, before: siteSettingsAudit.before, after: siteSettingsAudit.after })
    .from(siteSettingsAudit).orderBy(sql`${siteSettingsAudit.changedAt} desc`).limit(limit);
  return rows.map((row) => ({ ...row, changedAt: row.changedAt.toISOString() }));
}
