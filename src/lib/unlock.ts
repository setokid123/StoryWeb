import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getRewardedProvider, type RewardedProvider } from "@/lib/rewarded-providers";
import { getSiteSettings, type SiteSettings, type UnlockMethod } from "@/lib/site-settings";

export const UNLOCK_COOKIE = "storyweb_unlock";
/** Pre-M2 cookie; no longer accepted, cleared when a new grant is issued. */
export const LEGACY_UNLOCK_COOKIE = "storyweb_click_unlock";
export const UNLOCK_SECONDS = 5 * 60;
export const READER_COOKIE = "storyweb_reader";

// ---------- readiness ----------

export type ModeReadiness = { state: "ready" | "unconfigured" | "unavailable" | "blocked"; reason: string | null };

function unlockSecret(): string | null {
  const secret = process.env.CLICK_UNLOCK_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function emergencyOff() {
  return process.env.UNLOCK_EMERGENCY_OFF === "true";
}

const SHOPEE_HOST = /(^|\.)(shopee\.[a-z.]+|shp\.ee|shope\.ee)$/i;
const TEST_HOST = /(^|\.)example\.com$/i;

export type LinkCheck = { ok: true; url: URL } | { ok: false; reason: string; blocked?: boolean };

/**
 * Validates an unlock destination. Only https, no credentials/fragments-as-payload, max 2048 chars.
 * `SHOPEE_GATE_APPROVED` is the server-side hard gate for any real affiliate destination (Shopee included);
 * example.com is allowed for local testing. No admin setting can bypass it.
 */
export function checkUnlockLinkUrl(raw: string | null | undefined): LinkCheck {
  if (!raw) return { ok: false, reason: "Chưa có URL liên kết mở khóa." };
  if (raw.length > 2048) return { ok: false, reason: "URL quá dài (tối đa 2048 ký tự)." };
  let url: URL;
  try { url = new URL(raw); } catch { return { ok: false, reason: "URL không hợp lệ." }; }
  if (url.protocol !== "https:") return { ok: false, reason: "URL phải dùng https." };
  if (url.username || url.password) return { ok: false, reason: "URL không được chứa thông tin đăng nhập." };
  const host = url.hostname.toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(":") || host === "localhost" || !host.includes(".")) return { ok: false, reason: "URL phải dùng tên miền công khai." };
  if (TEST_HOST.test(host)) return { ok: true, url };
  if (process.env.SHOPEE_GATE_APPROVED !== "true") {
    return SHOPEE_HOST.test(host)
      ? { ok: false, blocked: true, reason: "Liên kết Shopee cần chấp thuận riêng (SHOPEE_GATE_APPROVED=true trên server) trước khi dùng." }
      : { ok: false, blocked: true, reason: "Liên kết đối tác thật cần chấp thuận riêng (SHOPEE_GATE_APPROVED=true trên server) trước khi dùng." };
  }
  return { ok: true, url };
}

export function linkReadiness(settings: Pick<SiteSettings, "unlockLinkUrl">, candidateUrl?: string | null): ModeReadiness & { url?: URL } {
  if (process.env.CLICK_UNLOCK_ENABLED !== "true") return { state: "blocked", reason: "Máy chủ đang chặn chế độ liên kết (CLICK_UNLOCK_ENABLED khác true)." };
  if (!unlockSecret()) return { state: "unconfigured", reason: "Thiếu CLICK_UNLOCK_SECRET (ít nhất 32 ký tự) trên máy chủ." };
  const check = checkUnlockLinkUrl(candidateUrl !== undefined ? candidateUrl ?? process.env.CLICK_UNLOCK_URL : settings.unlockLinkUrl ?? process.env.CLICK_UNLOCK_URL);
  if (!check.ok) return { state: check.blocked ? "blocked" : "unconfigured", reason: check.reason };
  return { state: "ready", reason: null, url: check.url };
}

export function rewardedReadiness(): ModeReadiness & { provider: RewardedProvider } {
  const provider = getRewardedProvider();
  if (!unlockSecret()) return { state: "unconfigured", reason: "Thiếu CLICK_UNLOCK_SECRET (ít nhất 32 ký tự) trên máy chủ.", provider };
  return { ...provider.readiness, provider };
}

export function modeReadiness(mode: UnlockMethod, settings: SiteSettings, candidateUrl?: string | null): ModeReadiness {
  const readiness = mode === "link" ? linkReadiness(settings, candidateUrl) : rewardedReadiness();
  return { state: readiness.state, reason: readiness.reason };
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
export async function canReadChapter(number: number, freeChapters: number): Promise<boolean> {
  return number <= freeChapters || await getUnlockExpiration() !== null;
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
