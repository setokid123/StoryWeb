import "server-only";

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "invalid_input"
  | "payload_too_large"
  | "invalid_credentials"
  | "unauthenticated"
  | "forbidden"
  | "cross_origin"
  | "not_found"
  | "email_unavailable"
  | "rate_limited"
  | "not_configured"
  | "unavailable";

/** Structured error body shared by the auth/admin routes: `{ error, code, fields? }`. */
export function apiError(status: number, code: ApiErrorCode, error: string, init?: { fields?: Record<string, string>; retryAfterSeconds?: number }) {
  const body: Record<string, unknown> = { error, code };
  if (init?.fields) body.fields = init.fields;
  if (init?.retryAfterSeconds) body.retryAfterSeconds = init.retryAfterSeconds;
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (init?.retryAfterSeconds) headers["Retry-After"] = String(init.retryAfterSeconds);
  return NextResponse.json(body, { status, headers });
}

export function rateLimited(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return apiError(429, "rate_limited", `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau khoảng ${minutes} phút.`, { retryAfterSeconds });
}

export function unavailable(error: unknown) {
  console.error("Auth request failed", error instanceof Error ? error.message : "unknown error");
  return apiError(503, "unavailable", "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.");
}

/** Reads a small JSON object body; returns `undefined` for malformed/oversized bodies. */
export async function readJsonObject(request: Request, maxBytes = 8 * 1024): Promise<Record<string, unknown> | "too_large" | undefined> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return "too_large";
  const text = await request.text().catch(() => "");
  if (text.length > maxBytes) return "too_large";
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function hostOf(value: string | null | undefined) {
  if (!value) return undefined;
  try { return new URL(value).host.toLowerCase(); } catch { return undefined; }
}

/**
 * CSRF defence in depth for cookie-authenticated state changes (cookies are also SameSite=Lax).
 * Browsers send Origin on POST/PATCH/DELETE; it must match this site. Requests without Origin
 * and without `Sec-Fetch-Site: cross-site` (curl, server-to-server) carry no victim cookies and pass.
 */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const originHost = hostOf(origin);
  if (!originHost) return false;
  const allowed = new Set<string>();
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const host = request.headers.get("host")?.toLowerCase();
  if (forwarded) allowed.add(forwarded);
  if (host) allowed.add(host);
  const site = hostOf(process.env.NEXT_PUBLIC_SITE_URL);
  if (site) allowed.add(site);
  return allowed.has(originHost);
}

export function crossOrigin() {
  return apiError(403, "cross_origin", "Yêu cầu không hợp lệ từ nguồn khác.");
}

/**
 * Railway's edge proxy controls X-Forwarded-For; its first address is the connecting client.
 * Later addresses may be proxy hops. Used only as a rate-limit key; the per-email limit is separate.
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "unknown").slice(0, 64);
}
