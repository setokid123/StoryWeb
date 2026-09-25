import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getRewardedProvider, type RewardedProvider } from "@/lib/rewarded-providers";
import { getSiteSettings, type SiteSettings, type UnlockMethod } from "@/lib/site-settings";
import { normalizeUnlockLinkUrl, type UnlockLinkProblem } from "@/lib/unlock-link";

export const UNLOCK_COOKIE = "storyweb_unlock";
export const UNLOCK_SECONDS = 5 * 60;
export const READER_COOKIE = "storyweb_reader";

// ---------- readiness ----------

export type ModeReadiness = { state: "ready" | "unconfigured" | "unavailable" | "blocked"; reason: string | null };
/** Which condition is unmet, so the admin API can point at the right field (server env vs. URL). */
export type ReadinessCause = "server_flag" | "server_secret" | "link_url";

function unlockSecret(): string | null {
  const secret = process.env.CLICK_UNLOCK_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function emergencyOff() {
  return process.env.UNLOCK_EMERGENCY_OFF === "true";
}

export type LinkCheck = { ok: true; url: URL } | { ok: false; reason: string; problem: UnlockLinkProblem; blocked?: boolean };

/**
 * Validates an unlock destination on the server: any public https domain (see src/lib/unlock-link.ts, shared with
 * the settings UI). Direct Shopee links stay behind the hard server gate `SHOPEE_GATE_APPROVED`; no admin setting
 * can bypass it. The URL is never fetched, so redirects/shorteners are not verified.
 */
export function checkUnlockLinkUrl(raw: string | null | undefined): LinkCheck {
  const check = normalizeUnlockLinkUrl(raw, { shopeeApproved: process.env.SHOPEE_GATE_APPROVED === "true" });
  if (!check.ok) return { ok: false, reason: check.reason, problem: check.problem, blocked: check.problem === "shopee_unapproved" || undefined };
  return { ok: true, url: new URL(check.url) };
}

export function linkReadiness(settings: Pick<SiteSettings, "unlockLinkUrl">, candidateUrl?: string | null): ModeReadiness & { url?: URL; cause?: ReadinessCause } {
  if (process.env.CLICK_UNLOCK_ENABLED !== "true") return { state: "blocked", cause: "server_flag", reason: "Máy chủ đang chặn chế độ liên kết (CLICK_UNLOCK_ENABLED khác true)." };
  if (!unlockSecret()) return { state: "unconfigured", cause: "server_secret", reason: "Thiếu CLICK_UNLOCK_SECRET (ít nhất 32 ký tự) trên máy chủ." };
  const raw = candidateUrl !== undefined ? candidateUrl ?? process.env.CLICK_UNLOCK_URL : settings.unlockLinkUrl ?? process.env.CLICK_UNLOCK_URL;
  const check = checkUnlockLinkUrl(raw);
  if (!check.ok) {
    const reason = check.problem === "missing" ? "Chưa có URL liên kết: nhập URL hoặc đặt CLICK_UNLOCK_URL trên máy chủ." : check.reason;
    return { state: check.blocked ? "blocked" : "unconfigured", cause: "link_url", reason };
  }
  return { state: "ready", reason: null, url: check.url };
}

export function rewardedReadiness(): ModeReadiness & { provider: RewardedProvider } {
  const provider = getRewardedProvider();
  if (!unlockSecret()) return { state: "unconfigured", reason: "Thiếu CLICK_UNLOCK_SECRET (ít nhất 32 ký tự) trên máy chủ.", provider };
  return { ...provider.readiness, provider };
}

export function modeReadiness(mode: UnlockMethod, settings: SiteSettings, candidateUrl?: string | null): ModeReadiness & { cause?: ReadinessCause } {
  if (mode === "link") {
    const link = linkReadiness(settings, candidateUrl);
    return { state: link.state, reason: link.reason, cause: link.cause };
  }
  const rewarded = rewardedReadiness();
  return { state: rewarded.state, reason: rewarded.reason };
}

// ---------- resolved mode ----------

export type ResolvedUnlock =
  | { mode: "off"; revision: number; reason: string | null }
  | { mode: "link"; revision: number; destination: URL }
  | { mode: "rewarded"; revision: number; provider: RewardedProvider };

/** The single source of truth for which unlock method readers see. Fails closed. */
export const resolveUnlock = cache(async (): Promise<ResolvedUnlock> => {
  const settings = await getSiteSettings();
  const revision = settings.unlockRevision;
  if (emergencyOff()) return { mode: "off", revision, reason: "Mở khóa chương đang tạm dừng." };
  if (settings.unavailable || !settings.unlockEnabled) return { mode: "off", revision, reason: null };
  if (settings.unlockMode === "link") {
    const link = linkReadiness(settings);
    return link.state === "ready" && link.url ? { mode: "link", revision, destination: link.url } : { mode: "off", revision, reason: null };
  }
  const rewarded = rewardedReadiness();
  return rewarded.state === "ready" ? { mode: "rewarded", revision, provider: rewarded.provider } : { mode: "off", revision, reason: null };
});

// ---------- 5-minute grant cookie ----------
// Value: v2.<mode>.<revision>.<expiresMs>.<hmac>. Bound to mode + revision so changing/disabling the method
// invalidates old grants at once.

function sign(payload: string) {
  return createHmac("sha256", unlockSecret()!).update(`storyweb-unlock|${payload}`).digest("hex");
}

export function mintUnlockGrant(mode: UnlockMethod, revision: number): { value: string; expiresAt: number } {
  const expiresAt = Date.now() + UNLOCK_SECONDS * 1000;
  const payload = `v2.${mode}.${revision}.${expiresAt}`;
  return { value: `${payload}.${sign(payload)}`, expiresAt };
}

export const unlockCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: UNLOCK_SECONDS };

/** Expiry (ms) of a valid grant for the CURRENT mode/revision, else null. Checked on every protected read. */
export const getUnlockExpiration = cache(async (): Promise<number | null> => {
  const resolved = await resolveUnlock();
  if (resolved.mode === "off" || !unlockSecret()) return null;
  const value = (await cookies()).get(UNLOCK_COOKIE)?.value;
  const match = value?.match(/^v2\.(link|rewarded)\.(\d{1,9})\.(\d{13})\.([a-f0-9]{64})$/);
  if (!match) return null;
  const [, mode, revision, expires, signature] = match;
  if (mode !== resolved.mode || Number(revision) !== resolved.revision) return null;
  const expiresAt = Number(expires);
  if (expiresAt <= Date.now() || expiresAt > Date.now() + UNLOCK_SECONDS * 1000 + 5000) return null;
  const expected = Buffer.from(sign(`v2.${mode}.${revision}.${expires}`), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? expiresAt : null;
});

/** Whether chapter `number` of a story with `freeChapters` free chapters may be returned to this request. */
export function remainingUnlockMs(expiresAt: number | null): number {
  return expiresAt === null ? 0 : Math.max(0, expiresAt - Date.now());
}

export async function canReadChapter(number: number, freeChapters: number): Promise<boolean> {
  if (number <= freeChapters) return true;
  return remainingUnlockMs(await getUnlockExpiration()) > 0;
}

// ---------- anonymous reader binding (rewarded) ----------

export function newReaderId() {
  return randomBytes(32).toString("base64url");
}

export function readerHash(readerId: string) {
  return createHash("sha256").update(`reader|${readerId}`).digest("hex");
}

export async function currentReaderId(): Promise<string | null> {
  const value = (await cookies()).get(READER_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

export const readerCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 30 * 24 * 60 * 60 };
