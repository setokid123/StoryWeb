import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const CLICK_UNLOCK_COOKIE = "storyweb_click_unlock";
export const CLICK_UNLOCK_SECONDS = 5 * 60;

export function getClickUnlockDestination(): URL | null {
  if (process.env.CLICK_UNLOCK_ENABLED !== "true" || !process.env.CLICK_UNLOCK_SECRET || process.env.CLICK_UNLOCK_SECRET.length < 32 || !process.env.CLICK_UNLOCK_URL) return null;
  try {
    const url = new URL(process.env.CLICK_UNLOCK_URL);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    // Chỉ example.com được dùng để thử luồng local trước khi có chấp thuận/link thật.
    if (url.hostname.toLowerCase() !== "example.com" && process.env.SHOPEE_GATE_APPROVED !== "true") return null;
    return url;
  } catch { return null; }
}

function signature(expires: string) {
  return createHmac("sha256", process.env.CLICK_UNLOCK_SECRET!).update(expires).digest("hex");
}

export function createClickUnlockSession() {
  const expires = String(Date.now() + CLICK_UNLOCK_SECONDS * 1000);
  return `${expires}.${signature(expires)}`;
}

export async function getClickUnlockExpiration(): Promise<number | null> {
  if (!getClickUnlockDestination()) return null;
  const value = (await cookies()).get(CLICK_UNLOCK_COOKIE)?.value;
  if (!value) return null;
  const [expires, providedSignature] = value.split(".");
  if (!expires || !providedSignature || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(providedSignature) || Number(expires) <= Date.now()) return null;
  const expected = Buffer.from(signature(expires), "hex");
  const actual = Buffer.from(providedSignature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? Number(expires) : null;
}

export const clickUnlockCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: CLICK_UNLOCK_SECONDS };
