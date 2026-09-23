import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "storyweb_admin";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PANEL_PASSWORD && process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32);
}

function sign(expires: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(expires).digest("hex");
}

export function verifyAdminPassword(candidate: string) {
  if (!adminConfigured()) return false;
  const expected = Buffer.from(process.env.ADMIN_PANEL_PASSWORD!, "utf8");
  const actual = Buffer.from(candidate, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createAdminSession() {
  const expires = String(Date.now() + SESSION_MS);
  return `${expires}.${sign(expires)}`;
}

export async function hasAdminSession() {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature) || Number(expires) <= Date.now()) return false;
  const expected = Buffer.from(sign(expires), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const adminCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MS / 1000 };
